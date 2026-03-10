import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { client, orpc, queryClient } from "@/utils/orpc";
import * as SecureStore from "expo-secure-store";


export default function Payment() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams();

  const matchIdParam = useMemo(() => {
    if (Array.isArray(matchId)) return matchId[0];
    if (typeof matchId === "string") return matchId;
    return undefined;
  }, [matchId]);

  const matchIdFromParams = useMemo(() => {
    if (!matchIdParam) return null;
    const parsed = Number(matchIdParam);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [matchIdParam]);

  const [effectiveMatchId, setEffectiveMatchId] = useState<number | null>(matchIdFromParams);
  const ensurePaymentsTriggeredRef = useRef(false);

  const matchIdForQueries = effectiveMatchId ?? 0;

  const persist = useMemo(() => {
    const storageKey = "payment:lastMatchId";
    return {
      key: storageKey,
      async set(value: number) {
        if (Platform.OS === "web") {
          try {
            globalThis?.localStorage?.setItem(storageKey, String(value));
          } catch {
            // ignore
          }
          return;
        }
        try {
          await SecureStore.setItemAsync(storageKey, String(value));
        } catch {
          // ignore
        }
      },
      async get(): Promise<number | null> {
        if (Platform.OS === "web") {
          try {
            const stored = globalThis?.localStorage?.getItem(storageKey);
            const parsed = stored ? Number(stored) : NaN;
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
          } catch {
            return null;
          }
        }

        try {
          const stored = await SecureStore.getItemAsync(storageKey);
          const parsed = stored ? Number(stored) : NaN;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        } catch {
          return null;
        }
      },
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (matchIdFromParams !== null) {
        setEffectiveMatchId(matchIdFromParams);
        await persist.set(matchIdFromParams);
        return;
      }

      const storedMatchId = await persist.get();
      if (!cancelled && storedMatchId !== null) {
        setEffectiveMatchId(storedMatchId);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [matchIdFromParams, persist]);

  useEffect(() => {
    ensurePaymentsTriggeredRef.current = false;
  }, [effectiveMatchId]);

  // 1️⃣ Récupérer tous les participants
  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: matchIdForQueries > 0,
  });

  // 2️⃣ Récupérer le match et son terrain pour avoir le prix
  const matchQuery = useQuery({
    queryKey: ["match.getById", matchIdForQueries],
    queryFn: async () => {
      if (matchIdForQueries <= 0) return null;

      return await (client as any).match.getById({
        matchId: matchIdForQueries,
      });
    },
    enabled: matchIdForQueries > 0,
  });

  // 3️⃣ Filtrer les participants acceptés pour ce match
  const participants = participantsQuery.data?.filter(
    (p: any) => p.matchId === effectiveMatchId && p.status === "ACCEPTED"
  ) ?? [];

  const playerCount = participants.length;

  // 4️⃣ Récupérer le prix du terrain
  const fieldPrice = matchQuery.data?.schedule?.field?.price ?? null;

  // 5️⃣ Calcul du prix par joueur
  const pricePerPlayer =
    typeof fieldPrice === "number" && playerCount > 0 ? fieldPrice / playerCount : null;

  // 6️⃣ Récupérer l'IBAN du terrain
  const iban =
    matchQuery.data?.location?.iban ??
    matchQuery.data?.schedule?.field?.location?.iban ??
    "Unknown IBAN";

  // 7️⃣ Récupérer les paiements déjà effectués pour ce match
  const paymentsQuery = useQuery({
    ...orpc.payment.listByMatch.queryOptions({ input: { matchId: matchIdForQueries } }),
    enabled: matchIdForQueries > 0,
  });

  // 8️⃣ Les paiements liés à ce match
  const payments = paymentsQuery.data ?? [];

  // 9️⃣ Mutation pour marquer un paiement comme payé
  const payMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return await (client as any).payment.markAsPaid({
        paymentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.payment.listByMatch.queryKey({
          input: { matchId: matchIdForQueries },
        }),
      });
    },
  });

  const createPaymentsMutation = useMutation({
    mutationFn: async () => {
      if (matchIdForQueries <= 0) {
        throw new Error("matchId is missing");
      }
      return await (client as any).payment.createForMatch({
        matchId: matchIdForQueries,
      });
    },
    onSuccess: () => {
      if (matchIdForQueries <= 0) return;
      queryClient.invalidateQueries({
        queryKey: orpc.payment.listByMatch.queryKey({
          input: { matchId: matchIdForQueries },
        }),
      });
    },
  });

  useEffect(() => {
    if (matchIdForQueries <= 0) return;
    if (!paymentsQuery.isSuccess) return;
    if (paymentsQuery.data && paymentsQuery.data.length > 0) return;
    if (createPaymentsMutation.isPending) return;
    if (ensurePaymentsTriggeredRef.current) return;

    ensurePaymentsTriggeredRef.current = true;
    createPaymentsMutation.mutate();
  }, [
    matchIdForQueries,
    paymentsQuery.isSuccess,
    paymentsQuery.data,
    createPaymentsMutation.isPending,
    createPaymentsMutation,
  ]);

  // Fonction pour gérer le paiement (pour l'instant, elle ne fait que marquer comme payé)
  const handlePay = (paymentId: number) => {
    payMutation.mutate(paymentId);
  };

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">
        Payment for Match {effectiveMatchId ?? matchIdParam ?? "-"}
      </Text>

      {matchIdForQueries <= 0 ? (
        <Text className="text-lg mb-4">Loading match…</Text>
      ) : matchQuery.isLoading ? (
        <Text className="text-lg mb-4">Loading match details…</Text>
      ) : matchQuery.isError ? (
        <Text className="text-lg mb-4">Unable to load match.</Text>
      ) : (
        <>
          <Text className="text-lg mb-2">Field price: {fieldPrice ?? "-"}€</Text>
          <Text className="text-lg mb-4">
            Players: {playerCount} (
            {pricePerPlayer === null ? "-" : `${pricePerPlayer.toFixed(2)}€`} each)
          </Text>
        </>
      )}

      {payments.map((p) => (
        <View
          key={p.id}
          className="flex-row justify-between items-center py-2"
        >
          <Text>{p.user.name}</Text>

          <Text>{p.amount}€</Text>

          {p.status === "PAID" ? (
            <Text className="text-green-600 font-bold">PAID ✅</Text>
          ) : (
            <Pressable
              onPress={() => handlePay(p.id)}
              className="bg-green-600 px-3 py-1 rounded"
            >
              <Text className="text-white">Pay</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Text className="text-lg mb-2">
        A payer sur le compte suivant: {iban}
      </Text>

      <ScrollView className="mb-6">
        {participants.map((p: any) => (
          <View
            key={p.id}
            className="flex-row justify-between py-2 px-4 bg-gray-100 rounded-lg mb-2"
          >
            <Text>{p.user?.name ?? p.userId}</Text>
            <Text>{pricePerPlayer === null ? "-" : `${pricePerPlayer.toFixed(2)}€`}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/my_matches")}
        className="bg-blue-900 px-6 py-3 rounded-full"
      >
        <Text className="text-white font-bold text-center">
          Go Back to My Matches
        </Text>
      </Pressable>
    </View>
  );
}