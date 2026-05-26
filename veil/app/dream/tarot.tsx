import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, fontSizes, borderRadius } from "../../src/theme/tokens";
import { useOrchestratorContext } from "../../src/lib/OrchestratorContext";
import { StreamingText } from "../../src/components/ui/StreamingText";
import { VeilButton } from "../../src/components/ui/VeilButton";
import type { TarotCard as TarotCardData } from "../../src/data/tarot-data";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const CARD_W = 56;
const CARD_H = 90;
const LARGE_W = 110;
const LARGE_H = 176;
const CARD_SCALE = LARGE_W / CARD_W; // ≈ 1.964
const FAN_RADIUS = 280;
const FAN_CENTER_Y = SCREEN_H - 60;
const ENTRY_STAGGER = 25;
const ENTRY_DURATION = 400;
const ALL_ENTERED_MS = 22 * ENTRY_STAGGER + ENTRY_DURATION + 1500; // delay before float
const FLIP_DELAY_MS = 420;
const FLIP_HALF_MS = 280;
const REVEAL_CARD_CENTER_Y = SCREEN_H * 0.32;
const CONTENT_TOP = REVEAL_CARD_CENTER_Y + LARGE_H / 2 + 16;

type Phase = "fan" | "selected" | "revealed";

// ─── TarotCard ───────────────────────────────────────────────────────────────

interface TarotCardProps {
  index: number;
  fanX: number;
  fanY: number;
  angle: number;
  floatPhase: number;
  phase: Phase;
  isSelected: boolean;
  onSelect: () => void;
  tarotCard: TarotCardData | null;
}

const TarotCard = memo(function TarotCard({
  index,
  fanX,
  fanY,
  angle,
  floatPhase,
  phase,
  isSelected,
  onSelect,
  tarotCard,
}: TarotCardProps) {
  // Entry: card slides up from below screen to fan position
  const entryY = useSharedValue(SCREEN_H);
  // Float bob
  const floatY = useSharedValue(0);
  // Exit (non-selected cards)
  const exitOpacity = useSharedValue(1);
  const exitTranslateY = useSharedValue(0);
  // Centering + scale (selected card)
  const moveX = useSharedValue(0);
  const moveY = useSharedValue(0);
  const fanRot = useSharedValue(angle);
  const scl = useSharedValue(1);
  // Flip
  const flipAngle = useSharedValue(0);
  // Reveal slide
  const revealY = useSharedValue(0);

  const [showFaceUp, setShowFaceUp] = useState(false);

  // Whether the float animation should still run
  const floatAllowed = useRef(true);

  // ── Entry ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      entryY.value = withTiming(0, { duration: ENTRY_DURATION });
    }, index * ENTRY_STAGGER);
    return () => clearTimeout(t);
  }, []);

  // ── Float ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const phaseOffsetMs = (floatPhase / (2 * Math.PI)) * 3000;
    const t = setTimeout(() => {
      if (!floatAllowed.current) return;
      floatY.value = withRepeat(
        withSequence(
          withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }, ALL_ENTERED_MS + phaseOffsetMs);
    return () => clearTimeout(t);
  }, []);

  // ── Phase transitions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "selected") {
      floatAllowed.current = false;
      floatY.value = withTiming(0, { duration: 150 });

      if (!isSelected) {
        // Other cards exit
        exitOpacity.value = withTiming(0, { duration: 300 });
        exitTranslateY.value = withTiming(60, { duration: 300 });
      } else {
        // Spring to screen center
        moveX.value = withSpring(SCREEN_W / 2 - fanX, { damping: 15, stiffness: 150 });
        moveY.value = withSpring(SCREEN_H / 2 - fanY, { damping: 15, stiffness: 150 });
        fanRot.value = withTiming(0, { duration: 400 });
        scl.value = withTiming(CARD_SCALE, { duration: 400 });

        // Flip: ease-in to 90° → swap face → ease-out to 0°
        const t = setTimeout(() => {
          flipAngle.value = withTiming(
            90,
            { duration: FLIP_HALF_MS, easing: Easing.in(Easing.ease) },
            (finished) => {
              if (finished) {
                runOnJS(setShowFaceUp)(true);
                flipAngle.value = withTiming(0, {
                  duration: FLIP_HALF_MS,
                  easing: Easing.out(Easing.ease),
                });
              }
            },
          );
        }, FLIP_DELAY_MS);

        return () => clearTimeout(t);
      }
    } else if (phase === "revealed" && isSelected) {
      // Slide card to top 32% of screen
      revealY.value = withTiming(REVEAL_CARD_CENTER_Y - SCREEN_H / 2, { duration: 500 });
    }
  }, [phase]);

  const outerStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [
      { translateX: moveX.value },
      {
        translateY:
          entryY.value +
          floatY.value +
          exitTranslateY.value +
          moveY.value +
          revealY.value,
      },
      { rotateZ: `${fanRot.value}deg` },
      { scale: scl.value },
    ],
  }));

  const flipStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${flipAngle.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: fanX - CARD_W / 2,
          top: fanY - CARD_H / 2,
        },
        outerStyle,
      ]}
    >
      <Pressable testID={`tarot-card-${index}`} onPress={phase === "fan" ? onSelect : undefined}>
        <Animated.View style={flipStyle}>
          {showFaceUp ? (
            <View
              style={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: borderRadius.sm,
                backgroundColor: colors.surfaceElevated,
                borderWidth: 1.5,
                borderColor: colors.gold,
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
              }}
            >
              <Text
                style={{
                  color: colors.gold,
                  fontSize: 7,
                  textAlign: "center",
                  letterSpacing: 0.3,
                }}
                numberOfLines={2}
              >
                {tarotCard?.name ?? ""}
              </Text>
              {tarotCard != null && (
                <Text
                  style={{ color: colors.textMuted, fontSize: 6, marginTop: 2 }}
                >
                  {tarotCard.id}
                </Text>
              )}
            </View>
          ) : (
            <View
              style={{
                width: CARD_W,
                height: CARD_H,
                borderRadius: borderRadius.sm,
                backgroundColor: colors.surfaceElevated,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ─── TarotScreen ─────────────────────────────────────────────────────────────

export default function TarotScreen() {
  const insets = useSafeAreaInsets();
  const { session, drawTarot } = useOrchestratorContext();

  const [phase, setPhase] = useState<Phase>("fan");
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [streamingComplete, setStreamingComplete] = useState(false);

  const revealContentOpacity = useSharedValue(0);
  const revealContentStyle = useAnimatedStyle(() => ({
    opacity: revealContentOpacity.value,
  }));

  // Call drawTarot once on mount
  useEffect(() => {
    drawTarot();
  }, []);

  // Fade in reveal content when phase becomes 'revealed'
  useEffect(() => {
    if (phase === "revealed") {
      setTimeout(() => {
        revealContentOpacity.value = withTiming(1, { duration: 300 });
      }, 200);
    }
  }, [phase]);

  // Fan card configs — computed once
  const fanCards = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = -50 + i * (100 / 21);
        const rad = (angle * Math.PI) / 180;
        return {
          index: i,
          angle,
          fanX: SCREEN_W / 2 + FAN_RADIUS * Math.sin(rad),
          fanY: FAN_CENTER_Y - FAN_RADIUS * Math.cos(rad),
          floatPhase: Math.random() * 2 * Math.PI,
        };
      }),
    [],
  );

  const handleCardSelect = (i: number) => {
    if (phase !== "fan") return;
    setSelectedCardIndex(i);
    setPhase("selected");

    // Switch to revealed after centering + flip completes
    const revealTimer = setTimeout(() => {
      setPhase("revealed");
    }, FLIP_DELAY_MS + FLIP_HALF_MS * 2 + 100);

    return () => clearTimeout(revealTimer);
  };

  const tarotCard = session.tarotCard as TarotCardData | null;
  const tarotInterpretation = (session.tarotInterpretation as string) ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Fan of 22 cards */}
      <View testID="section-tarot" style={{ flex: 1 }}>
        {fanCards.map((card) => (
          <TarotCard
            key={card.index}
            {...card}
            phase={phase}
            isSelected={selectedCardIndex === card.index}
            onSelect={() => handleCardSelect(card.index)}
            tarotCard={selectedCardIndex === card.index ? tarotCard : null}
          />
        ))}
      </View>

      {/* Reveal content — appears after card slides to top 32% */}
      {phase === "revealed" && (
        <Animated.View
          style={[
            revealContentStyle,
            {
              position: "absolute",
              top: CONTENT_TOP,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 32,
              alignItems: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                color: colors.gold,
                fontSize: fontSizes.xl,
                textAlign: "center",
              }}
            >
              {tarotCard?.name ?? ""}
            </Text>

            <View
              style={{
                width: 80,
                height: 1,
                backgroundColor: colors.gold,
                marginVertical: 16,
              }}
            />

            <StreamingText
              text={tarotInterpretation}
              onComplete={() => setStreamingComplete(true)}
            />

            {streamingComplete && (
              <View style={{ marginTop: 32, width: "100%" }}>
                <VeilButton
                  label="Complete"
                  testID="btn-tarot-complete"
                  onPress={() => router.back()}
                  variant="primary"
                />
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}
