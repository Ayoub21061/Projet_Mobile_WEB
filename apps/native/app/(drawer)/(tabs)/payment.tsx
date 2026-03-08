import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable } from "react-native";





export default function Payment() {

  const router = useRouter();
  const { matchId } = useLocalSearchParams();

  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-2xl font-bold mb-4">Payment for Match {matchId}</Text>
      <Text className="mb-6">This is where the payment process would take place.</Text>
      <Pressable
        onPress={() => router.push("/(drawer)/my_matches")}
        className="bg-blue-900 px-6 py-3 rounded-full"
      >
        <Text className="text-white font-bold">Go Back to My Matches</Text>
      </Pressable>
    </View>
  );

}
