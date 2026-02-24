import { Button, ErrorView, Spinner, Surface, TextField } from "heroui-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export default function ProfileTab() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [image, setImage] = useState<string | null>(null);

	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!session?.user) return;
		setName(session.user.name ?? "");
		setEmail(session.user.email ?? "");
		setImage(session.user.image ?? null);
	}, [session?.user?.id]);

	const hasSession = !!session?.user;
	const initial = useMemo(() => {
		const n = (name || session?.user?.name || "").trim();
		return n ? n[0]!.toUpperCase() : "?";
	}, [name, session?.user?.name]);

	async function handlePickPhoto() {
		if (!hasSession) return;

		// Minimal: we store the local URI returned by the picker.
		// For a real app, you'd upload it and store a public URL.
		try {
			const ImagePicker = await import("expo-image-picker");
			const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!perm.granted) {
				Alert.alert("Permission", "Autorise l'accès à tes photos pour choisir un avatar.");
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			if (!result.canceled && result.assets?.[0]?.uri) {
				setImage(result.assets[0].uri);
			}
		} catch {
			Alert.alert(
				"Missing dependency",
				"Installe expo-image-picker pour activer la sélection de photo.",
			);
		}
	}

	async function handleSave() {
		if (!hasSession) return;
		setError(null);
		setIsSaving(true);

		const tasks: Promise<void>[] = [];

		const nameChanged = name.trim() && name.trim() !== (session?.user?.name ?? "");
		const imageChanged = (image ?? null) !== (session?.user?.image ?? null);
		if (nameChanged || imageChanged) {
			tasks.push(
				new Promise((resolve) => {
					authClient.updateUser(
						{
							name: name.trim(),
							image,
						},
						{
							onError: (e) => {
								setError(e.error?.message || e.error?.statusText || "Failed to update user");
								resolve();
							},
							onSuccess: () => resolve(),
							onFinished: () => resolve(),
						},
					);
				}),
			);
		}

		const emailChanged = email.trim() && email.trim() !== (session?.user?.email ?? "");
		if (emailChanged) {
			tasks.push(
				new Promise((resolve) => {
					authClient.changeEmail(
						{ newEmail: email.trim() },
						{
							onError: (e) => {
								setError(e.error?.message || e.error?.statusText || "Failed to change email");
								resolve();
							},
							onSuccess: () => resolve(),
							onFinished: () => resolve(),
						},
					);
				}),
			);
		}

		// Password change needs current+new password. With a single field, we try setPassword
		// (works for accounts that don't already have a credential password).
		if (password.trim()) {
			tasks.push(
				new Promise((resolve) => {
					(authClient as any).setPassword(
						{ newPassword: password },
						{
							onError: (e: any) => {
								setError(
									e.error?.message ||
										e.error?.statusText ||
										"Failed to update password (may require current + new password)",
								);
								resolve();
							},
							onSuccess: () => {
								setPassword("");
								resolve();
							},
							onFinished: () => resolve(),
						},
					);
				}),
			);
		}

		await Promise.all(tasks);
		await queryClient.invalidateQueries();
		setIsSaving(false);
	}

	function handleLogout() {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					queryClient.clear();
					router.replace("/(auth)/login");
				},
				onError: (e) => {
					Alert.alert("Logout", e.error?.message || "Impossible de se déconnecter");
				},
			},
		});
	}

	function handleDeleteAccount() {
		if (!hasSession) return;

		Alert.alert(
			"Delete account",
			"Cette action est irréversible. Continuer ?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => {
						setIsDeleting(true);
						setError(null);
						authClient.deleteUser(
							{
								password: password.trim() ? password : undefined,
							},
							{
								onError: (e) => {
									setError(e.error?.message || e.error?.statusText || "Failed to delete user");
									setIsDeleting(false);
								},
								onSuccess: () => {
									queryClient.clear();
									router.replace("/(auth)/login");
								},
								onFinished: () => {
									setIsDeleting(false);
								},
							},
						);
					},
				},
			],
		);
	}

	return (
		<Container className="p-6">
			<View className="gap-4">
				<Text className="text-2xl font-bold text-foreground">Profile</Text>

				{!hasSession ? (
					<Surface variant="secondary" className="p-4 rounded-lg">
						<Text className="text-muted">Connecte-toi pour modifier ton profil.</Text>
					</Surface>
				) : (
					<>
						<Surface variant="secondary" className="p-4 rounded-lg">
							<View className="items-center gap-3">
								<View className="w-28 h-28 rounded-full bg-muted items-center justify-center overflow-hidden">
									{image ? (
										<Image source={{ uri: image }} className="w-28 h-28" />
									) : (
										<Text className="text-foreground text-3xl font-bold">{initial}</Text>
									)}
								</View>

								<Pressable onPress={handlePickPhoto} hitSlop={10}>
									<Text className="text-foreground font-medium">Edit photo</Text>
								</Pressable>
							</View>
						</Surface>

						<Surface variant="secondary" className="p-4 rounded-lg">
							<Text className="text-foreground font-medium mb-4">Edit Info</Text>

							<ErrorView isInvalid={!!error} className="mb-3">
								{error}
							</ErrorView>

							<View className="gap-3">
								<TextField>
									<TextField.Label>Name</TextField.Label>
									<TextField.Input value={name} onChangeText={setName} placeholder="John Doe" />
								</TextField>

								<TextField>
									<TextField.Label>Email</TextField.Label>
									<TextField.Input
										value={email}
										onChangeText={setEmail}
										placeholder="email@example.com"
										keyboardType="email-address"
										autoCapitalize="none"
									/>
								</TextField>

								<TextField>
									<TextField.Label>Password</TextField.Label>
									<TextField.Input
										value={password}
										onChangeText={setPassword}
										placeholder="••••••••"
										secureTextEntry
									/>
								</TextField>

								<Button onPress={handleSave} isDisabled={isSaving || isPending} className="mt-1">
									{isSaving ? <Spinner size="sm" color="default" /> : <Button.Label>Save</Button.Label>}
								</Button>
							</View>
						</Surface>

						<Surface variant="secondary" className="p-4 rounded-lg">
							<View className="gap-3">
								<Button onPress={handleLogout}>
									<Button.Label>Log out</Button.Label>
								</Button>

								<Button onPress={handleDeleteAccount} isDisabled={isDeleting}>
									{isDeleting ? (
										<Spinner size="sm" color="default" />
									) : (
										<Button.Label>Delete my account</Button.Label>
									)}
								</Button>
							</View>
						</Surface>
					</>
				)}
			</View>
		</Container>
	);
}

