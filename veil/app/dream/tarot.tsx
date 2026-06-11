import React, { memo, useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
const FAN_RADIUS = 280;
const FAN_CENTER_Y = SCREEN_H - 60;
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
  phase,
  isSelected,
  onSelect,
  tarotCard,
}: TarotCardProps) {
  const [showFaceUp, setShowFaceUp] = useState(false);

  useEffect(() => {
    if (phase === "selected" && isSelected) {
      const t = setTimeout(() => setShowFaceUp(true), FLIP_DELAY_MS + FLIP_HALF_MS);
      return () => clearTimeout(t);
    }
  }, [phase, isSelected]);

  if (phase !== "fan" && !isSelected) return null;

  const isRevealed = phase === "revealed" && isSelected;
  const left = isRevealed ? SCREEN_W / 2 - LARGE_W / 2 : fanX - CARD_W / 2;
  const top = isRevealed ? REVEAL_CARD_CENTER_Y - LARGE_H / 2 : fanY - CARD_H / 2;
  const width = isRevealed || (phase === "selected" && isSelected) ? LARGE_W : CARD_W;
  const height = isRevealed || (phase === "selected" && isSelected) ? LARGE_H : CARD_H;

  return (
    <View
      style={{
        position: "absolute",
        left,
        top,
        transform: phase === "fan" ? [{ rotate: `${angle}deg` }] : [],
      }}
    >
      <Pressable testID={`tarot-card-${index}`} onPress={phase === "fan" ? onSelect : undefined}>
        {showFaceUp ? (
          <View
            style={{
              width,
              height,
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
              <Text style={{ color: colors.textMuted, fontSize: 6, marginTop: 2 }}>
                {tarotCard.id}
              </Text>
            )}
          </View>
        ) : (
          <View
            style={{
              width,
              height,
              borderRadius: borderRadius.sm,
              backgroundColor: colors.surfaceElevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        )}
      </Pressable>
    </View>
  );
});

// ─── TarotScreen ─────────────────────────────────────────────────────────────

export default function TarotScreen() {
  const insets = useSafeAreaInsets();
  const { session, drawTarot } = useOrchestratorContext();

  const [phase, setPhase] = useState<Phase>("fan");
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [streamingComplete, setStreamingComplete] = useState(false);

  // Call drawTarot once on mount
  useEffect(() => {
    drawTarot();
  }, []);

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

      {/* Reveal content — appears after card is revealed */}
      {phase === "revealed" && (
        <View
          style={{
            position: "absolute",
            top: CONTENT_TOP,
            left: 0,
            right: 0,
            bottom: 0,
          }}
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
        </View>
      )}
    </View>
  );
}
