import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignUp } from "@/components/sign-up";

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <Container className="p-6 justify-center">
      <View className="gap-4">
        <SignUp />

        <Pressable
          onPress={() => router.push("/(auth)/login")}
          hitSlop={7}
          accessibilityRole="button"
        >
          <Text className="text-foreground text-center">Déjà un compte ? Se connecter</Text>
        </Pressable>
      </View>
    </Container>
  );
}
