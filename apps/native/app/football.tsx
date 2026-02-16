// import { useMemo, useState } from "react";
// import { Text, View, TextInput, FlatList } from "react-native";
// import { Container } from "@/components/container";
// import { MaterialIcons } from "@expo/vector-icons";
// import { orpc } from "utils/orpc"; // Permet de faire des requêtes à notre API TRPC depuis le client React Native. Ici, je l'utilise pour récupérer les terrains de football disponibles.
// import { useQuery } from "@tanstack/react-query"; // React Query est une bibliothèque de gestion de l'état serveur. Elle facilite la récupération, la mise en cache et la synchronisation des données entre le client et le serveur. Ici, je l'utilise pour gérer l'état de la requête qui récupère les terrains de football.

// export default function FootballScreen() {
//     const [text, setText] = useState("");
//     const { data: locations, isLoading } = useQuery(orpc.location.list.queryOptions());

//     const filteredLocations = useMemo(() => {
//     if (!locations) return [];

//     return locations.filter((location) =>
//       location.name.toLowerCase().includes(text.toLowerCase()) ||
//       location.address.toLowerCase().includes(text.toLowerCase())
//     );
//   }, [text, locations]);

//     return (
//         <Container className="p-6">
//             <View className="gap-4">
//                 <Text className="text-3xl font-bold text-white">
//                     Football
//                 </Text>

//                 <Text className="text-base text-gray-400">
//                     Adresse de terrain de football :
//                 </Text>

//                 <View className="flex-row items-center bg-gray-800 rounded-xl px-4">

//                     <TextInput
//                         value={text}
//                         onChangeText={setText}
//                         placeholder="Rechercher un terrain"
//                         placeholderTextColor="#9ca3af"
//                         className="flex-1 bg-gray-800 text-white p-4 rounded-xl"
//                     />

//                     <MaterialIcons
//                         name="search"
//                         size={24}
//                         color="#9ca3af"
//                     />
//                 </View>

//                     {isLoading ? (
//                         <Text className="text-white">Loading...</Text>
//                     ) : (
//                         <FlatList
//                             data={filteredLocations}
//                             keyExtractor={(item) => item.id.toString()}
//                             renderItem={({ item }) => (
//                                 <View className="bg-gray-900 p-4 rounded-xl mb-3">
//                                     <Text className="text-white text-lg font-semibold">
//                                         {item.name}
//                                     </Text>
//                                     <Text className="text-gray-400">
//                                         {item.address}
//                                     </Text>
//                                 </View>
//                             )}
//                         />
//                     )}
//                 </View>
//         </Container>
//     );
// }

import { useMemo, useState } from "react";
import { Text, View, TextInput, FlatList, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { Container } from "@/components/container";
import { MaterialIcons } from "@expo/vector-icons";
import { orpc } from "utils/orpc";
import { useQuery } from "@tanstack/react-query";
import football_field from "@/assets/images/football_field.png";

export default function FootballScreen() {
  const [text, setText] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  // Récupère toutes les locations
  const { data: locations, isLoading: isLoadingLocations } = useQuery(
    orpc.location.list.queryOptions()
  );

  // Récupère tous les fields
  const { data: fields, isLoading: isLoadingFields } = useQuery(
    orpc.field.list.queryOptions()
  );

  // Filtrage des locations selon la recherche
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(text.toLowerCase()) ||
        location.address.toLowerCase().includes(text.toLowerCase())
    );
  }, [text, locations]);

  // Fields correspondant à la location sélectionnée
  const selectedFields = useMemo(() => {
    if (!fields || selectedLocationId === null) return [];
    return fields.filter((field) => field.locationId === selectedLocationId);
  }, [fields, selectedLocationId]);

  const defaultIcon = football_field;

  const fieldIcons: Record<string, any> = {
  "5v5": football_field,
};

  return (
    <Container className="p-6">
      <View className="gap-4">
        <Text className="text-3xl font-bold text-white">Football</Text>

        <Text className="text-base text-gray-400">
          Adresse de terrain de football :
        </Text>

        {/* Barre de recherche */}
        <View className="flex-row items-center bg-gray-800 rounded-xl px-4">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Rechercher un terrain"
            placeholderTextColor="#9ca3af"
            className="flex-1 bg-gray-800 text-white p-4 rounded-xl"
          />
          <MaterialIcons name="search" size={24} color="#9ca3af" />
        </View>

        {/* Liste des locations */}
        {isLoadingLocations ? (
          <Text className="text-white">Loading locations...</Text>
        ) : (
          <FlatList
            data={filteredLocations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  setSelectedLocationId(
                    item.id === selectedLocationId ? null : item.id
                  )
                }
              >
                <View
                  className={`p-4 rounded-xl mb-3 ${
                    item.id === selectedLocationId
                      ? "bg-purple-700"
                      : "bg-gray-900"
                  }`}
                >

                <MaterialIcons
                    name="sports-soccer"
                    size={22}
                    color={item.id === selectedLocationId ? "#22c55e" : "#9ca3af"}
                    className="mb-1"
                  />
                  
                  <Text className="text-white text-lg font-semibold">
                    {item.name}
                  </Text>
                  <Text className="text-gray-400">{item.address}</Text>
                </View>
              </Pressable>
            )}
          />
        )}

        {/* Liste des fields de la location sélectionnée */}
        {selectedLocationId && (
          <View className="mt-4">
            <Text className="text-xl font-bold text-white mb-2">
              Terrains disponibles :
            </Text>

            {isLoadingFields ? (
              <Text className="text-white">Loading fields...</Text>
            ) : selectedFields.length === 0 ? (
              <Text className="text-gray-400">Aucun terrain disponible</Text>
            ) : (
              <FlatList
                data={selectedFields}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/fields/field_schedule",
                      params: { id: item.id.toString() }, // On doit le faire en string pour le router et faire en sorte que l'on puisse accéder à l'id du field_schedule via route.params.id
                    })
                  }
                >

                    <View className="bg-gray-800 p-3 rounded-xl mb-2 flex-row items-center">
                    <Image
                        source={defaultIcon}
                        style={{ width: 40, height: 40, marginRight: 12 }}
                        resizeMode="contain"
                    />
                    <Text className="text-white text-base">{item.name}</Text>
                    </View>
                </Pressable>
                )}
              />
            )}
          </View>
        )}
      </View>
    </Container>
  );
}
