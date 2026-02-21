import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link, router } from "expo-router"; // Permet de faire du linking entre les écrans
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";
import React, { useCallback } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  const handleSignOut = useCallback(() => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          queryClient.clear();
          router.replace("/(auth)/login");
        },
        onError: (error) => {
          Alert.alert(
            "Déconnexion",
            error.error?.message || "Impossible de se déconnecter, réessaie.",
          );
        },
      },
    });
  }, []);

  const renderHomeHeaderRight = useCallback(() => {
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ThemeToggle />
        <Pressable
          onPress={handleSignOut}
          className="mr-4 px-2.5"
          accessibilityRole="button"
          accessibilityLabel="Déconnexion"
          hitSlop={8}
        >
          <Ionicons name="log-out-outline" size={22} color={themeColorForeground} />
        </Pressable>
      </View>
    );
  }, [handleSignOut, themeColorForeground]);

  return (
    <Drawer
      screenOptions={{
        headerTintColor: themeColorForeground,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTitleStyle: {
          fontWeight: "600",
          color: themeColorForeground,
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          headerRight: renderHomeHeaderRight,
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Home</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Tabs",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Tabs</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <MaterialIcons
              name="border-bottom"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable className="mr-4">
                <Ionicons name="add-outline" size={24} color={themeColorForeground} />
              </Pressable>
            </Link>
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
