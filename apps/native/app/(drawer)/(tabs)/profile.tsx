import { Button, ErrorView, Spinner, Surface, TextField } from "heroui-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export default function ProfileTab() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [image, setImage] = useState<string | null>(null);

	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);

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

		// On utilise une importation dynamique pour éviter de charger expo-image-picker si on n'en a pas besoin
		// Cela permet aussi de ne pas demander la permission d'accès aux photos tant que l'utilisateur n'essaie pas de changer sa photo
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

		const call = (fn: (resolve: () => void, reject: (msg: string) => void) => void) =>
			new Promise<void>((resolve, reject) => {
				fn(resolve, (msg) => reject(new Error(msg)));
			});

		try {
			const nameChanged = name.trim() && name.trim() !== (session?.user?.name ?? "");
			const imageChanged = (image ?? null) !== (session?.user?.image ?? null);
			if (nameChanged || imageChanged) {
				await call((resolve, reject) => {
					authClient.updateUser(
						{
							name: name.trim(),
							image,
						},
						{
							onError: (e: any) =>
								reject(e.error?.message || e.error?.statusText || "Failed to update user"),
							onSuccess: () => resolve(),
						},
					);
				});
			}

			const emailChanged = email.trim() && email.trim() !== (session?.user?.email ?? "");
			if (emailChanged) {
				await call((resolve, reject) => {
					authClient.changeEmail(
						{ newEmail: email.trim() },
						{
							onError: (e: any) =>
								reject(e.error?.message || e.error?.statusText || "Failed to change email"),
							onSuccess: () => resolve(),
						},
					);
				});
			}

			const wantsPasswordChange = currentPassword.trim() || newPassword.trim();
			if (wantsPasswordChange) {
				if (!currentPassword.trim() || !newPassword.trim()) {
					throw new Error("Please fill both current and new password.");
				}

				await call((resolve, reject) => {
					authClient.changePassword(
						{
							currentPassword: currentPassword,
							newPassword: newPassword,
						},
						{
							onError: (e: any) =>
								reject(e.error?.message || e.error?.statusText || "Failed to change password"),
							onSuccess: () => resolve(),
						},
					);
				});

				setCurrentPassword("");
				setNewPassword("");
			}

			await queryClient.invalidateQueries();
			setIsSaving(false);

			router.replace({
				pathname: "/(drawer)/(tabs)",
				params: { saved: "1" },
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to save");
			setIsSaving(false);
		}
	}

	function handleLogout() {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					queryClient.clear();
					router.replace("/(auth)/login");
				},
			},
		});
	}

	function handleDeleteAccount() {
		if (!hasSession) return;
		if (isDeleting) return;

		const title = "Delete account";
		const message = "Cette action est irréversible. Continuer ?";

		const deleteNow = () => {
			setIsDeleting(true);
			setError(null);
			authClient.deleteUser(
				{
					password: currentPassword.trim() ? currentPassword : undefined,
				},
				{
					onError: (e: any) => {
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
		};

		if (Platform.OS === "web") {
			const confirmFn = (globalThis as any).confirm as ((text?: string) => boolean) | undefined;
			const ok = confirmFn ? confirmFn(`${title}\n\n${message}`) : false;
			if (ok) deleteNow();
			return;
		}

		Alert.alert(title, message, [
			{ text: "Cancel", style: "cancel" },
			{ text: "Delete", style: "destructive", onPress: deleteNow },
		]);
	}

	return (
		<Container className="p-6">
			<View className="gap-4">
				<Text className="text-2xl font-bold text-foreground">Profile</Text>

				{!hasSession ? (
					<Surface variant="secondary" className="p-4 rounded-lg">
						<Text className="text-muted">Connecte-toi pour modifier ton profil.</Text>
					</Surface>
				) : !isEditing ? (
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
								<Text className="text-foreground font-medium">{session?.user?.name ?? ""}</Text>
								<Text className="text-muted">{session?.user?.email ?? ""}</Text>
							</View>
						</Surface>

						<Surface variant="secondary" className="rounded-lg">
							<Pressable
								onPress={() => setIsEditing(true)}
								className="p-4"
								hitSlop={10}
							>
								<Text className="text-foreground font-medium">Modifier mon profil</Text>
								<Text className="text-muted">Nom, email, photo, mot de passe</Text>
							</Pressable>
						</Surface>

						<Surface variant="secondary" className="rounded-lg">
							<Pressable onPress={handleLogout} className="p-4" hitSlop={10}>
								<Text className="text-foreground font-medium">Log out</Text>
							</Pressable>
						</Surface>

						<Surface variant="secondary" className="rounded-lg">
							<Pressable
								onPress={handleDeleteAccount}
								disabled={isDeleting}
								className="p-4"
								hitSlop={10}
							>
								<Text className="text-foreground font-medium">Delete my account</Text>
								<Text className="text-muted">
									{isDeleting ? "Suppression…" : "Cette action est irréversible"}
								</Text>
							</Pressable>
						</Surface>
					</>
				) : (
					<>
						<Surface variant="secondary" className="rounded-lg">
							<Pressable onPress={() => setIsEditing(false)} className="p-4" hitSlop={10}>
								<Text className="text-foreground font-medium">Retour</Text>
							</Pressable>
						</Surface>

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
									<TextField.Label>Current password</TextField.Label>
									<TextField.Input
										value={currentPassword}
										onChangeText={setCurrentPassword}
										placeholder="••••••••"
										secureTextEntry
									/>
								</TextField>

								<TextField>
									<TextField.Label>New password</TextField.Label>
									<TextField.Input
										value={newPassword}
										onChangeText={setNewPassword}
										placeholder="••••••••"
										secureTextEntry
									/>
								</TextField>

								<Button onPress={handleSave} isDisabled={isSaving || isPending} className="mt-1">
									{isSaving ? <Spinner size="sm" color="default" /> : <Button.Label>Save</Button.Label>}
								</Button>
							</View>
						</Surface>

						<Surface variant="secondary" className="rounded-lg">
							<Pressable onPress={handleLogout} className="p-4" hitSlop={10}>
								<Text className="text-foreground font-medium">Log out</Text>
							</Pressable>
						</Surface>

						<Surface variant="secondary" className="rounded-lg">
							<Pressable
								onPress={handleDeleteAccount}
								disabled={isDeleting}
								className="p-4"
								hitSlop={10}
							>
								<Text className="text-foreground font-medium">Delete my account</Text>
								<Text className="text-muted">
									{isDeleting ? "Suppression…" : "Cette action est irréversible"}
								</Text>
							</Pressable>
						</Surface>
					</>
				)}
			</View>
		</Container>
	);
}

