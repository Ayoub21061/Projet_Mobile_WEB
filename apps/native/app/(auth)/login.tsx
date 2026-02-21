import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <Container className="p-6 justify-center">
      <View className="gap-4">
        <SignIn />

        <Pressable
          onPress={() => router.push("/(auth)/register")}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text className="text-foreground text-center">
            Pas encore de compte ? Créer un compte
          </Text>
        </Pressable>
      </View>
    </Container>
  );
}
