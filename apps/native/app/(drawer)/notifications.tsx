import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

export default function NotificationsTab() {
  const router = useRouter();

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

  // Récupérer les messages liés à ces matchs complets
  const messagesQuery = useQuery({
    queryKey: ["messages.byMatches", myFullMatches],
    queryFn: async () => {
      const results = await Promise.all(
        myFullMatches.map((m) =>
          orpc.message.listByMatch.call({ matchId: m.matchId })
        )
      );
      return results;
    },
    enabled: myFullMatches.length > 0,
    refetchInterval: 5000, // refresh toutes les 5 sec
  });

  // Vérifier s'il y a de nouveaux messages non lus (c'est à dire des messages dont le senderId est différent de currentUserId)
  const hasNewMessages = messagesQuery.data?.some((messages) => {
    if (!messages || messages.length === 0) return false;

    const lastMessage = messages[messages.length - 1];

    return lastMessage.senderId !== currentUserId;
  });

  return (
    <Container className="p-6">
      <View className="gap-4">
        <Text className="text-2xl font-bold text-foreground">
          Notifications
        </Text>

        {isPending ? (
          <Text className="text-muted">Loading session...</Text>
        ) : !currentUserId ? (
          <Text className="text-muted">
            Connecte-toi pour voir tes notifications.
          </Text>
        ) : participantsQuery.isLoading || matchesQuery.isLoading ? (
          <Text className="text-muted">Loading...</Text>
        ) : (
          <>
            {!hasNewMessages && myFullMatches.length === 0 ? (
              <Text className="text-muted">
                Aucune notification pour le moment.
              </Text>
            ) : (
              <View className="gap-3">

                {/* Notification nouveaux messages */}
                {hasNewMessages && (
                  <Pressable
                    onPress={() => {
                      const firstMatch = myFullMatches[0];
                      if (!firstMatch) return;

                      router.push({
                        pathname: "/schedule/team",
                        params: { matchId: String(firstMatch.matchId) },
                      });
                    }}
                    className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 active:opacity-80"
                  >
                    <View className="flex-row items-center gap-4">

                      {/* Icône */}
                      <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                        <Text className="text-xl">✉️</Text>
                      </View>

                      {/* Texte */}
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          Nouveaux messages
                        </Text>
                        <Text className="text-sm text-gray-500 mt-1">
                          Vous avez reçu de nouveaux messages dans votre match.
                        </Text>
                      </View>

                    </View>
                  </Pressable>
                )}

                {/* Notifications match complet */}
                {myFullMatches.map((item) => (
                  <Pressable
                    key={item.matchId}
                    onPress={() => {
                      router.push({
                        pathname: "/schedule/team",
                        params: { matchId: String(item.matchId) },
                      });
                    }}
                    className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 active:opacity-80"
                  >
                    <View className="flex-row items-center gap-4">

                      {/* Icône */}
                      <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center">
                        <Text className="text-xl">⚽️</Text>
                      </View>

                      {/* Texte */}
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          Match complet
                        </Text>
                        <Text className="text-sm text-gray-500 mt-1">
                          Match #{item.matchId}
                          {item.scheduleId
                            ? ` (schedule #${item.scheduleId})`
                            : ""}
                        </Text>
                        <Text className="text-sm text-gray-700 mt-2">
                          Les 10 joueurs sont prêts. Le match peut être organisé.
                        </Text>
                      </View>

                    </View>
                  </Pressable>
                ))}

              </View>
            )}
          </>
        )}
      </View>
    </Container>
  );
}