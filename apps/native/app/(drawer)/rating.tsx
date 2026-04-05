import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useThemeColor } from "heroui-native";

import { client, orpc } from "@/utils/orpc";
import { authClient } from "@/lib/auth-client";

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const filledColor = useThemeColor("foreground");
  const emptyColor = useThemeColor("muted");

  return (
    <View className="flex-row items-center">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;
        return (
          <Pressable
            key={starValue}
            onPress={() => onChange(starValue)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
            hitSlop={8}
            className="px-1"
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={22}
              color={filled ? filledColor : emptyColor}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Rating() {
  const router = useRouter();
  const { matchId, resetAfter } = useLocalSearchParams();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const matchIdParam = useMemo(() => {
    if (Array.isArray(matchId)) return matchId[0];
    if (typeof matchId === "string") return matchId;
    return undefined;
  }, [matchId]);

  const matchIdForQueries = useMemo(() => {
    if (!matchIdParam) return 0;
    const parsed = Number(matchIdParam);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [matchIdParam]);

  const shouldResetAfter = useMemo(() => {
    const value = Array.isArray(resetAfter) ? resetAfter[0] : resetAfter;
    return value === "1" || value === "true";
  }, [resetAfter]);

  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: matchIdForQueries > 0,
  });

  const matchQuery = useQuery({
    queryKey: ["match.getById", matchIdForQueries],
    queryFn: async () => {
      if (matchIdForQueries <= 0) return null;
      return await (client as any).match.getById({ matchId: matchIdForQueries });
    },
    enabled: matchIdForQueries > 0,
  });

  const participants =
    participantsQuery.data?.filter(
      (p: any) => p.matchId === matchIdForQueries && p.status === "ACCEPTED",
    ) ?? [];

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [didSubmit, setDidSubmit] = useState(false);

  const handleSetRating = (userId: number | string, value: number) => {
    setRatings((prev) => ({ ...prev, [String(userId)]: value }));
  };

  const handleBackHome = () => {
    router.replace("/(drawer)");
  };

  const submitRatingsMutation = useMutation(orpc.rating.submitForMatch.mutationOptions());

  const resetMatchMutation = useMutation({
    mutationFn: async () => {
      if (matchIdForQueries <= 0) throw new Error("matchId is missing");
      return await (client as any).match.resetMatch({ matchId: matchIdForQueries });
    },
  });

  const allRated =
    participants.length > 0 &&
    participants.every((p: any) => {
      const score = ratings[String(p.userId)] ?? 0;
      return score >= 1 && score <= 5;
    });

  const handleValidate = async () => {
    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in to rate players.");
      return;
    }
    if (matchIdForQueries <= 0) return;
    if (!allRated) {
      Alert.alert("Incomplete", "Merci de noter tous les joueurs avant de valider.");
      return;
    }

    const payload = participants.map((p: any) => ({
      ratedUserId: String(p.userId),
      score: ratings[String(p.userId)] ?? 0,
    }));

    try {
      await submitRatingsMutation.mutateAsync({
        matchId: matchIdForQueries,
        ratings: payload,
      });

      if (shouldResetAfter) {
        await resetMatchMutation.mutateAsync();
      }

      setDidSubmit(true);
      Alert.alert("Succès", shouldResetAfter ? "Notes enregistrées. Session réinitialisée." : "Notes enregistrées.");
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer les notes.");
    }
  };

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-2">Rating</Text>
      <Text className="text-base mb-4">
        Note chaque joueur sur 5 étoiles.
      </Text>

      {matchIdForQueries <= 0 ? (
        <Text className="text-lg">Loading match…</Text>
      ) : matchQuery.isLoading ? (
        <Text className="text-lg">Loading match details…</Text>
      ) : matchQuery.isError ? (
        <Text className="text-lg">Unable to load match.</Text>
      ) : null}

      <ScrollView className="mb-6">
        {participants.map((p: any) => {
          const userId = p.userId;
          const name = p.user?.name ?? p.user?.email ?? String(userId);
          const current = ratings[String(userId)] ?? 0;

          return (
            <View
              key={p.id}
              className="flex-row items-center justify-between py-3 px-4 bg-gray-100 rounded-lg mb-2"
            >
              <Text className="font-semibold">{name}</Text>
              <StarRating value={current} onChange={(v) => handleSetRating(userId, v)} />
            </View>
          );
        })}

        {matchIdForQueries > 0 && participantsQuery.isLoading ? (
          <Text className="text-lg">Loading players…</Text>
        ) : null}

        {matchIdForQueries > 0 && participantsQuery.isError ? (
          <Text className="text-lg">Unable to load players.</Text>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={() => void handleValidate()}
        disabled={submitRatingsMutation.isPending || resetMatchMutation.isPending || didSubmit}
        className={`px-6 py-3 rounded-full mb-3 ${
          submitRatingsMutation.isPending || resetMatchMutation.isPending || didSubmit
            ? "bg-gray-500"
            : "bg-green-700"
        }`}
      >
        <Text className="text-white font-bold text-center">
          {didSubmit
            ? "Validé"
            : submitRatingsMutation.isPending || resetMatchMutation.isPending
              ? "Validation…"
              : "Valider"}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleBackHome}
        className="bg-blue-900 px-6 py-3 rounded-full"
      >
        <Text className="text-white font-bold text-center">Back Home</Text>
      </Pressable>
    </View>
  );
}
