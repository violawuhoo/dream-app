import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../../src/theme/tokens";

export default function TarotScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <StatusBar style="light" />
      <Text style={{ color: colors.textPrimary, fontSize: 17 }}>Tarot</Text>
    </View>
  );
}
