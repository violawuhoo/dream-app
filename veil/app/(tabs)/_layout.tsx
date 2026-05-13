import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";

export default function TabsLayout() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: "#0A0A0F", borderTopColor: "#1A1A2E" }, tabBarActiveTintColor: "#FFFFFF", tabBarInactiveTintColor: "#555" }}>
      <Tabs.Screen name="index" options={{ title: "Dream" }} />
      <Tabs.Screen name="archive" options={{ title: "Archive" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
