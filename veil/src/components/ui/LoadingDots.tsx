import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { colors } from "../../theme/tokens";

const DOT_SIZE = 6;
const STAGGER = 200;

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.3, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: colors.textMuted,
          marginHorizontal: 3,
        },
        animatedStyle,
      ]}
    />
  );
}

export function LoadingDots() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
      <Dot delay={0} />
      <Dot delay={STAGGER} />
      <Dot delay={STAGGER * 2} />
    </View>
  );
}
