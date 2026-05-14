import { ActivityIndicator, Pressable, Text, ViewStyle, TextStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, fontSizes, borderRadius } from "../../theme/tokens";

type Variant = "primary" | "ghost" | "danger";

interface VeilButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
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

export function VeilButton({ label, onPress, variant = "primary", loading, disabled, icon }: VeilButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={containerStyles[variant]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
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
    </Animated.View>
  );
}
