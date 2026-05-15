import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";
import { useNotifications } from "@my-app/hooks";

export default function NotificationsTab() {
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const {
    friendRequestsQuery,
    acceptFriendRequestMutation,
    matchInvitesQuery,
    participantsQuery,
    matchesQuery,
    myFullMatches,
    matchesWithNewMessages,
  } = useNotifications(orpc, client, currentUserId);

  const friendRequests = (friendRequestsQuery.data as any[] | undefined) ?? [];
  const matchInvites = (matchInvitesQuery.data as any[] | undefined) ?? [];

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
            {matchesWithNewMessages.length === 0 &&
              myFullMatches.length === 0 &&
              friendRequests.length === 0 &&
              matchInvites.length === 0 ? (
              <Text className="text-muted">
                Aucune notification pour le moment.
              </Text>
            ) : (
              <View className="gap-3">

                {/* Invitations de match */}
                {matchInvites.map((invite: any) => (
                  <Pressable
                    key={invite.id}
                    onPress={() => {
                      router.push({
                        pathname: "/schedule/team",
                        params: { matchId: String(invite.matchId) },
                      });
                    }}
                    className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 active:opacity-80"
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                        <Text className="text-xl">⚽️</Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          Invitation à un match
                        </Text>
                        <Text className="text-sm text-gray-500 mt-1">
                          Vous avez été invité au Match #{invite.matchId} par {invite.inviter?.pseudo ?? invite.inviter?.name ?? (invite.invitedById ? `#${invite.invitedById}` : "?")}.
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}

                {/* Notification demandes d'amis */}
                {friendRequests.map((req: any) => (
                  <View
                    key={req.id}
                    className="bg-white rounded-2xl p-5 shadow-md border border-gray-200"
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                        <Text className="text-xl">👤</Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          Vous avez une nouvelle demande d’ami !
                        </Text>
                        <Text className="text-sm text-gray-500 mt-1">
                          De {req.sender.pseudo ?? req.sender.name}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => {
                        if (acceptFriendRequestMutation.isPending) return;
                        void acceptFriendRequestMutation.mutateAsync({
                          requestId: req.id,
                        });
                      }}
                      className="mt-4 bg-blue-600 py-3 rounded-full active:opacity-80"
                    >
                      <Text className="text-center text-white font-semibold">
                        Accepter
                      </Text>
                    </Pressable>
                  </View>
                ))}

                {/* Notification nouveaux messages */}
                {matchesWithNewMessages.map((item: any) => (
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

                      <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                        <Text className="text-xl">✉️</Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          Nouveau message
                        </Text>
                        <Text className="text-sm text-gray-500 mt-1">
                          Match #{item.matchId}
                        </Text>
                        <Text className="text-sm text-gray-700 mt-2">
                          {item.lastMessage.content}
                        </Text>
                      </View>

                    </View>
                  </Pressable>
                ))}

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