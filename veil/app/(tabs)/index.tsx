import { useCallback, useEffect, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, fontSizes, borderRadius } from "../../src/theme/tokens";
import { VeilButton } from "../../src/components/ui/VeilButton";
import { VeilCard } from "../../src/components/ui/VeilCard";
import { useDraftRestore } from "../../src/lib/useDraftRestore";
import { createSession } from "../../src/lib/dream-model";
import { supabase } from "../../src/lib/supabase";

const { height: SCREEN_H } = Dimensions.get("window");

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 0 && hour <= 5) return "What did you dream?";
  if (hour >= 6 && hour <= 11) return "Good morning. A dream to record?";
  return "A space for your dreams.";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  // Minimal local session — satisfies useDraftRestore's interface on the home screen
  const [localSession, setLocalSession] = useState(() => createSession());
  const updateSession = useCallback(
    (updates: Partial<ReturnType<typeof createSession>>) =>
      setLocalSession((prev) => ({ ...prev, ...updates })),
    [],
  );
  const resetSession = useCallback(() => setLocalSession(createSession()), []);

  const { hasDraft, draftAge, restoreDraft, discardDraft } = useDraftRestore({
    session: localSession,
    updateSession,
    resetSession,
  });

  const [latestDream, setLatestDream] = useState<{ id: string; title: string } | null>(null);

  // Orb pulse: scale 1.0 → 1.08 → 1.0 every 4000ms
  const orbScale = useSharedValue(1);
  useEffect(() => {
    orbScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000 }),
        withTiming(1.0, { duration: 2000 }),
      ),
      -1,
      false,
    );
  }, []);

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  // Moon button press animation
  const moonScale = useSharedValue(1);
  const moonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: moonScale.value }],
  }));

  // Load latest dream on mount
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("dream_records")
      .select("id, title")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const row = data?.[0] as { id: string; title: string | null } | undefined;
        if (row) setLatestDream({ id: row.id, title: row.title ?? "Untitled dream" });
      });
  }, [userId]);

  const handleContinueDraft = () => {
    restoreDraft();
    router.push("/dream/capture");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Orb — positioned so its center sits at 55% of screen height */}
      <Animated.View
        style={[
          orbAnimStyle,
          {
            position: "absolute",
            top: SCREEN_H * 0.55 - 140,
            alignSelf: "center",
          },
        ]}
      >
        <BlurView
          intensity={30}
          tint="default"
          style={{ borderRadius: 140, overflow: "hidden" }}
        >
          <View
            style={{
              width: 280,
              height: 280,
              borderRadius: 140,
              backgroundColor: colors.accentSoft,
              opacity: 0.4,
            }}
          />
        </BlurView>
      </Animated.View>

      {/* Main content */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
        }}
      >
        {/* Center zone — greeting, draft card, moon button */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: fontSizes.lg,
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            {getGreeting()}
          </Text>

          {/* Draft card — above moon button */}
          {hasDraft && (
            <VeilCard testID="card-draft" style={{ width: "100%", marginTop: 24 }}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSizes.xs,
                  marginBottom: 12,
                }}
              >
                Unfinished dream · {draftAge === 0 ? "just now" : `${draftAge}h ago`}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <VeilButton label="Continue" testID="btn-continue-draft" onPress={handleContinueDraft} variant="primary" />
                </View>
                <View style={{ flex: 1 }}>
                  <VeilButton label="Start fresh" testID="btn-discard-draft" onPress={discardDraft} variant="ghost" />
                </View>
              </View>
            </VeilCard>
          )}

          {/* Moon button */}
          <Animated.View style={[moonAnimStyle, { marginTop: 48, alignItems: "center" }]}>
            <Pressable
              testID="btn-begin"
              onPress={() => router.push("/dream/capture")}
              onPressIn={() => {
                moonScale.value = withTiming(0.95, { duration: 100 });
              }}
              onPressOut={() => {
                moonScale.value = withTiming(1.0, { duration: 100 });
              }}
              style={{ alignItems: "center" }}
            >
              <Ionicons name="moon-outline" size={52} color={colors.accent} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSizes.xs,
                  marginTop: 8,
                }}
              >
                Begin
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Last dream row — bottom of screen */}
        {latestDream && (
          <Pressable
            onPress={() => router.push(`/dream/${latestDream.id}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              Last dream: {latestDream.title}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
