import "@/global.css";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { HeroUINativeProvider, Spinner } from "heroui-native";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { orpc, queryClient } from "@/utils/orpc";

export const unstable_settings = {
  initialRouteName: "(auth)",
};

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();

  const privateDataQueryOptions = useMemo(() => {
    return {
      ...orpc.privateData.queryOptions(),
      retry: false,
      staleTime: 0,
    };
  }, []);

  const privateDataQuery = useQuery(privateDataQueryOptions);
  const isAuthed = !!privateDataQuery.data?.user;
  const isLoading = privateDataQuery.isLoading;

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthed && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthed && inAuthGroup) {
      router.replace("/(drawer)");
    }
  }, [isAuthed, isLoading, router, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner size="lg" color="default" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <RootNavigator />
            </HeroUINativeProvider>
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
