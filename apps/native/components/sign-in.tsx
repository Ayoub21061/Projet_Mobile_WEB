import { Button, FieldError, Input, Label, Spinner, Surface, TextField } from "heroui-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setIsLoading(true);
    setError(null);

    try {
      await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onError(error) {
            setError(error.error?.message || "Failed to sign in");
          },
          onSuccess() {
            setEmail("");
            setPassword("");
            router.replace("/(drawer)");
            queryClient.refetchQueries();
          },
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(
        message === "Failed to fetch"
          ? "Serveur injoignable. Lance d'abord le backend web (pnpm dev:web) et vérifie EXPO_PUBLIC_SERVER_URL=http://localhost:3001"
          : message,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Surface variant="secondary" className="p-4 rounded-lg">
      <Text className="text-foreground font-medium mb-4">Sign In</Text>

      <FieldError isInvalid={!!error} className="mb-3">
        {error}
      </FieldError>

      <View className="gap-3">
        <TextField>
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </TextField>

        <TextField>
          <Label>Password</Label>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
        </TextField>

        <Button onPress={handleLogin} isDisabled={isLoading} className="mt-1">
          {isLoading ? <Spinner size="sm" color="default" /> : <Button.Label>Sign In</Button.Label>}
        </Button>
      </View>
    </Surface>
  );
}

export { SignIn };
