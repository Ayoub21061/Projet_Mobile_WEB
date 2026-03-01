import { useLocalSearchParams } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, Image } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { client, orpc, queryClient } from "utils/orpc";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export default function ScheduleDetails() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const { id, matchId: matchIdParam } = useLocalSearchParams();
  const scheduleId = typeof id === "string" ? Number(id) : Number.NaN;
  const isScheduleIdValid = Number.isFinite(scheduleId);

  const matchIdFromParams =
    typeof matchIdParam === "string" ? Number(matchIdParam) : Number.NaN;
  const hasMatchIdParam = Number.isFinite(matchIdFromParams);

  const ensureMatchQuery = useQuery({
    queryKey: ["matches.ensureForSchedule", scheduleId],
    queryFn: async () => (client as any).matches.ensureForSchedule({ scheduleId }),
    enabled: isScheduleIdValid && !hasMatchIdParam,
  });

  const matchId = hasMatchIdParam ? matchIdFromParams : ensureMatchQuery.data?.id;
  const isMatchReady = typeof matchId === "number" && Number.isFinite(matchId);

  // On va récupérer les participants du match
  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: isMatchReady,
  });

  const participantsRaw = participantsQuery.data ?? [];
  const participants = participantsRaw.filter(
    (p) => p.matchId === matchId && p.status === "ACCEPTED"
  );

  const PurpleTeam = participants.filter((p) => p.team === "PURPLE");
  const YellowTeam = participants.filter((p) => p.team === "YELLOW");
  // Condition pour pouvoir démarrer le match : 
  // Le match est prêt à démarrer si il y a exactement 10 participants et que tous ont confirmé leur participation
  const canStartMatch =
    isMatchReady && participants.length === 10 && participants.every((p) => p.confirmed);

  const ConfirmMatch = async () => {
    if (!isMatchReady || !currentUserId || !matchId) return;

    await confirmMutation.mutateAsync({ matchId });

    await participantsQuery.refetch();
  };

  const joinMutation = useMutation(
    orpc.match_participant.join.mutationOptions({
      onError: (error) => {
        console.log("JOIN ERROR:", error);
        Alert.alert("Error", "Unable to join the team.");
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  // On crée une mutation qui permet à l'utilisateur de la session actuelle de confirmer sa participation au match
  const confirmMutation = useMutation(
    orpc.match_participant.confirm.mutationOptions({
      onError: (error) => {
        console.log("CONFIRM ERROR:", error);
        Alert.alert("Error", "Unable to confirm.");
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  // On crée une mutation qui permet à l'utilisateur de pouvoir quitter le match s'il a déjà rejoint une équipe
  const leaveMutation = useMutation(
    orpc.match_participant.leave.mutationOptions({
      onError: (error) => {
        console.log("LEAVE ERROR:", error);
        Alert.alert("Error", "Unable to leave the match.");
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  // Mutation pour pouvoir supprimer un message
  const deleteMessageMutation = useMutation(
    orpc.message.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  // Mutation pour mettre à jour un message (par exemple pour le marquer comme lu)
  const updateMessageMutation = useMutation(
    orpc.message.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  // Permet d'ajouter un état d'édition pour chaque message, afin de pouvoir les modifier ou les supprimer
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);

  // Permet de modifier le contenu du message
  const handleEditMessage = (msg: any) => {
    setNewMessage(msg.content);

    // On stocke l'id du message en cours d'édition
    setEditingMessageId(msg.id);
  };

  const [openMessageMenuId, setOpenMessageMenuId] = useState<number | null>(null);

  const openMessageMenu = (msg: any) => {
    if (msg.senderId !== currentUserId) return;
    setOpenMessageMenuId((prev) => (prev === msg.id ? null : msg.id));
  };

  const editMessageFromMenu = (msg: any) => {
    handleEditMessage(msg);
    setOpenMessageMenuId(null);
  };

  const deleteMessageFromMenu = async (msg: any) => {
    setOpenMessageMenuId(null);
    await deleteMessageMutation.mutateAsync({ id: msg.id });
  };

  const joinTeam = async (team: "PURPLE" | "YELLOW") => {
    if (!isMatchReady || matchId == null) return;
    if (participants.length >= 10) return; // Limite de 10 participants

    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in to join.");
      return;
    }

    await joinMutation.mutateAsync({ matchId, team });

    await participantsQuery.refetch(); // Rafraîchir les participants pour avoir les infos à jour
  };

  // On crée une fonction qui permet à l'utilisateur de la session actuelle de quitter le match
  const myParticipant = participants.find(
    (p) => !!currentUserId && p.userId === currentUserId
  );

  // Si l'utilisateur est déjà dans une équipe, on lui affiche un bouton pour quitter le match
  const leaveTeam = async () => {
    if (!isMatchReady || matchId == null) return;

    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in to leave.");
      return;
    }

    await leaveMutation.mutateAsync({ matchId });

    await participantsQuery.refetch();
  };

  // On crée une requête pour récupérer les messages du match, mais seulement si le match est prêt (matchId est défini)
  const messagesQuery = useQuery({
    ...orpc.message.listByMatch.queryOptions({ input: { matchId } }),
    enabled: isMatchReady,
  });

  const [newMessage, setNewMessage] = useState("");

  const sendMessageMutation = useMutation(
    orpc.message.create.mutationOptions({
      onSuccess: async () => {
        setNewMessage("");
        await queryClient.invalidateQueries();
      },
    })
  );

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !matchId) return;

    if (editingMessageId != null) {
      await updateMessageMutation.mutateAsync({
        id: editingMessageId,
        content,
      });
      setEditingMessageId(null);
    } else {
      await sendMessageMutation.mutateAsync({
        matchId,
        content,
      });
    }

    setNewMessage("");
  };

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const userProfileQuery = useQuery({
    ...orpc.user.getProfile.queryOptions({
      input: { userId: selectedUserId! },
    }),
    enabled: !!selectedUserId,
  });

  return (
    <View className="flex-1 flex-row">

      <View className="flex-2 relative">

        {/* Fond divisé en 2 */}
        <View className="flex-1 flex-row">

          {/* Gauche - Mauve */}
          <View className="flex-1 bg-purple-600 justify-center items-center">
            <Text className="text-white text-2xl font-bold">
              Team Purple
            </Text>

            {!hasMatchIdParam && !isScheduleIdValid ? (
              <Text className="text-white mt-2">Invalid schedule</Text>
            ) : !hasMatchIdParam && ensureMatchQuery.isLoading ? (
              <Text className="text-white mt-2">Loading...</Text>
            ) : !hasMatchIdParam && ensureMatchQuery.isError ? (
              <Text className="text-white mt-2">Unable to load match</Text>
            ) : null}

            {PurpleTeam.map((p) => {
              const userId = (p.user?.id ?? p.userId) as string | undefined;

              return (
                <GestureDetector
                  key={p.id}
                  gesture={Gesture.Tap()
                    .minPointers(2)
                    .numberOfTaps(1)
                    .runOnJS(true)
                    .onEnd((_e, success) => {
                      if (success && userId) {
                        setSelectedUserId(userId);
                      }
                    })}
                >
                  <Pressable
                    onPress={() => { }}
                    className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-purple-800"
                      }`}
                    {...(Platform.OS === "web"
                      ? ({
                        onContextMenu: (e: any) => {
                          e?.preventDefault?.();
                          if (userId) setSelectedUserId(userId);
                        },
                      } as any)
                      : null)}
                  >
                    <Text className="text-white font-semibold">{p.user?.name ?? p.userId}</Text>
                  </Pressable>
                </GestureDetector>
              );
            })}

            {PurpleTeam.length < 5 && (
              <Pressable
                onPress={() => joinTeam("PURPLE")}
                className="w-16 h-16 bg-white rounded-lg m-2 justify-center items-center"
              >
                <Text className="text-3xl">+</Text>
              </Pressable>
            )}
          </View>

          {/* Droite - Jaune */}
          <View className="flex-1 bg-yellow-400 justify-center items-center">
            <Text className="text-black text-2xl font-bold">
              Team Yellow
            </Text>

            {YellowTeam.map((p) => {
              const userId = (p.user?.id ?? p.userId) as string | undefined;

              return (
                <GestureDetector
                  key={p.id}
                  gesture={Gesture.Tap()
                    .minPointers(2)
                    .numberOfTaps(1)
                    .runOnJS(true)
                    .onEnd((_e, success) => {
                      if (success && userId) {
                        setSelectedUserId(userId);
                      }
                    })}
                >
                  <Pressable
                    onPress={() => { }}
                    className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-yellow-500"}`}
                    {...(Platform.OS === "web"
                      ? ({
                        onContextMenu: (e: any) => {
                          e?.preventDefault?.();
                          if (userId) setSelectedUserId(userId);
                        },
                      } as any)
                      : null)}
                  >
                    <Text className="text-black font-semibold">{p.user?.name ?? p.userId}</Text>
                  </Pressable>
                </GestureDetector>
              );
            })}

            {YellowTeam.length < 5 && (
              <Pressable
                onPress={() => joinTeam("YELLOW")}
                className="w-16 h-16 bg-white rounded-lg m-2 justify-center items-center"
              >
                <Text className="text-3xl bg-white">+</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Rond noir centré */}
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 items-center"
          style={{ top: "40%" }}
        >
          <View className="justify-center items-center bg-black rounded-full" style={{ width: 160, height: 160 }}>
            <Text className="text-white text-lg font-bold text-center px-4">
              {participants.length} / 10
            </Text>
          </View>
        </View>

        {myParticipant && (
          <View className="absolute left-0 right-0 bottom-16 items-center">
            <Pressable onPress={leaveTeam} className="bg-red-600 px-6 py-3 rounded-full">
              <Text className="text-white font-bold">Leave Match</Text>
            </Pressable>
          </View>
        )}

        {/* Si l'utilisateur a rejoint une équipe mais n'a pas encore confirmé sa participation, on lui affiche un bouton pour confirmer puis le bouton disparaît*/}
        {myParticipant && !myParticipant.confirmed && (
          <Pressable
            onPress={ConfirmMatch}
            className="absolute bottom-16 right-4 bg-green-600 px-16 py-3 rounded-full"
          >
            <Text className="text-white font-bold">
              Confirm
            </Text>
          </Pressable>
        )}

        {canStartMatch && (
          <View className="absolute left-0 right-0 bottom-4 items-center">
            <Pressable
              onPress={() => { }}
              className="absolute bottom-24 right-4 bg-blue-900 px-13 py-3 rounded-full"
            >
              <Text className="text-white font-bold">Start Match</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Droite - Chat */}
      <View className="flex-1 bg-gray-100 border-l border-gray-300">
        <View className="flex-1 p-3">

          {/* Liste messages */}
          <ScrollView className="flex-1">
            {messagesQuery.data?.map((msg) => (
              <View key={msg.id} className="mb-2">
                <GestureDetector
                  gesture={Gesture.Tap()
                    .minPointers(2)
                    .numberOfTaps(1)
                    .runOnJS(true)
                    .onEnd((_e, success) => {
                      if (success && msg.sender?.id) {
                        setSelectedUserId(msg.sender.id);
                      }
                    })}
                >
                  <Pressable
                    onPress={() => { }}
                    {...(Platform.OS === "web"
                      ? ({
                        onContextMenu: (e: any) => {
                          e?.preventDefault?.();
                          if (msg.sender?.id) setSelectedUserId(msg.sender.id);
                        },
                      } as any)
                      : null)}
                  >
                    <Text className="text-xs text-blue-600">{msg.sender?.name}</Text>
                  </Pressable>
                </GestureDetector>

                <GestureDetector
                  gesture={Gesture.Tap()
                    .minPointers(2)
                    .numberOfTaps(1)
                    .runOnJS(true)
                    .onEnd((_e, success) => {
                      if (success) openMessageMenu(msg);
                    })}
                >
                  <Pressable
                    onPress={() => { }}
                    {...(Platform.OS === "web"
                      ? ({
                        onContextMenu: (e: any) => {
                          e?.preventDefault?.();
                          openMessageMenu(msg);
                        },
                      } as any)
                      : null)}
                  >
                    <View className="bg-white p-2 rounded-lg shadow">
                      <Text>{msg.content}</Text>
                    </View>
                  </Pressable>
                </GestureDetector>

                  {openMessageMenuId === msg.id && msg.senderId === currentUserId && (
                    <View className="mt-2 self-start bg-white rounded-lg shadow overflow-hidden">
                      <Pressable
                        onPress={() => editMessageFromMenu(msg)}
                        className="px-3 py-2"
                      >
                        <Text>Modifier</Text>
                      </Pressable>
                      <View className="h-px bg-gray-200" />
                      <Pressable
                        onPress={() => void deleteMessageFromMenu(msg)}
                        className="px-3 py-2"
                      >
                        <Text>Supprimer</Text>
                      </Pressable>
                    </View>
                  )}
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View className="flex-row items-center border-t pt-2">
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              className="flex-1 bg-white rounded-full px-4 py-2 mr-2"
            />

            <Pressable
              onPress={sendMessage}
              className="bg-blue-600 p-3 rounded-full"
            >
              <Text className="text-white">➤</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {selectedUserId && (
        <View className="absolute inset-0 bg-black/40 justify-center items-center">
          <View className="w-80 bg-white rounded-2xl p-6 shadow-xl">

            {userProfileQuery.isLoading ? (
              <Text>Loading...</Text>
            ) : (
              <>
                {/* Photo */}
                <View className="items-center mb-4">
                  <View className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden">
                    {userProfileQuery.data?.photoUrl && (
                      <Image
                        source={{ uri: userProfileQuery.data.photoUrl }}
                        className="w-full h-full"
                      />
                    )}
                  </View>
                </View>

                {/* Nom */}
                <Text className="text-xl font-bold text-center">
                  {userProfileQuery.data?.pseudo ??
                    userProfileQuery.data?.name}
                </Text>

                {/* Matches */}
                <Text className="text-center mt-2">
                  🏆 Matches played:{" "}
                  {userProfileQuery.data?.matchesPlayed}
                </Text>

                {/* Badge */}
                <View className="mt-4 items-center">
                  {userProfileQuery.data?.badges?.length ? (
                    <Text>
                      🎖 {userProfileQuery.data.badges[0].badge.name}
                    </Text>
                  ) : (
                    <Text>No badge yet</Text>
                  )}
                </View>
              </>
            )}

            {/* Close */}
            <Pressable
              onPress={() => setSelectedUserId(null)}
              className="mt-6 bg-gray-200 py-2 rounded-full"
            >
              <Text className="text-center font-semibold">Close</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
