import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

export default function NotificationsTab() {
  const { data: session, isPending } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const participantsQuery = useQuery(orpc.match_participant.list.queryOptions());

  const matchesQuery = useQuery({
    queryKey: ["matches.list"],
    queryFn: async () => (client as any).matches.list(),
    enabled: !!currentUserId,
  });

  const participants = participantsQuery.data ?? [];
  const matches = (matchesQuery.data as any[] | undefined) ?? [];

  const acceptedCountByMatchId = new Map<number, number>();
  const isUserInMatch = new Set<number>();

  for (const participant of participants) {
    if (participant.status !== "ACCEPTED") continue;

    acceptedCountByMatchId.set(
      participant.matchId,
      (acceptedCountByMatchId.get(participant.matchId) ?? 0) + 1,
    );

    if (currentUserId && participant.userId === currentUserId) {
      isUserInMatch.add(participant.matchId);
    }
  }

  const fullMatchIds = Array.from(acceptedCountByMatchId.entries())
    .filter(([, count]) => count >= 10)
    .map(([matchId]) => matchId);

  const myFullMatches = fullMatchIds
    .filter((matchId) => isUserInMatch.has(matchId))
    .map((matchId) => {
      const match = matches.find((m) => m.id === matchId);
      return {
        matchId,
        scheduleId: match?.scheduleId ?? null,
      };
    });

  return (
    <Container className="p-6">
      <View className="gap-4">
        <Text className="text-2xl font-bold text-foreground">Notifications</Text>

        {isPending ? (
          <Text className="text-muted">Loading session...</Text>
        ) : !currentUserId ? (
          <Text className="text-muted">Connecte-toi pour voir tes notifications.</Text>
        ) : participantsQuery.isLoading || matchesQuery.isLoading ? (
          <Text className="text-muted">Loading...</Text>
        ) : myFullMatches.length === 0 ? (
          <Text className="text-muted">Aucune notification pour le moment.</Text>
        ) : (
          <View className="gap-3">
            {myFullMatches.map((item) => (
              <View
                key={item.matchId}
                className="bg-secondary rounded-lg p-4 border border-border"
              >
                <Text className="text-foreground font-semibold">
                  Match complet (10/10)
                </Text>
                <Text className="text-muted mt-1">
                  Match #{item.matchId}
                  {item.scheduleId ? ` (schedule #${item.scheduleId})` : ""}
                </Text>
                <Text className="text-foreground mt-3">
                  Le match peut être organisé.
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Container>
  );
}
