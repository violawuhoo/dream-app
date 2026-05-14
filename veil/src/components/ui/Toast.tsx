import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSizes } from "../../theme/tokens";

interface ToastProps {
  message: string;
  type: "error" | "success";
  visible: boolean;
  onDismiss: () => void;
}

const bgColor = {
  error: colors.error,
  success: colors.success,
};

export function Toast({ message, type, visible, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      const timer = setTimeout(() => {
        translateY.value = withTiming(-120, { duration: 300 }, (finished?: boolean) => {
          if (finished) runOnJS(onDismiss)();
        });
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(-120, { duration: 300 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          backgroundColor: bgColor[type],
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          zIndex: 999,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        animatedStyle,
      ]}
    >
      <Text style={{ color: "#FFFFFF", fontSize: fontSizes.base, flex: 1 }}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={12}>
        <Text style={{ color: "#FFFFFF", fontSize: fontSizes.lg, marginLeft: 12 }}>×</Text>
      </Pressable>
    </Animated.View>
  );
}
