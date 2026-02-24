import { useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { client, orpc, queryClient } from "utils/orpc";
import { authClient } from "@/lib/auth-client";

export default function ScheduleDetails() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const { id } = useLocalSearchParams();
  const scheduleId = typeof id === "string" ? Number(id) : Number.NaN;
  const isScheduleIdValid = Number.isFinite(scheduleId);

  const ensureMatchQuery = useQuery({
    queryKey: ["matches.ensureForSchedule", scheduleId],
    queryFn: async () => (client as any).matches.ensureForSchedule({ scheduleId }),
    enabled: isScheduleIdValid,
  });

  const matchId = ensureMatchQuery.data?.id;
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

  return (
    <View className="flex-1">

      {/* Fond divisé en 2 */}
      <View className="flex-1 flex-row">

        {/* Gauche - Mauve */}
        <View className="flex-1 bg-purple-600 justify-center items-center">
          <Text className="text-white text-2xl font-bold">
            Team Purple
          </Text>

          {!isScheduleIdValid ? (
            <Text className="text-white mt-2">Invalid schedule</Text>
          ) : ensureMatchQuery.isLoading ? (
            <Text className="text-white mt-2">Loading...</Text>
          ) : ensureMatchQuery.isError ? (
            <Text className="text-white mt-2">Unable to load match</Text>
          ) : null}

          {PurpleTeam.map((p) => (
            <View
              key={p.id}
              className="bg-purple-800 px-4 py-2 rounded-full mt-2"
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
              className="bg-white px-4 py-2 rounded-full mt-2"
            >
              <Text className="text-black font-semibold">
                {p.user?.name ?? p.userId}
              </Text>
            </View>
          ))}

          {YellowTeam.length < 5 && (
            <Pressable
              onPress={() => joinTeam("YELLOW")}
              className="w-16 h-16 bg-black rounded-lg m-2 justify-center items-center"
            >
              <Text className="text-3xl">+</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Rond noir centré */}
      <View
        className="absolute self-center justify-center items-center bg-black rounded-full"
        style={{
          width: 160,
          height: 160,
          top: "40%",
        }}
      >
        <Text className="text-white text-lg font-bold text-center px-4">
          {participants.length} / 10
        </Text>
      </View>

      {myParticipant && (
        <Pressable
          onPress={leaveTeam}
          className="absolute bottom-16 self-center bg-red-600 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">
            Leave Match
          </Text>
        </Pressable>
      )}
      
    </View>
  );
}
