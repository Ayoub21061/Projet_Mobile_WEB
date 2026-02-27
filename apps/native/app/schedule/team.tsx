import { useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { client, orpc, queryClient } from "utils/orpc";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";

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

    await sendMessageMutation.mutateAsync({
      matchId,
      content,
    });
  };

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

            {PurpleTeam.map((p) => (
              <View
                key={p.id}
                className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-purple-800"
                  }`}
              >
                <Text className="text-white font-semibold">
                  {p.user?.name ?? p.userId}
                </Text>
              </View>
            ))}

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

            {YellowTeam.map((p) => (
              <View
                key={p.id}
                className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-yellow-500"}`}
              >
                <Text className="text-black font-semibold">
                  {p.user?.name ?? p.userId}
                </Text>
              </View>
            ))}

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
        <View className="absolute left-0 right-0 items-center" style={{ top: "40%" }}>
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
      </View>

      {/* Droite - Chat */}
      <View className="flex-1 bg-gray-100 border-l border-gray-300">
        <View className="flex-1 p-3">

          {/* Liste messages */}
          <ScrollView className="flex-1">
            {messagesQuery.data?.map((msg) => (
              <View key={msg.id} className="mb-2">
                <Text className="text-xs text-gray-500">
                  {msg.sender?.name}
                </Text>
                <View className="bg-white p-2 rounded-lg shadow">
                  <Text>{msg.content}</Text>
                </View>
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
    </View>
  );
}
