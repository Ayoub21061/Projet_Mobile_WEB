import { useQuery } from "@tanstack/react-query";
import { Card } from "heroui-native";
import { useRouter } from "expo-router";
import { Text, View, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function Home() {
  const router = useRouter();
  const privateDataQuery = useQuery(orpc.privateData.queryOptions());
  const userName = privateDataQuery.data?.user?.name || privateDataQuery.data?.user?.email || "";

  return (
    <Container className="p-6">
      <Text className="text-4xl font-bold text-center mb-6 text-white">
        Bienvenue{userName ? ` ${userName}` : ""}
      </Text>

      <Text className="text-2xl font-semibold text-center mb-6 text-gray-400">
        Choisissez votre sport
      </Text>

      <View className="flex-1 flex-wrap justify-center items-center">
        <View className="flex-row flex-wrap gap-4 w-full justify-between">

          <Pressable onPress={() => router.push("/football")} style={{ width: '47%' }}>
            <Card variant="secondary" className="h-48 p-4 items-center justify-center">
              <MaterialIcons name="sports-soccer" size={40} color="#8b5cf6" />
              <Card.Title className="text-xl mt-2 text-center">Football</Card.Title>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/basketball")} style={{ width: '47%' }}>
            <Card variant="secondary" className="h-48 p-4 items-center justify-center">
              <MaterialIcons name="sports-basketball" size={40} color="#f59e0b" />
              <Card.Title className="text-xl mt-2 text-center">Basketball</Card.Title>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/tennis")} style={{ width: '47%' }}>
            <Card variant="secondary" className="h-48 p-4 items-center justify-center">
              <MaterialIcons name="sports-tennis" size={40} color="#22c55e" />
              <Card.Title className="text-xl mt-2 text-center">Tennis</Card.Title>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/padel")} style={{ width: '47%' }}>
            <Card variant="secondary" className="h-48 p-4 items-center justify-center">
              <MaterialIcons name="sports-tennis" size={40} color="#0ea5e9" />
              <Card.Title className="text-xl mt-2 text-center">Padel</Card.Title>
            </Card>
          </Pressable>

        </View>
      </View>
    </Container>
  );
}