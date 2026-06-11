import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../src/theme/tokens";

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const [guestAllowed, setGuestAllowed] = useState<boolean | null>(null);

  // Check guest flag once on mount — this runs before any Clerk state
  // arrives and is the canonical source of truth for guest sessions.
  useEffect(() => {
    AsyncStorage.getItem("veil_guest").then((val) => {
      setGuestAllowed(val === "true");
    });
  }, []);

  // Derive blocked state only once we know both the guest flag AND Clerk.
  // While either is still loading we fall through to render <Tabs> immediately
  // so the navigator type stays stable (avoids VC-transition cascades that
  // trigger Detox's 10 s busy timeout).
  const isBlocked =
    guestAllowed === false &&   // confirmed NOT a guest
    isLoaded &&                 // Clerk has resolved
    !isSignedIn;                // and no Clerk session either

  if (isBlocked) return <Redirect href="/(auth)/sign-in" />;

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
          tabBarButton: (props) => (
            <Pressable {...(props as any)} testID="home-tab" />
          ),
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
