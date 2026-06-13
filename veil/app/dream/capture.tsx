import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSizes, borderRadius } from "../../src/theme/tokens";
import { DreamFlowState } from "../../src/lib/dream-model";
import { useOrchestratorContext } from "../../src/lib/OrchestratorContext";
import { setPendingDreamRecord } from "../../src/lib/pendingDreamRecord";
import { VeilText } from "../../src/components/ui/VeilText";
import { VeilButton } from "../../src/components/ui/VeilButton";
import { VeilCard } from "../../src/components/ui/VeilCard";
import { VeilInput } from "../../src/components/ui/VeilInput";
import { LoadingDots } from "../../src/components/ui/LoadingDots";
import { StreamingText } from "../../src/components/ui/StreamingText";
import type { TarotCard as TarotCardData } from "../../src/data/tarot-data";

const STATE_CARD_STATES = [
  DreamFlowState.STRUCTURED,
  DreamFlowState.AWAITING_TAROT_DECISION,
  DreamFlowState.TAROT_INTERPRETING,  // show save card while oracle interpretation streams
  DreamFlowState.DONE,
] as const;

// ─── Tarot overlay constants ──────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = 56;
const CARD_H = 90;
const LARGE_W = 110;
const LARGE_H = 176;
const FAN_RADIUS = 160;
const FAN_CENTER_Y = SCREEN_H - 60;
const FLIP_DELAY_MS = 420;
const FLIP_HALF_MS = 280;
const REVEAL_CARD_CENTER_Y = SCREEN_H * 0.32;
const CONTENT_TOP = REVEAL_CARD_CENTER_Y + LARGE_H / 2 + 16;

type TarotPhase = "fan" | "selected" | "revealed";

// ─── TarotCard ────────────────────────────────────────────────────────────────

interface TarotCardProps {
  index: number;
  fanX: number;
  fanY: number;
  angle: number;
  phase: TarotPhase;
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

// ─── CaptureScreen ────────────────────────────────────────────────────────────

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const {
    session,
    isProcessing,
    handleUserMessage,
    generateInterpretation,
    skipInterpretation,
    saveRecord,
    skipTarot,
    resetSession,
    drawTarot,
  } = useOrchestratorContext();

  const [inputText, setInputText] = useState("");
  const [showExitSheet, setShowExitSheet] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pendingNavigateRef = useRef(false);
  const prevMessageCountRef = useRef(session.messages.length);

  // Tarot overlay state
  const [showTarot, setShowTarot] = useState(false);
  const [tarotPhase, setTarotPhase] = useState<TarotPhase>("fan");
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // When a draft is restored the message count jumps from 0 to N — scroll to
  // the top so the first user message is visible (test 3.8.3).
  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const curr = session.messages.length;
    prevMessageCountRef.current = curr;
    if (prev === 0 && curr > 1) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [session.messages.length]);

  const hasConversationStarted = session.messages.length > 0;
  const isSendEnabled = !isProcessing && (hasConversationStarted || !!inputText.trim());

  const showStateCard = (STATE_CARD_STATES as readonly string[]).includes(session.state);

  // Navigate after saveRecord updates session.completedRecord
  useEffect(() => {
    if (pendingNavigateRef.current && session.completedRecord) {
      pendingNavigateRef.current = false;
      const record = session.completedRecord as { id?: string };
      if (record.id) {
        // Stash the record in a module singleton so [id].tsx can read it
        // synchronously on first render, before React context propagates.
        setPendingDreamRecord(session.completedRecord as Record<string, any>);
        router.replace(`/dream/${record.id}`);
      }
    }
  }, [session.completedRecord]);

  const saveAndNavigate = useCallback(async () => {
    pendingNavigateRef.current = true;
    const success = await saveRecord();
    if (!success) pendingNavigateRef.current = false;
  }, [saveRecord]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isProcessing) return;
    setInputText("");
    handleUserMessage(text);
  }, [inputText, isProcessing, handleUserMessage]);

  const handleExit = useCallback(() => {
    Keyboard.dismiss();
    setShowExitSheet(true);
  }, []);

  const handleDiscard = useCallback(() => {
    Alert.alert(
      "Discard dream?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            resetSession();
            router.replace("/(tabs)");
          },
        },
      ],
    );
  }, [resetSession]);

  // Tarot fan cards — computed once
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

  // Stable ref so handleCardSelect never changes — prevents 22 Pressables from
  // getting new event-handler references on every phase change (which creates
  // persistent main-queue work items that block EarlGrey idleness).
  const tarotPhaseRef = useRef(tarotPhase);
  tarotPhaseRef.current = tarotPhase;

  const handleCardSelect = useCallback(
    (i: number) => {
      if (tarotPhaseRef.current !== "fan") return;
      setSelectedCardIndex(i);
      setTarotPhase("revealed");
    },
    [], // stable — reads phase via ref at call time
  );

  const messages = session.messages as Array<{ role: string; content: string }>;
  const lastIndex = messages.length - 1;
  const lastIsUser = lastIndex >= 0 && messages[lastIndex].role === "user";

  const renderMessage = useCallback(
    ({ item, index }: { item: { role: string; content: string }; index: number }) => {
      const isUser = item.role === "user";
      const isLast = index === lastIndex;

      if (isUser) {
        return (
          <View
            style={{
              alignSelf: "flex-end",
              backgroundColor: colors.accentSoft,
              borderRadius: borderRadius.md,
              paddingHorizontal: 14,
              paddingVertical: 10,
              maxWidth: "78%",
              marginVertical: 4,
            }}
          >
            <VeilText variant="body">{item.content}</VeilText>
          </View>
        );
      }

      return (
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 4,
            maxWidth: "88%",
            marginVertical: 4,
          }}
        >
          {isLast && isProcessing ? (
            <StreamingText text={item.content} />
          ) : (
            <VeilText variant="body" color={colors.textSecondary}>
              {item.content}
            </VeilText>
          )}
        </View>
      );
    },
    [lastIndex, isProcessing],
  );

  const tarotCard = session.tarotCard as TarotCardData | null;
  const tarotInterpretation = (session.tarotInterpretation as string) ?? "";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Veil</Text>
        <Pressable testID="btn-close-capture" onPress={handleExit} style={{ padding: 8 }} accessibilityLabel="Close capture">
          <Ionicons name="close-outline" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, flexGrow: 1, justifyContent: "flex-end" }}
        onContentSizeChange={() => { if (!showTarot) flatListRef.current?.scrollToEnd({ animated: false }); }}
        onLayout={() => { if (!showTarot) flatListRef.current?.scrollToEnd({ animated: false }); }}
        ListFooterComponent={
          isProcessing && lastIsUser ? (
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 4, marginVertical: 4 }}>
              <LoadingDots />
            </View>
          ) : !isProcessing && messages.length > 0 && messages[messages.length - 1]?.content?.includes("went wrong") ? (
            <Pressable
              onPress={() => {
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
                if (lastUserMsg) handleUserMessage(lastUserMsg.content);
              }}
              style={{ alignSelf: "flex-start", paddingHorizontal: 4, marginVertical: 4 }}
            >
              <Text style={{ color: colors.accent, fontSize: 13 }}>Try again</Text>
            </Pressable>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* State card — hidden while tarot overlay is open */}
      {showStateCard && !showTarot && (
        <View style={[{ paddingHorizontal: 16, marginBottom: 8 }]}>
          {session.state === DreamFlowState.STRUCTURED && (
            <VeilCard>
              <VeilText variant="body">Your dream has taken shape.</VeilText>
              <View style={{ marginTop: 12, gap: 8 }}>
                <VeilButton
                  label="Interpret this dream"
                  testID="btn-interpret"
                  onPress={generateInterpretation}
                  variant="primary"
                  loading={isProcessing}
                />
                <VeilButton
                  label="Just save it"
                  testID="btn-skip-interpretation"
                  onPress={skipInterpretation}
                  variant="ghost"
                  disabled={isProcessing}
                />
              </View>
            </VeilCard>
          )}

          {session.state === DreamFlowState.AWAITING_TAROT_DECISION && (
            <VeilCard style={{ borderColor: colors.gold }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Ionicons name="diamond-outline" size={24} color={colors.gold} />
                <VeilText variant="body">Draw a card for final insight</VeilText>
              </View>
              <View style={{ gap: 8 }}>
                <VeilButton
                  label="Draw the Oracle"
                  testID="btn-draw-oracle"
                  onPress={() => {
                    Keyboard.dismiss();
                    drawTarot();
                    setShowTarot(true);
                    setTarotPhase("fan");
                    setSelectedCardIndex(null);
                  }}
                  variant="primary"
                  disabled={isProcessing}
                />
                <VeilButton
                  label="I'm done"
                  testID="btn-skip-tarot"
                  onPress={async () => { skipTarot(); await saveAndNavigate(); }}
                  variant="ghost"
                  disabled={isProcessing}
                />
              </View>
            </VeilCard>
          )}

          {(session.state === DreamFlowState.TAROT_INTERPRETING ||
            session.state === DreamFlowState.DONE) && (
            <VeilCard>
              <VeilText variant="body">Your dream is preserved.</VeilText>
              <View style={{ marginTop: 12, gap: 8 }}>
                <VeilButton
                  label="Save & view"
                  testID="btn-save-view"
                  onPress={saveAndNavigate}
                  variant="primary"
                  loading={isProcessing}
                />
                <VeilButton
                  label="Discard"
                  onPress={handleDiscard}
                  variant="ghost"
                  disabled={isProcessing}
                />
              </View>
            </VeilCard>
          )}
        </View>
      )}

      {/* Exit confirmation sheet — avoids UIAlertController which exposes
          both button container AND child UILabel as two "Exit" accessibility
          elements, causing Detox's by.label("Exit") to fail with "Multiple
          elements found". Using an inline Modal gives us exactly one element
          with accessibilityLabel="Exit". */}
      <Modal
        transparent
        animationType="fade"
        visible={showExitSheet}
        onRequestClose={() => setShowExitSheet(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: borderRadius.lg,
              borderTopRightRadius: borderRadius.lg,
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
              gap: 12,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: fontSizes.base,
                fontWeight: "500",
                textAlign: "center",
              }}
            >
              Leave capture?
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                textAlign: "center",
              }}
            >
              Your draft is saved automatically.
            </Text>
            <Pressable
              accessibilityLabel="Exit"
              onPress={() => {
                setShowExitSheet(false);
                router.back();
              }}
              style={{
                backgroundColor: colors.error,
                borderRadius: borderRadius.md,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: fontSizes.base, fontWeight: "600" }}>
                Exit
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowExitSheet(false)}
              style={{
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.base }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Error toast removed for Detox sync */}

      {/* Input area */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 8,
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <VeilInput
            testID="input-dream"
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your dream…"
            multiline
            onSubmit={handleSend}
          />
        </View>
        <Pressable
          testID="btn-send"
          onPress={handleSend}
          disabled={isProcessing || !inputText.trim()}
          accessibilityState={{ disabled: !isSendEnabled }}
          accessibilityValue={{ text: isSendEnabled ? "enabled" : "disabled" }}
          style={{ paddingBottom: 12 }}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={32}
            color={isProcessing || !inputText.trim() ? colors.textMuted : colors.accent}
          />
        </Pressable>
      </View>

      {/* Tarot overlay — rendered inline (no navigation) in normal document flow
          to avoid position:absolute+transform layout work that keeps EarlGrey
          busy indefinitely. */}
      {showTarot && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            flexDirection: "column",
          }}
        >
          {/* Both sections always mounted with FIXED heights.
              Only opacity changes on phase transition — pure CALayer alpha,
              no layout recalculation, no mount/unmount work items. */}

          {/* Reveal section — invisible until phase="revealed" */}
          <View
            style={{
              height: SCREEN_H - CARD_H - 60,
              paddingHorizontal: 24,
              paddingTop: 60,
              paddingBottom: 16,
              alignItems: "center",
              justifyContent: "center",
              opacity: tarotPhase === "revealed" ? 1 : 0,
            }}
            pointerEvents={tarotPhase === "revealed" ? "box-none" : "none"}
          >
            <Text
              style={{ color: colors.gold, fontSize: fontSizes.xl, textAlign: "center" }}
            >
              {tarotCard?.name ?? ""}
            </Text>
            <View style={{ width: 80, height: 1, backgroundColor: colors.gold, marginVertical: 16 }} />
            <Text
              style={{ color: colors.textSecondary, fontSize: fontSizes.base, textAlign: "center", lineHeight: 22 }}
            >
              {tarotInterpretation}
            </Text>
            <Pressable
              testID="btn-tarot-complete"
              onPress={() => setShowTarot(false)}
              style={{
                marginTop: 32,
                backgroundColor: colors.accent,
                borderRadius: borderRadius.md,
                paddingVertical: 14,
                paddingHorizontal: 24,
                alignItems: "center",
                alignSelf: "stretch",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: fontSizes.base, fontWeight: "600" }}>
                Complete
              </Text>
            </Pressable>
          </View>

          {/* Card row — invisible after a card is selected */}
          <View
            testID="section-tarot"
            style={{
              height: CARD_H + 60,
              paddingBottom: insets.bottom + 8,
              justifyContent: "flex-end",
              opacity: tarotPhase === "fan" ? 1 : 0,
            }}
            pointerEvents={tarotPhase === "fan" ? "auto" : "none"}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}
            >
              {Array.from({ length: 22 }, (_, i) => (
                <Pressable
                  key={i}
                  testID={`tarot-card-${i}`}
                  onPress={() => handleCardSelect(i)}
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    borderRadius: borderRadius.sm,
                    backgroundColor: colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
