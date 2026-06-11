import { ActivityIndicator, Pressable, Text, View, ViewStyle, TextStyle } from "react-native";
import { colors, fontSizes, borderRadius } from "../../theme/tokens";

type Variant = "primary" | "ghost" | "danger";

interface VeilButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  testID?: string;
}

const containerStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ghost: {
    backgroundColor: "transparent",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  danger: {
    backgroundColor: "transparent",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
};

const labelStyles: Record<Variant, TextStyle> = {
  primary: { color: "#FFFFFF", fontSize: fontSizes.base, fontWeight: "600" },
  ghost: { color: colors.accent, fontSize: fontSizes.base, fontWeight: "600" },
  danger: { color: colors.error, fontSize: fontSizes.base, fontWeight: "600" },
};

export function VeilButton({ label, onPress, variant = "primary", loading, disabled, icon, testID }: VeilButtonProps) {
  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }}>
      <Pressable
        testID={testID}
        style={containerStyles[variant]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : colors.accent} />
        ) : (
          <>
            {icon}
            <Text style={labelStyles[variant]}>{label}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
