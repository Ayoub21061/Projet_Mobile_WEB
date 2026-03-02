import { Card } from "heroui-native";
import { Text, View, Pressable } from "react-native";

import { Container } from "@/components/container";
import { TextInput } from "react-native-gesture-handler";
import MaterialIcons from "@expo/vector-icons/build/MaterialIcons";
import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";

export default function TabTwo() {

  // Ajout de l'état du user sélectionné
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Ajout de l'état pour la barre de recherche
  const [text, setText] = useState("");

  // Récupère toutes les locations
  const { data: users, isLoading: isLoadingUsers } = useQuery(
    orpc.user.list.queryOptions()
  );

  // Récupère tout les profils d'utilisateurs (pour les amis)
  const userProfileQuery = useQuery({
    ...orpc.user.getProfile.queryOptions({
      input: { userId: selectedUserId! },
    }),
    enabled: !!selectedUserId,
  });

  // Filtrage des utilisateurs selon la recherche
  const filteredUsers = users?.filter((user) => {
    if (!text.trim()) return true;

    const search = text.toLowerCase();

    return (
      user.email.toLowerCase().includes(search) ||
      user.name.toLowerCase().includes(search)
    );
  });

  return (
    <Container className="p-6">
      <View className="gap-4">
        <Text className="text-3xl font-bold text-white">Friends</Text>

        <Text className="text-base text-gray-400">
          Rechercher vos amis :
        </Text>
      </View>

      {/* Barre de recherche */}
      <View className="flex-row items-center bg-gray-800 rounded-xl px-4">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Friend's name or email"
          placeholderTextColor="#9ca3af"
          className="flex-1 bg-gray-800 text-white p-4 rounded-xl"
        />
        <MaterialIcons name="search" size={24} color="#9ca3af" />
      </View>

      {isLoadingUsers && (
        <Text className="text-gray-400 mt-4">Loading users...</Text>
      )}

      <View className="mt-4 gap-3">
        {filteredUsers?.map((user) => (
          <Pressable
            key={user.id}
            onPress={() => setSelectedUserId(user.id)}
          >
            <Card className="p-4 bg-gray-800">
              <Text className="text-white font-semibold">{user.name}</Text>
              <Text className="text-gray-400">{user.email}</Text>
            </Card>
          </Pressable>
        ))}
      </View>

      {selectedUserId && (
        <View className="absolute inset-0 bg-black/60 justify-center items-center px-6">

          <View className="w-full bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700">

            {userProfileQuery.isLoading ? (
              <Text className="text-white text-center">Loading...</Text>
            ) : (
              <>
                {/* Avatar */}
                <View className="items-center mb-4">
                  <View className="w-24 h-24 rounded-full bg-gray-700 justify-center items-center">
                    <MaterialIcons name="person" size={50} color="white" />
                  </View>
                </View>

                {/* Nom */}
                <Text className="text-xl font-bold text-center text-white">
                  {userProfileQuery.data?.pseudo ??
                    userProfileQuery.data?.name}
                </Text>

                {/* Email */}
                <Text className="text-center text-gray-400 mt-1">
                  {userProfileQuery.data?.email}
                </Text>

                {/* Matches */}
                <Text className="text-center text-gray-300 mt-4">
                  🏆 Matches played: {userProfileQuery.data?.matchesPlayed ?? 0}
                </Text>

                {/* Bouton Ajouter en ami */}
                <Pressable
                  className="mt-6 flex-row items-center justify-center bg-blue-600 py-3 rounded-full"
                  onPress={() => {
                    // 👉 Ici tu mettras ta mutation friend request
                    console.log("Send friend request");
                  }}
                >
                  <MaterialIcons name="person-add" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Add Friend
                  </Text>
                </Pressable>
              </>
            )}

            {/* Close */}
            <Pressable
              onPress={() => setSelectedUserId(null)}
              className="mt-4 bg-gray-700 py-2 rounded-full"
            >
              <Text className="text-center text-white font-semibold">
                Close
              </Text>
            </Pressable>

          </View>
        </View>
      )}


    </Container>
  );
}