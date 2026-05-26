import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../src/theme/tokens";

type Destination = "loading" | "onboarding" | "auth" | "app";

export default function Index() {
  const [destination, setDestination] = useState<Destination>("loading");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("veil_onboarded"),
      AsyncStorage.getItem("veil_guest"),
    ]).then(([onboarded, guest]) => {
      if (!onboarded) {
        setDestination("onboarding");
      } else if (guest === "true") {
        // Guest session persists — skip sign-in
        setDestination("app");
      } else {
        // Onboarded but no active session — show sign-in
        // (auth layout will redirect Clerk-signed-in users to tabs automatically)
        setDestination("auth");
      }
    });
  }, []);

  if (destination === "loading") {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (destination === "onboarding") {
    return <Redirect href="/onboarding" />;
  }
  if (destination === "auth") {
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Redirect href="/(tabs)" />;
}
