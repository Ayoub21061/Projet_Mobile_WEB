import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";

export default function ScheduleDetails() {
  const { id } = useLocalSearchParams();

    return (
    <View className="flex-1">
      
      {/* Fond divisé en 2 */}
      <View className="flex-1 flex-row">
        
        {/* Gauche - Mauve */}
        <View className="flex-1 bg-purple-600 justify-center items-center">
          <Text className="text-white text-2xl font-bold">
            Team Purple
          </Text>
        </View>

        {/* Droite - Jaune */}
        <View className="flex-1 bg-yellow-400 justify-center items-center">
          <Text className="text-black text-2xl font-bold">
            Team Yellow
          </Text>
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
          Session de "  "
        </Text>
      </View>

    </View>
  );
}
