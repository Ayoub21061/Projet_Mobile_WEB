import { useQuery } from "@tanstack/react-query";
import { Card } from "heroui-native";
import { Link } from "expo-router";
import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
// import { FontAwesome5 } from "@expo/vector-icons";
// import { Ionicons } from "@expo/vector-icons";
import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function Home() {
  const privateDataQuery = useQuery(orpc.privateData.queryOptions());
  const userName = privateDataQuery.data?.user?.name || privateDataQuery.data?.user?.email || "";

  return (
	<Container className="p-6">
	  <Text className="text-4xl font-bold text-center mb-6 text-white">
		Bienvenue{userName ? ` ${userName}` : ""}
	  </Text>
	  {/* <View className="flex-1 justify-center items-center"> */}
	  <View className="flex-1 flex-wrap justify-center items-center">
		<View className="flex-row flex-wrap gap-4 w-full">

		  <Link href="/football" asChild>
			  <Card variant="secondary" className="w-[48%] h-48 p-8 items-center">
				<MaterialIcons name="sports-soccer" size={40} color="#8b5cf6" />
				<Card.Title className="text-3xl mb-2">Football</Card.Title>
			  </Card>
		  </Link>

		  <Card variant="secondary" className="w-[48%] h-48 p-8 items-center">
			<MaterialIcons name="sports-basketball" size={40} color="#f59e0b" />
			<Card.Title className="text-3xl mb-2">Basketball</Card.Title>
		  </Card>

		  <Card variant="secondary" className="w-[48%] h-48 p-8 items-center">
			<MaterialIcons name="sports-tennis" size={40} color="#22c55e" />
			<Card.Title className="text-3xl mb-2">Tennis</Card.Title>
		  </Card>

		  <Card variant="secondary" className="w-[48%] h-48 p-8 items-center">
			<MaterialIcons name="sports-tennis" size={40} color="#0ea5e9" />
			<Card.Title className="text-3xl mb-2">Padel</Card.Title>
		  </Card>

		</View>
	  </View>
	</Container>
  );
}

// import { useQuery } from "@tanstack/react-query";
// import { Card } from "heroui-native";
// import { Link } from "expo-router";
// import { MaterialIcons } from "@expo/vector-icons";
// import { View, Text } from "react-native";
// import { Container } from "@/components/container";
// import { orpc } from "utils/orpc";

// export default function Home() {
//   // Récupération des sports
//   const { data: sports = [], isLoading } = useQuery(orpc.sports.list.queryOptions());

//   // Mapping des noms de sports vers les routes
//   const sportRoutes: Record<string, string> = {
//     Football: "/football",
//     Basketball: "/basketball",
//     Tennis: "/tennis",
//     Padel: "/padel",
//   };

//   // Mapping des icônes MaterialIcons
//   const sportIcons: Record<string, string> = {
//     Football: "sports-soccer",
//     Basketball: "sports-basketball",
//     Tennis: "sports-tennis",
//     Padel: "sports-tennis", // pas de padel, on réutilise tennis
//   };

//   if (isLoading) {
//     return (
//       <Container className="p-6">
//         <Text className="text-white text-center mt-10">Loading sports...</Text>
//       </Container>
//     );
//   }

//   return (
//     <Container className="p-6">
//       <Text className="text-4xl font-bold text-center mb-6 text-white">
//         Choose your sport
//       </Text>

//       <View className="flex-1 flex-wrap justify-center items-center">
//         <View className="flex-row flex-wrap gap-4 w-full">
//           {sports.map((sport) => (
//             <Link
//               key={sport.id}
//               href={sportRoutes[sport.name] ?? "/"}
//               asChild
//             >
//               <Card
//                 variant="secondary"
//                 className="w-[48%] h-48 p-8 items-center"
//               >
//                 <MaterialIcons
//                   name={sportIcons[sport.name] ?? "sports-soccer"}
//                   size={40}
//                   color="#8b5cf6"
//                 />
//                 <Card.Title className="text-3xl mb-2">{sport.name}</Card.Title>
//               </Card>
//             </Link>
//           ))}
//         </View>
//       </View>
//     </Container>
//   );
// }
