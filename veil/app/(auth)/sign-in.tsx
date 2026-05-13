import { Text, TouchableOpacity, View } from "react-native";

export default function SignIn() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0F", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "bold", letterSpacing: 4 }}>
        Veil
      </Text>

      {/* Apple Sign-In — required for App Store */}
      <TouchableOpacity
        style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: 280, alignItems: "center" }}
        onPress={() => {}}
      >
        <Text style={{ color: "#000000", fontSize: 16, fontWeight: "600" }}>
          Continue with Apple
        </Text>
      </TouchableOpacity>

      {/* Google OAuth */}
      <TouchableOpacity
        style={{ backgroundColor: "#1A1A2E", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: 280, alignItems: "center", borderWidth: 1, borderColor: "#333" }}
        onPress={() => {}}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
          Continue with Google
        </Text>
      </TouchableOpacity>

      {/* Guest link */}
      <TouchableOpacity onPress={() => {}}>
        <Text style={{ color: "#666", fontSize: 14 }}>Continue as guest</Text>
      </TouchableOpacity>
    </View>
  );
}
