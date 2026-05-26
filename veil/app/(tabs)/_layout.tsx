import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../src/theme/tokens";

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const [authState, setAuthState] = useState<"loading" | "allowed" | "blocked">("loading");

  useEffect(() => {
    // Check AsyncStorage immediately so guest users are never blocked by
    // Clerk's initialisation (Clerk may be slow or offline in E2E builds).
    AsyncStorage.getItem("veil_guest").then((guestVal) => {
      if (guestVal === "true") {
        setAuthState("allowed");
        return;
      }
      // Not a guest — Clerk must have finished loading before we can decide.
      if (!isLoaded) return;
      setAuthState(isSignedIn ? "allowed" : "blocked");
    });
  }, [isLoaded, isSignedIn]);

  // Only redirect when we have confirmed the user is NOT authenticated.
  // During "loading" we fall through and render <Tabs> immediately — this
  // keeps the navigator type stable and avoids Expo Router VC transition
  // cascades (blank View → Tabs) that cause Detox's 10 s busy timeout.
  if (authState === "blocked") return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="moon-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          tabBarButton: (props) => (
            // testID after spread so it always wins over any RN-injected testID
            <Pressable {...(props as any)} testID="archive-tab" />
          ),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="journal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarButton: (props) => (
            <Pressable {...(props as any)} testID="profile-tab" />
          ),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
