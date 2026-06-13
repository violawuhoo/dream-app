import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  View,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";
import {
  colors,
  fontSizes,
  letterSpacing,
  borderRadius,
} from "../../src/theme/tokens";
import { supabase } from "../../src/lib/supabase";
import { VeilButton } from "../../src/components/ui/VeilButton";
import { VeilCard } from "../../src/components/ui/VeilCard";
import { VeilText } from "../../src/components/ui/VeilText";
import { useOrchestratorContext } from "../../src/lib/OrchestratorContext";
import { consumePendingDreamRecord } from "../../src/lib/pendingDreamRecord";
import { getLocalDreamById, deleteLocalDream } from "../../src/lib/localDreams";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TarotCardData {
  id: number;
  name: string;
  meaning: string;
}

type DreamRow = {
  id: string;
  created_at: string;
  title: string | null;
  narrative: string | null;
  emotions: string[] | null;
  interpretation: string | null;
  life_connection_interpretation: string | null;
  tarot_card: TarotCardData | null;
  tarot_interpretation: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDreamDate(iso: string): string {
  try {
    return format(new Date(iso), "EEEE, d MMM · h:mmaaa");
  } catch {
    return iso;
  }
}

type IconName = "layers-outline" | "pulse-outline" | "infinite-outline";

function parseInterpretation(
  text: string,
): Array<{ text: string; icon: IconName }> {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3); // cap at 3 sections

  return paragraphs.map((paragraph) => {
    const lower = paragraph.toLowerCase();
    if (/jungian|psychological|unconscious|archetype|shadow|anima/.test(lower)) {
      return { text: paragraph, icon: "layers-outline" as IconName };
    }
    if (/life|waking|connection|relationship|real|daily|reflect/.test(lower)) {
      return { text: paragraph, icon: "pulse-outline" as IconName };
    }
    if (/eastern|i.ching|taoism|taoist|energy|flow|balance|yin/.test(lower)) {
      return { text: paragraph, icon: "infinite-outline" as IconName };
    }
    return { text: paragraph, icon: "layers-outline" as IconName };
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: fontSizes.xs,
        letterSpacing: letterSpacing.wide,
        marginBottom: 8,
        textTransform: "uppercase",
      }}
    >
      {label}
    </Text>
  );
}

function SkeletonBar({
  width,
  height = 16,
  style,
}: {
  width: string | number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  // Static (no Reanimated) — infinite animations keep EarlGrey permanently
  // busy, preventing toBeVisible() assertions from ever resolving.
  return (
    <View
      style={[
        {
          width: width as ViewStyle["width"],
          height,
          backgroundColor: colors.surfaceElevated,
          borderRadius: borderRadius.sm,
          opacity: 0.4,
        } satisfies ViewStyle,
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
      <SkeletonBar width="60%" height={28} />
      <SkeletonBar width="40%" height={14} />
      <SkeletonBar width="100%" height={12} style={{ marginTop: 24 }} />
      <SkeletonBar width="100%" height={12} />
      <SkeletonBar width="80%" height={12} />
      <SkeletonBar width="100%" height={80} style={{ marginTop: 24 }} />
      <SkeletonBar width="100%" height={80} />
      <SkeletonBar width="100%" height={80} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function recToDreamRow(rec: any): DreamRow {
  return {
    id: rec.id,
    created_at: rec.created_at ?? "",
    title: rec.title ?? null,
    narrative: rec.narrative ?? null,
    emotions: rec.emotions ?? null,
    interpretation: rec.interpretation ?? null,
    life_connection_interpretation: rec.life_connection_interpretation ?? null,
    tarot_card: rec.tarot_card ? (rec.tarot_card as TarotCardData) : null,
    tarot_interpretation: rec.tarot_interpretation ?? null,
  };
}

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useOrchestratorContext();

  // Keep a ref so the Supabase timeout callback can always read the latest
  // completedRecord even if the initial render beat the context update.
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // seededRef tracks whether we initialised dream from a local source so the
  // useEffect knows to skip (and not fire) any Supabase network requests.
  const seededRef = useRef(false);

  // Use lazy useState so the singleton read (a side-effect) runs exactly once,
  // even if React renders the component multiple times during concurrent mode.
  const [dream, setDream] = useState<DreamRow | null>(() => {
    // consumePendingDreamRecord reads the record written by capture.tsx right
    // before router.replace(), guaranteeing it's available before React context
    // has a chance to propagate the session update.
    const pending = id ? consumePendingDreamRecord(id) : null;
    const rec = pending ?? (session.completedRecord as any);
    const row = rec && rec.id === id ? recToDreamRow(rec) : null;
    seededRef.current = row !== null;
    return row;
  });
  const [loading, setLoading] = useState(() => !seededRef.current);
  const [notFound, setNotFound] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    // When seeded from local data (just after capture), skip the network fetch.
    // Any in-flight network request blocks EarlGrey's idle tracker, causing
    // waitFor().toBeVisible() to time out even when the element is on screen.
    if (seededRef.current) return;

    const ac = new AbortController();
    const FETCH_TIMEOUT = 5000;

    const timeoutId = setTimeout(async () => {
      // Abort the network request so EarlGrey sees the app as idle.
      ac.abort();
      const rec = sessionRef.current.completedRecord as any;
      if (rec && rec.id === id) {
        setDream(recToDreamRow(rec));
        setLoading(false);
      } else {
        // Fall back to local AsyncStorage cache (covers RLS-blocked dreams).
        const localDream = await getLocalDreamById(id!);
        if (localDream) {
          setDream(recToDreamRow(localDream));
        } else {
          setNotFound(true);
        }
        setLoading(false);
      }
    }, FETCH_TIMEOUT);

    supabase.from("dream_records").select("*").eq("id", id).single()
      .abortSignal(ac.signal)
      .then(async ({ data, error }) => {
        clearTimeout(timeoutId);
        if (ac.signal.aborted) return;
        if (error || !data) {
          const rec = sessionRef.current.completedRecord as any;
          if (rec && rec.id === id) {
            setDream(recToDreamRow(rec));
          } else {
            // Fall back to local AsyncStorage cache (covers RLS-blocked dreams).
            const localDream = await getLocalDreamById(id!);
            if (localDream) {
              setDream(recToDreamRow(localDream));
            } else {
              setNotFound(true);
            }
          }
        } else {
          setDream(recToDreamRow(data));
        }
        setLoading(false);
      });

    return () => { clearTimeout(timeoutId); ac.abort(); };
  }, [id]);

  const handleShare = async () => {
    if (!dream) return;
    setSharing(true);
    try {
      const res = await fetch("/api/generate-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dream.title ?? "Dream",
          narrative: dream.narrative ?? "",
          tarotCard: dream.tarot_card ?? null,
          emotions: dream.emotions ?? [],
          date: formatDreamDate(dream.created_at),
        }),
      });
      if (!res.ok) throw new Error("Poster generation failed");
      const arrayBuffer = await res.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );
      const filePath = `${FileSystem.cacheDirectory}veil-dream-poster.png`;
      await FileSystem.writeAsStringAsync(filePath, base64, { encoding: FileSystem.EncodingType.Base64 });
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await MediaLibrary.saveToLibraryAsync(filePath);
      }
      await Sharing.shareAsync(filePath, { mimeType: "image/png" });
    } catch (e) {
      console.error("Share error:", e);
      Alert.alert("Error", "Could not generate share poster.");
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete dream?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Abort the delete after 3 s so no lingering HTTP callback keeps
            // EarlGrey's main-queue tracker busy after navigation.
            const ac = new AbortController();
            const timeout = setTimeout(() => ac.abort(), 3000);
            try {
              await supabase.from("dream_records").delete().eq("id", id!).abortSignal(ac.signal);
            } catch {
              // ignore RLS errors and abort errors
            } finally {
              clearTimeout(timeout);
            }
            // Always remove from local cache too so the archive stays in sync.
            await deleteLocalDream(id!);
            router.replace("/(tabs)/archive");
          },
        },
      ],
    );
  };

  const BOTTOM_BAR_H = 60 + insets.bottom;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
          <Pressable testID="btn-back-dream" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <LoadingSkeleton />
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (notFound || !dream) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
          <Pressable testID="btn-back-dream" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <VeilText variant="body">Dream not found.</VeilText>
          <View style={{ marginTop: 16, width: "100%" }}>
            <VeilButton label="Return home" onPress={() => router.replace("/(tabs)")} variant="primary" />
          </View>
        </View>
      </View>
    );
  }

  // ── Content ──────────────────────────────────────────────────────────────
  const interpretationSections =
    dream.interpretation ? parseInterpretation(dream.interpretation) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Back button */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <Pressable testID="btn-back-dream" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: BOTTOM_BAR_H + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header */}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: fontSizes["2xl"],
            fontWeight: "600",
            marginTop: 8,
            lineHeight: fontSizes["2xl"] * 1.2,
          }}
        >
          {dream.title ?? "Untitled Dream"}
        </Text>

        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.xs,
            marginTop: 6,
          }}
        >
          {formatDreamDate(dream.created_at)}
        </Text>

        {!!dream.emotions?.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {dream.emotions.map((emotion, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: colors.accentSoft,
                  borderRadius: borderRadius.full,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{ color: colors.accent, fontSize: fontSizes.xs }}
                >
                  {emotion}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* 2. Narrative */}
        {!!dream.narrative && (
          <View testID="section-narrative" style={{ marginTop: 28 }}>
            <SectionLabel label="Narrative" />
            <VeilText
              variant="body"
              color={colors.textSecondary}
              style={{ lineHeight: fontSizes.base * 1.8 }}
            >
              {dream.narrative}
            </VeilText>
          </View>
        )}

        {/* 3. Interpretation */}
        {interpretationSections.length > 0 && (
          <View testID="section-interpretation" style={{ marginTop: 28 }}>
            <SectionLabel label="Interpretation" />
            <View style={{ gap: 12 }}>
              {interpretationSections.map((section, i) => (
                <VeilCard key={i}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Ionicons
                      name={section.icon}
                      size={20}
                      color={colors.textMuted}
                      style={{ marginTop: 2 }}
                    />
                    <VeilText
                      variant="body"
                      color={colors.textSecondary}
                      style={{ flex: 1 }}
                    >
                      {section.text}
                    </VeilText>
                  </View>
                </VeilCard>
              ))}
            </View>
          </View>
        )}

        {/* 4. Life Connection */}
        {!!dream.life_connection_interpretation && (
          <View testID="section-life-connection" style={{ marginTop: 28 }}>
            <SectionLabel label="Waking Life" />
            <VeilCard>
              <VeilText variant="body" color={colors.textSecondary}>
                {dream.life_connection_interpretation}
              </VeilText>
            </VeilCard>
          </View>
        )}

        {/* 5. Tarot */}
        {dream.tarot_card != null && (
          <View testID="section-tarot" style={{ marginTop: 28 }}>
            <SectionLabel label="The Oracle" />
            <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
              {/* Small card visual */}
              <View
                style={{
                  width: 72,
                  height: 115,
                  borderRadius: borderRadius.sm,
                  backgroundColor: colors.surfaceElevated,
                  borderWidth: 1.5,
                  borderColor: colors.gold,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    color: colors.gold,
                    fontSize: fontSizes.xs,
                    textAlign: "center",
                    letterSpacing: 0.3,
                  }}
                  numberOfLines={3}
                >
                  {dream.tarot_card.name}
                </Text>
              </View>

              {/* Card name + interpretation */}
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    color: colors.gold,
                    fontSize: fontSizes.base,
                    fontWeight: "500",
                  }}
                >
                  {dream.tarot_card.name}
                </Text>
                {!!dream.tarot_interpretation && (
                  <VeilText variant="body" color={colors.textSecondary}>
                    {dream.tarot_interpretation}
                  </VeilText>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          paddingBottom: insets.bottom,
          paddingHorizontal: 24,
          paddingTop: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          testID="btn-share-dream"
          onPress={handleShare}
          hitSlop={12}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Ionicons name="share-outline" size={24} color={colors.textSecondary} />
          )}
        </Pressable>

        <Pressable testID="archive-tab" onPress={() => router.replace("/(tabs)/archive")} hitSlop={12}>
          <Ionicons name="journal-outline" size={24} color={colors.textSecondary} />
        </Pressable>

        <Pressable testID="btn-delete-dream" onPress={handleDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={24} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );
}
