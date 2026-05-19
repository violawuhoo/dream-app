import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, fontSizes } from "../theme/tokens";
import { VeilButton } from "./ui/VeilButton";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Ionicons name="moon-outline" size={48} color={colors.textMuted} />
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: fontSizes.lg,
              fontWeight: "600",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            Something went quiet.
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSizes.base,
              textAlign: "center",
              marginTop: 8,
              lineHeight: fontSizes.base * 1.5,
            }}
          >
            Veil encountered an unexpected issue.
          </Text>
          <View style={{ marginTop: 32, width: "100%" }}>
            <VeilButton
              label="Return home"
              onPress={() => {
                this.setState({ hasError: false });
                router.replace("/(tabs)");
              }}
              variant="primary"
            />
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}
