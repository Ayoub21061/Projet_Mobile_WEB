import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "utils/orpc";
import { Container } from "@/components/container";

export default function FieldDetails() {
  const { id } = useLocalSearchParams();
  const fieldId = typeof id === "string" ? Number(id) : Number.NaN;
  const isFieldIdValid = Number.isFinite(fieldId);

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

        <Text className="text-xl text-white mt-4">Schedules :</Text>

        {isLoading ? (
          <Text className="text-white">Loading schedules...</Text>
        ) : schedules?.length === 0 ? (
          <Text className="text-gray-400">Aucun créneau disponible</Text>
        ) : (
          schedules?.map((schedule) => (
            <View key={schedule.id} className="bg-gray-800 p-3 rounded-xl mb-2">
              <Text className="text-white">
                {schedule.start} - {schedule.end}
              </Text>
            </View>
          ))
        )}
      </View>
    </Container>
  );
}
