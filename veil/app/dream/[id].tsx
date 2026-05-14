import { View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import { colors } from "../../src/theme/tokens";

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <StatusBar style="light" />
      <Text style={{ color: colors.textPrimary, fontSize: 17 }}>Dream Detail</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>{id}</Text>
    </View>
  );
}
