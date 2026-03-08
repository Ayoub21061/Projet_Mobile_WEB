import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { client, orpc, queryClient } from "@/utils/orpc";

export default function Payment() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams();

  // 1️⃣ Récupérer tous les participants
  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: !!matchId,
  });

  // 2️⃣ Récupérer le match et son terrain pour avoir le prix
  const matchQuery = useQuery({
  queryKey: ["match.getById", matchId],
  queryFn: async () => {
    if (!matchId) return null;

    return await (client as any).match.getById({
      matchId: Number(matchId),
        });
    },
        enabled: !!matchId,
    });

  // 3️⃣ Filtrer les participants acceptés pour ce match
  const participants = participantsQuery.data?.filter(
    (p: any) => p.matchId === Number(matchId) && p.status === "ACCEPTED"
  ) ?? [];

  const playerCount = participants.length;

  // 4️⃣ Récupérer le prix du terrain
  const fieldPrice = matchQuery.data?.schedule?.field?.price ?? 0;

  // 5️⃣ Calcul du prix par joueur
  const pricePerPlayer = playerCount > 0 ? fieldPrice / playerCount : 0;

  // 6️⃣ Récupérer l'IBAN du terrain
  const iban = matchQuery.data?.location?.iban ?? "Unknown IBAN";

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">
        Payment for Match {matchId}
      </Text>

      <Text className="text-lg mb-2">Field price: {fieldPrice}€</Text>
      <Text className="text-lg mb-4">
        Players: {playerCount} ({pricePerPlayer.toFixed(2)}€ each)
      </Text>

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
            <Text>{pricePerPlayer.toFixed(2)}€</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => alert("Payment functionality coming soon!")}
        className="bg-green-600 px-6 py-3 rounded-full mb-4"
      >
        <Text className="text-white font-bold text-center">Pay</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(drawer)/my_matches")}
        className="bg-blue-900 px-6 py-3 rounded-full"
      >
        <Text className="text-white font-bold text-center">
          Go Back to My Matches
        </Text>
      </Pressable>
    </View>
  );
}