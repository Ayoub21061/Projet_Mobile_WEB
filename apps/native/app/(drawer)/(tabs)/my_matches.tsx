import { View, Text, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "utils/orpc";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "expo-router";

export default function MyMatches() {
  const router = useRouter();
  // Permet de récupérer l'id de l'utilisateur courant pour filtrer les matchs auxquels il participe
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  // Récupérer tous les participants de tous les matchs, puis filtrer ceux où userId === currentUserId et status === "ACCEPTED"
  const participantsQuery = useQuery(
    orpc.match_participant.list.queryOptions()
  );

  const allParticipants = participantsQuery.data ?? [];

  // On filtre uniquement les matchs où le user est inscrit
  const myParticipations = allParticipants.filter(
    (p) => p.userId === currentUserId && p.status === "ACCEPTED"
  );

  if (!currentUserId) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Please sign in.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">My Matches</Text>

      {myParticipations.length === 0 && (
        <Text>You haven't joined any matches yet.</Text>
      )}

      {myParticipations.map((p) => (
        <Pressable
          key={p.id}
          onPress={() =>
            router.push({
              pathname: "/schedule/team",
              params: { matchId: p.matchId },
            })
          }
          className="bg-gray-200 p-4 rounded-xl mb-3"
        >
          <Text className="font-bold">Match #{p.matchId}</Text>
          <Text>Team: {p.team}</Text>
        </Pressable>
      ))}
    </View>
  );
}