import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, fontSizes, borderRadius } from "../../src/theme/tokens";
import { DreamFlowState } from "../../src/lib/dream-model";
import { useOrchestratorContext } from "../../src/lib/OrchestratorContext";
import { VeilText } from "../../src/components/ui/VeilText";
import { VeilButton } from "../../src/components/ui/VeilButton";
import { VeilCard } from "../../src/components/ui/VeilCard";
import { VeilInput } from "../../src/components/ui/VeilInput";
import { LoadingDots } from "../../src/components/ui/LoadingDots";
import { StreamingText } from "../../src/components/ui/StreamingText";

const STATE_CARD_STATES = [
  DreamFlowState.STRUCTURED,
  DreamFlowState.AWAITING_TAROT_DECISION,
  DreamFlowState.DONE,
] as const;

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
  } = useOrchestratorContext();

  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const pendingNavigateRef = useRef(false);

  // State card slide-in animation
  const cardTranslateY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);

  const showStateCard = (STATE_CARD_STATES as readonly string[]).includes(session.state);

  useEffect(() => {
    if (showStateCard) {
      cardTranslateY.value = 40;
      cardOpacity.value = 0;
      cardTranslateY.value = withTiming(0, { duration: 350 });
      cardOpacity.value = withTiming(1, { duration: 350 });
    } else {
      cardTranslateY.value = 40;
      cardOpacity.value = 0;
    }
  }, [session.state]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  // Navigate after saveRecord updates session.completedRecord
  useEffect(() => {
    if (pendingNavigateRef.current && session.completedRecord) {
      pendingNavigateRef.current = false;
      const record = session.completedRecord as { id?: string };
      if (record.id) router.replace(`/dream/${record.id}`);
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
    Alert.alert("Exit?", "Your draft is saved automatically.", [
      { text: "Cancel", style: "cancel" },
      { text: "Exit", style: "destructive", onPress: () => router.back() },
    ]);
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

  // Message list helpers
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
        <Pressable onPress={handleExit} hitSlop={12}>
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
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          isProcessing && lastIsUser ? (
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 4, marginVertical: 4 }}>
              <LoadingDots />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* State card */}
      {showStateCard && (
        <Animated.View style={[cardAnimStyle, { paddingHorizontal: 16, marginBottom: 8 }]}>
          {session.state === DreamFlowState.STRUCTURED && (
            <VeilCard>
              <VeilText variant="body">Your dream has taken shape.</VeilText>
              <View style={{ marginTop: 12, gap: 8 }}>
                <VeilButton
                  label="Interpret this dream"
                  onPress={generateInterpretation}
                  variant="primary"
                  loading={isProcessing}
                />
                <VeilButton
                  label="Just save it"
                  onPress={async () => { skipInterpretation(); await saveAndNavigate(); }}
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
                  onPress={() => router.push("/dream/tarot")}
                  variant="primary"
                  disabled={isProcessing}
                />
                <VeilButton
                  label="I'm done"
                  onPress={async () => { skipTarot(); await saveAndNavigate(); }}
                  variant="ghost"
                  disabled={isProcessing}
                />
              </View>
            </VeilCard>
          )}

          {session.state === DreamFlowState.DONE && (
            <VeilCard>
              <VeilText variant="body">Your dream is preserved.</VeilText>
              <View style={{ marginTop: 12, gap: 8 }}>
                <VeilButton
                  label="Save & view"
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
        </Animated.View>
      )}

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
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your dream…"
            multiline
            onSubmit={handleSend}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={isProcessing || !inputText.trim()}
          style={{ paddingBottom: 12 }}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={32}
            color={isProcessing || !inputText.trim() ? colors.textMuted : colors.accent}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
