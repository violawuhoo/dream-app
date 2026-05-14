import { Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../../src/theme/tokens";

export default function SignIn() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 24 }}>
      <StatusBar style="light" />
      <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: "bold", letterSpacing: 4 }}>
        Veil
      </Text>

      <TouchableOpacity
        style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: 280, alignItems: "center" }}
        onPress={() => {}}
      >
        <Text style={{ color: "#000000", fontSize: 16, fontWeight: "600" }}>
          Continue with Apple
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: 280, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
        onPress={() => {}}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "600" }}>
          Continue with Google
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => {}}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Continue as guest</Text>
      </TouchableOpacity>
    </View>
  );
}
