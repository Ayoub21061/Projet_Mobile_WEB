import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, FlatList, Dimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "utils/orpc";
import { Container } from "@/components/container";
import { Pressable } from "react-native";

export default function FieldDetails() {
  const { id } = useLocalSearchParams();
  const fieldId = typeof id === "string" ? Number(id) : Number.NaN;
  const isFieldIdValid = Number.isFinite(fieldId);

  const screenWidth = Dimensions.get("window").width;
  const numColumns = 4;
  const cardMargin = 4; // margin horizontal
  const cardSize = (screenWidth - (numColumns + 1) * cardMargin * 2 - 48) / numColumns; 
  // 48 correspond au padding du Container (p-6 * 2)

  // Récupérer les infos du field
  const { data: fields } = useQuery({
    ...orpc.field.list.queryOptions({}),
    enabled: isFieldIdValid,
  });
  const field = fields?.find((f) => f.id === fieldId);

  // Récupérer les schedules liés à ce field
  const { data: schedules, isLoading } = useQuery({
    ...orpc.schedule.listByField.queryOptions({ input: { fieldId } }),
    enabled: isFieldIdValid,
  });

  // Grouper les schedules par jour
  const schedulesByDay = schedules?.reduce((acc: any, schedule: any) => {
    if (!acc[schedule.day]) acc[schedule.day] = [];
    acc[schedule.day].push(schedule);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const router = useRouter();

  // Fonction pour rendre une card carrée
  const renderScheduleCard = (schedule: any) => {
  const isAvailable = schedule.isAvailable;

  return (
    <Pressable
      key={schedule.id}
      disabled={!isAvailable}
      onPress={() => {
        if (isAvailable) {
          router.push({
            pathname: "/schedule/team", // page cible
            params: { id: schedule.id.toString() },
          });
        }
      }}
      style={({ pressed }) => [
        {
          width: cardSize,
          height: cardSize,
          margin: cardMargin,
          opacity: !isAvailable ? 0.6 : pressed ? 0.8 : 1,
        },
      ]}
      className={`rounded-xl justify-center items-center ${
        isAvailable ? "bg-green-600" : "bg-red-600"
      }`}
    >
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
        ) : schedules?.length === 0 ? (
          <Text className="text-gray-400">Aucun créneau disponible</Text>
        ) : (
          Object.entries(schedulesByDay).map(([day, daySchedules]) => (
            <View key={day} className="mb-4">
              <Text className="text-lg font-bold text-white mb-2">{day}</Text>
              <FlatList
                data={daySchedules}
                keyExtractor={(item) => item.id.toString()}
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
