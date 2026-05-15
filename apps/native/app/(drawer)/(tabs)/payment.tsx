import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { client, orpc, queryClient } from "@/utils/orpc";
import { usePayment } from "@my-app/hooks";
import * as SecureStore from "expo-secure-store";

export default function Payment() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams();

  const storageKey = "payment:lastMatchId";

  const persist = useMemo(() => ({
    key: storageKey,
    async set(value: number) {
      if (Platform.OS === "web") {
        try { globalThis?.localStorage?.setItem(storageKey, String(value)); } catch { }
        return;
      }
      try { await SecureStore.setItemAsync(storageKey, String(value)); } catch { }
    },
    async get(): Promise<number | null> {
      if (Platform.OS === "web") {
        try {
          const stored = globalThis?.localStorage?.getItem(storageKey);
          const parsed = stored ? Number(stored) : NaN;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        } catch { return null; }
      }
      try {
        const stored = await SecureStore.getItemAsync(storageKey);
        const parsed = stored ? Number(stored) : NaN;
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      } catch { return null; }
    },
  }), []);

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

  const [resolvedMatchId, setResolvedMatchId] = useState<string | number | undefined>(
    matchIdFromParams ?? undefined
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (matchIdFromParams !== null) {
        setResolvedMatchId(matchIdFromParams);
        await persist.set(matchIdFromParams);
        return;
      }
      const stored = await persist.get();
      if (!cancelled && stored !== null) setResolvedMatchId(stored);
    };
    run();
    return () => { cancelled = true; };
  }, [matchIdFromParams, persist]);

  const {
    effectiveMatchId,
    matchIdForQueries,
    currentUserId,
    participants,
    payments,
    pricePerPlayer,
    iban,
    allPaid,
    isAdmin,
    handlePay,
    matchQuery,
  } = usePayment(orpc, client, queryClient, resolvedMatchId);

  const ensurePaymentsTriggeredRef = useRef(false);

  const createPaymentsMutation = useMutation({
    mutationFn: async () => {
      if (matchIdForQueries <= 0) throw new Error("matchId is missing");
      return await client.payment.createForMatch({ matchId: matchIdForQueries });
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
    ensurePaymentsTriggeredRef.current = false;
  }, [effectiveMatchId]);

  useEffect(() => {
    if (matchIdForQueries <= 0) return;
    if (payments.length > 0) return;
    if (createPaymentsMutation.isPending) return;
    if (ensurePaymentsTriggeredRef.current) return;
    ensurePaymentsTriggeredRef.current = true;
    createPaymentsMutation.mutate();
  }, [matchIdForQueries, payments, createPaymentsMutation]);

  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<typeof payments[number] | null>(null);

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
      ) : null}

      <ScrollView className="mb-6">
        {participants.map((p) => {
          const payment = payments.find((pay) => pay.userId === p.userId);

          return (
            <View
              key={p.id}
              className="flex-row justify-between py-2 px-4 bg-gray-100 rounded-lg mb-2"
            >
              <Text>{p.user?.name ?? p.userId}</Text>

              {payment?.status === "PAID" ? (
                <Text className="text-green-600 font-bold">PAID ✅</Text>
              ) : isAdmin ? (
                <Pressable
                  onPress={() => setSelectedPayment(payment ?? null)}
                  className="bg-blue-600 px-3 py-1 rounded"
                >
                  <Text className="text-white font-bold">Valider</Text>
                </Pressable>
              ) : payment?.userId === currentUserId ? (
                <Pressable
                  onPress={() => setShowWaitingModal(true)}
                  className="bg-gray-400 px-3 py-1 rounded"
                >
                  <Text className="text-white font-bold">
                    Pay {pricePerPlayer ? pricePerPlayer.toFixed(2) : "-"}€
                  </Text>
                </Pressable>
              ) : (
                <Text>{pricePerPlayer ? pricePerPlayer.toFixed(2) : "-"}€</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {allPaid && (
        <Pressable
          onPress={() => router.push(`/(drawer)/rating?matchId=${matchIdForQueries}&resetAfter=1`)}
          className="bg-purple-700 px-6 py-3 rounded mb-4"
        >
          <Text className="text-white font-bold text-center">Fin de session</Text>
        </Pressable>
      )}

      {showWaitingModal && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center">
          <View className="bg-white p-6 rounded-2xl w-80">
            <Text className="text-center text-lg font-bold">
              En attente de la confirmation de{" "}
              {participants.find((p) => p.role === "ADMIN")?.user?.name ?? "l'organisateur"}
            </Text>
            <Pressable
              onPress={() => setShowWaitingModal(false)}
              className="mt-4 bg-gray-300 py-2 rounded-full"
            >
              <Text className="text-center">OK</Text>
            </Pressable>
          </View>
        </View>
      )}

      {selectedPayment && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center">
          <View className="bg-white p-6 rounded-2xl w-80">
            <Text className="text-center text-lg font-bold">
              Confirmer le paiement de{" "}
              {participants.find((p) => p.userId === selectedPayment.userId)?.user?.name}?
            </Text>
            <View className="flex-row justify-between mt-4">
              <Pressable
                onPress={() => {
                  handlePay(selectedPayment.id, () => setSelectedPayment(null));
                }}
                className="bg-green-600 px-4 py-2 rounded"
              >
                <Text className="text-white">Oui</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedPayment(null)}
                className="bg-red-600 px-4 py-2 rounded"
              >
                <Text className="text-white">Non</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Text className="text-lg mb-2">A payer sur le compte suivant: {iban}</Text>

      <Pressable
        onPress={() => router.push("/my_matches")}
        className="bg-blue-900 px-6 py-3 rounded-full"
      >
        <Text className="text-white font-bold text-center">Go Back to My Matches</Text>
      </Pressable>
    </View>
  );
}