import { useLocalSearchParams, useRouter } from "expo-router";
import { Dimensions, FlatList, Pressable, Text, View } from "react-native";
import { client, orpc } from "utils/orpc";
import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { useFieldSchedules } from "@my-app/hooks";

export default function FieldDetails() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const idValue = Array.isArray(id) ? id[0] : id;
  const fieldId = typeof idValue === "string" ? Number(idValue) : Number.NaN;
  const isFieldIdValid = Number.isFinite(fieldId);

  const router = useRouter();

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const screenWidth = Dimensions.get("window").width;
  const numColumns = 4;
  const cardMargin = 4;
  const cardSize =
    (screenWidth - (numColumns + 1) * cardMargin * 2 - 48) / numColumns;

  const {
    field,
    schedules,
    schedulesByDay,
    isLoading,
    participants,
    matchIdByScheduleId,
    acceptedCountByMatchId,
  } = useFieldSchedules(orpc, client, fieldId, currentUserId);

  const renderScheduleCard = (schedule: any) => {
    const matchId = matchIdByScheduleId.get(schedule.id);
    const acceptedCount = matchId ? (acceptedCountByMatchId.get(matchId) ?? 0) : 0;
    const isFull = acceptedCount >= 10;
    const isAvailable = Boolean(schedule.isAvailable) && !isFull;

    const isUserParticipant =
      !!currentUserId &&
      !!matchId &&
      (participants ?? []).some(
        (p: any) =>
          p.matchId === matchId &&
          p.userId === currentUserId &&
          p.status === "ACCEPTED",
      );

    const isLocked = !isAvailable && !isUserParticipant;

    return (
      <Pressable
        key={schedule.id}
        disabled={isLocked}
        onPress={() => {
          if (!isLocked) {
            router.push({
              pathname: "/schedule/team",
              params: { id: String(schedule.id) },
            });
          }
        }}
        style={({ pressed }) => [
          {
            width: cardSize,
            height: cardSize,
            margin: cardMargin,
            opacity: isLocked ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}
        className={`rounded-xl justify-center items-center ${
          isAvailable ? "bg-green-600" : "bg-red-600"
        }`}
      >
        <View className="absolute top-2 right-2 bg-black rounded-full px-2 py-1">
          <Text className="text-white font-bold text-xs">{acceptedCount} / 10</Text>
        </View>

        <Text className="text-white font-bold text-center">
          {schedule.start} - {schedule.end}
        </Text>

        <Text className="text-white mt-2 text-center">
          {isAvailable ? "Available" : "Already taken"}
        </Text>
      </Pressable>
    );
  };

  return (
    <Container className="p-6">
      <View className="gap-4">
        {!isFieldIdValid ? (
          <Text className="text-base text-gray-400">ID de terrain invalide</Text>
        ) : field ? (
          <Text className="text-3xl font-bold text-white">{field.name}</Text>
        ) : (
          <Text className="text-base text-gray-400">Loading field...</Text>
        )}

        <Text className="text-xl text-white mt-4 mb-2">Schedules :</Text>

        {isLoading ? (
          <Text className="text-white">Loading schedules...</Text>
        ) : schedules.length === 0 ? (
          <Text className="text-gray-400">Aucun créneau disponible</Text>
        ) : (
          Object.entries(schedulesByDay).map(([day, daySchedules]) => (
            <View key={day} className="mb-4">
              <Text className="text-lg font-bold text-white mb-2">{day}</Text>
              <FlatList
                data={daySchedules as any[]}
                keyExtractor={(item: any) => String(item.id)}
                renderItem={({ item }) => renderScheduleCard(item)}
                numColumns={numColumns}
                columnWrapperStyle={{ justifyContent: "space-between" }}
              />
            </View>
          ))
        )}
      </View>
    </Container>
  );
}
