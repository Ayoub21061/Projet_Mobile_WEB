import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";

export default function ScheduleDetails() {
  const { id } = useLocalSearchParams();

  return (
    <View className="flex-1 justify-center items-center bg-black">
      <Text className="text-white text-2xl">
        Schedule ID: {id}
      </Text>
    </View>
  );
}
