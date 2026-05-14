import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme/tokens";

export default function Onboarding() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <StatusBar style="light" />
      <Text style={{ color: colors.textPrimary, fontSize: 17 }}>Onboarding</Text>
    </View>
  );
}
