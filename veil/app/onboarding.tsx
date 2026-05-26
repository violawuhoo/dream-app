import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PagerView from "react-native-pager-view";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSizes, borderRadius } from "../src/theme/tokens";
import { VeilButton } from "../src/components/ui/VeilButton";

function PulsingCircle() {
  const scale = useSharedValue(1);
  scale.value = withRepeat(
    withSequence(
      withTiming(1.1, { duration: 1500 }),
      withTiming(1, { duration: 1500 }),
    ),
    -1,
    false,
  );
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: colors.accent,
          opacity: 0.6,
        },
      ]}
    />
  );
}

function PageOne() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
      <PulsingCircle />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: fontSizes.lg,
          fontWeight: "600",
          textAlign: "center",
          marginTop: 32,
        }}
      >
        Capture before it fades
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSizes.base,
          textAlign: "center",
          maxWidth: 280,
          marginTop: 12,
          lineHeight: fontSizes.base * 1.5,
        }}
      >
        Describe whatever fragments remain. Veil asks gentle questions to help you reconstruct.
      </Text>
    </View>
  );
}

function PageTwo() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
      <Ionicons name="diamond-outline" size={64} color={colors.gold} />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: fontSizes.lg,
          fontWeight: "600",
          textAlign: "center",
          marginTop: 32,
        }}
      >
        Understand what it means
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSizes.base,
          textAlign: "center",
          maxWidth: 280,
          marginTop: 12,
          lineHeight: fontSizes.base * 1.5,
        }}
      >
        Jungian analysis, life connections, and Tarot guidance — layered interpretation, not diagnosis.
      </Text>
    </View>
  );
}

function PageThree() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
      <Ionicons name="lock-closed-outline" size={64} color={colors.accent} />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: fontSizes.lg,
          fontWeight: "600",
          textAlign: "center",
          marginTop: 32,
        }}
      >
        Your dreams, privately kept
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSizes.base,
          textAlign: "center",
          maxWidth: 280,
          marginTop: 12,
          lineHeight: fontSizes.base * 1.5,
        }}
      >
        Everything stays in your private account. We never read your dreams.
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  const handleBegin = async () => {
    await AsyncStorage.setItem("veil_onboarded", "true");
    router.replace("/(auth)/sign-in");
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("veil_onboarded", "true");
    router.replace("/(auth)/sign-in");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Skip button — pages 0 and 1 only */}
      {page < 2 && (
        <Pressable
          testID="btn-skip-onboarding"
          onPress={handleSkip}
          style={{
            position: "absolute",
            top: insets.top + 12,
            right: 20,
            zIndex: 10,
            padding: 8,
          }}
          hitSlop={12}
        >
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Skip</Text>
        </Pressable>
      )}

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        <View key="1">
          <PageOne />
        </View>
        <View key="2">
          <PageTwo />
        </View>
        <View key="3">
          <PageThree />
        </View>
      </PagerView>

      {/* Progress dots */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          paddingBottom: 16,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Pressable key={i} testID={`dot-${i}`} onPress={() => pagerRef.current?.setPage(i)} hitSlop={8}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: borderRadius.full,
                backgroundColor: i === page ? colors.accent : colors.textMuted,
              }}
            />
          </Pressable>
        ))}
      </View>

      {/* Begin button — always visible so tests can find it from page 0 */}
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}>
        <VeilButton
          label="Begin"
          onPress={handleBegin}
          variant="primary"
          testID="btn-begin-onboarding"
        />
      </View>
    </View>
  );
}
