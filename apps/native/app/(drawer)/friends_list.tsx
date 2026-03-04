import { Card } from "heroui-native";
import { Alert, Text, View, Pressable, Image } from "react-native";
import MaterialIcons from "@expo/vector-icons/build/MaterialIcons";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function FriendsList() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

	// Récupère la liste des amis de l'utilisateur
	const friendsQuery = useQuery(orpc.friends.list.queryOptions());

	// Récupère le profil de l'utilisateur sélectionné
	const userProfileQuery = useQuery({
		...orpc.user.getProfile.queryOptions({
			input: { userId: selectedUserId! },
		}),
		enabled: !!selectedUserId,
	});

	// Liste des amis de l'utilisateur
	const friends = friendsQuery.data ?? [];

	const removeFriendMutation = useMutation(
		orpc.friends.remove.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries();
				setSelectedUserId(null);
				Alert.alert("Ami supprimé", "Cet ami a été supprimé.");
			},
			onError: (error) => {
				const message = error instanceof Error ? error.message : String(error);
				Alert.alert("Erreur", message);
			},
		}),
	);

	const handleInviteToMatch = () => {
		if (!selectedUserId) return;
		router.push({
			pathname: "/my_matches",
			params: { inviteUserId: selectedUserId },
		});
	};

	const handleRemoveFriend = () => {
		if (!selectedUserId || removeFriendMutation.isPending) return;
		void removeFriendMutation.mutateAsync({ friendId: selectedUserId });
	};

	return (
		<Container className="p-6">
			<View className="gap-4">
				<Text className="text-3xl font-bold text-white">Friends</Text>
				<Text className="text-base text-gray-400">
					Friend's list
				</Text>
			</View>

			{friendsQuery.isLoading ? (
				<Text className="text-gray-400 mt-4">Loading friends...</Text>
			) : friends.length === 0 ? (
				<Text className="text-gray-400 mt-4">No friends yet.</Text>
			) : (
				<View className="mt-4 gap-3">
					{/* Affiche la liste des amis */}
					{friends.map((friend) => (
						<Pressable
							key={friend.id}
							onPress={() => setSelectedUserId(friend.id)}
						>
							<Card className="p-4 bg-gray-800">
								<Text className="text-white font-semibold">
									{friend.pseudo ?? friend.name}
								</Text>
								<Text className="text-gray-400">{friend.email}</Text>
							</Card>
						</Pressable>
					))}
				</View>
			)}

			{selectedUserId && (
				<View className="absolute inset-0 bg-black/60 justify-center items-center px-6">
					<View className="w-full bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700">
						{userProfileQuery.isLoading ? (
							<Text className="text-white text-center">Loading...</Text>
						) : (
							<>
								<View className="items-center mb-4">
									<View className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden">
										{userProfileQuery.data?.photoUrl && (
											<Image
												source={{ uri: userProfileQuery.data.photoUrl }}
												className="w-full h-full"
											/>
										)}
									</View>
								</View>

								<Text className="text-xl font-bold text-center text-white">
									{userProfileQuery.data?.pseudo ?? userProfileQuery.data?.name}
								</Text>

								<Text className="text-center text-gray-300 mt-4">
									🏆 Matches played: {userProfileQuery.data?.matchesPlayed ?? 0}
								</Text>
							</>
						)}

						<Pressable
							onPress={handleInviteToMatch}
							className="mt-6 bg-blue-600 py-3 rounded-full"
						>
							<Text className="text-center text-white font-semibold">
								Inviter au match
							</Text>
						</Pressable>

						<Pressable
							onPress={handleRemoveFriend}
							className="mt-3 bg-gray-700 py-3 rounded-full"
						>
							<Text className="text-center text-white font-semibold">
								Supprimer
							</Text>
						</Pressable>

						<Pressable
							onPress={() => setSelectedUserId(null)}
							className="mt-3 bg-gray-700 py-2 rounded-full"
						>
							<Text className="text-center text-white font-semibold">Close</Text>
						</Pressable>
					</View>
				</View>
			)}
		</Container>
	);
}
