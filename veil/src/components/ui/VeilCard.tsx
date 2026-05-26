import { Pressable, View, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, borderRadius } from "../../theme/tokens";

interface VeilCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}

const cardBase: ViewStyle = {
  backgroundColor: colors.surfaceElevated,
  borderRadius: borderRadius.md,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
};

export function VeilCard({ children, style, onPress, testID }: VeilCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
    if (onPress) scale.value = withTiming(1, { duration: 100 });
  };

  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          testID={testID}
          style={[cardBase, style]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <View testID={testID} style={[cardBase, style]}>{children}</View>;
}
