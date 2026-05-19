import "../global.css";
import { useEffect } from "react";
import { ClerkProvider } from "@clerk/clerk-expo";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

function RootNavigator() {
  useEffect(() => {
    AsyncStorage.getItem("veil_onboarded").then((value: string | null) => {
      if (!value) {
        router.replace("/onboarding");
      }
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootNavigator />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
