import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { borderRadius, colors, fontSizes, letterSpacing as ls } from "../../src/theme/tokens";
import { Toast } from "../../src/components/ui/Toast";
import { VeilButton } from "../../src/components/ui/VeilButton";
import { generateUUID } from "../../src/lib/uuid";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const STAR_FIELD_H = SCREEN_H * 0.4;

interface StarConfig {
  id: number;
  x: number;
  initialY: number;
  size: number;
  opacity: number;
  duration: number;
}

function Star({ config }: { config: StarConfig }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-STAR_FIELD_H, { duration: config.duration, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(translateY);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: config.x,
          top: config.initialY,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: "#FFFFFF",
          opacity: config.opacity,
        },
        animatedStyle,
      ]}
    />
  );
}

function AppleButton({ onPress, loading, disabled, testID }: { onPress: () => void; loading: boolean; disabled: boolean; testID?: string }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.6 : 1,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={{
          backgroundColor: "#000000",
          borderRadius: borderRadius.md,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
        }}
        testID={testID}
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.96, { duration: 100 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 100 }); }}
        disabled={disabled}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: fontSizes.base, fontWeight: "600" }}>
              Continue with Apple
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState<"apple" | "google" | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const stars = useMemo<StarConfig[]>(() =>
    Array.from({ length: 80 }, (_, i) => {
      const speed = 0.3 + Math.random() * 0.5;
      return {
        id: i,
        x: Math.random() * SCREEN_W,
        initialY: Math.random() * STAR_FIELD_H,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.5,
        duration: (STAR_FIELD_H / (speed * 60)) * 1000,
      };
    }),
  []);

  const handleOAuth = useCallback(async (strategy: "oauth_apple" | "oauth_google") => {
    setLoading(strategy === "oauth_apple" ? "apple" : "google");
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Sign in failed. Please try again.",
      );
      setToastVisible(true);
    } finally {
      setLoading(null);
    }
  }, [startSSOFlow]);

  const handleGuest = useCallback(async () => {
    await AsyncStorage.setItem("veil_guest", "true");
    // Generate a stable guest user ID for Supabase queries within this
    // session.  Cleared automatically when the app is deleted (delete:true
    // wipes AsyncStorage on the simulator).
    const existingId = await AsyncStorage.getItem("veil_guest_id");
    if (!existingId) {
      await AsyncStorage.setItem("veil_guest_id", generateUUID());
    }
    router.replace("/(tabs)");
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Star field — top 40% of screen */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: STAR_FIELD_H,
          overflow: "hidden",
        }}
      >
        {stars.map((s) => (
          <Star key={s.id} config={s} />
        ))}
      </View>

      {/* Main content layout */}
      <View style={{ flex: 1, paddingBottom: insets.bottom + 20 }}>
        {/* Center — title and tagline */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: fontSizes["3xl"],
              letterSpacing: ls.widest,
              textAlign: "center",
              fontWeight: "300",
            }}
          >
            Veil
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.xs,
              textAlign: "center",
              maxWidth: 240,
              marginTop: 12,
              lineHeight: fontSizes.xs * 1.5,
            }}
          >
            A quiet place to reconstruct a dream before it fades.
          </Text>
        </View>

        {/* Bottom — buttons with safe area */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <AppleButton
            testID="btn-apple"
            onPress={() => handleOAuth("oauth_apple")}
            loading={loading === "apple"}
            disabled={loading !== null}
          />

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 20,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                marginHorizontal: 12,
              }}
            >
              or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <VeilButton
            label="Continue with Google"
            testID="btn-google"
            onPress={() => handleOAuth("oauth_google")}
            variant="ghost"
            loading={loading === "google"}
            disabled={loading !== null}
          />

          <Pressable
            testID="btn-guest"
            onPress={handleGuest}
            style={{ alignItems: "center", marginTop: 20 }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Enter as a Guest
            </Text>
          </Pressable>
        </View>
      </View>

      <Toast
        message={toastMessage}
        type="error"
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
