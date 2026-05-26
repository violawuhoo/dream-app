import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  SectionList,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffectiveUserId } from "../../src/lib/useEffectiveUserId";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
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
import { VeilInput } from "../../src/components/ui/VeilInput";
import { VeilText } from "../../src/components/ui/VeilText";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DreamItem {
  id: string;
  title: string | null;
  created_at: string;
  narrative: string | null;
  emotions: string[] | null;
  tarot_card: Record<string, unknown> | null;
}

interface Section {
  title: string;
  data: DreamItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatItemDate(iso: string): string {
  try {
    return format(new Date(iso), "EEE d MMM · h:mmaaa");
  } catch {
    return iso;
  }
}

function groupByMonth(dreams: DreamItem[]): Section[] {
  const map = new Map<string, DreamItem[]>();
  for (const dream of dreams) {
    const key = format(new Date(dream.created_at), "MMMM yyyy");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(dream);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surfaceElevated,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginVertical: 4,
          gap: 10,
        },
        animStyle,
      ]}
    >
      <View style={{ width: "65%", height: 15, backgroundColor: colors.border, borderRadius: 4 }} />
      <View style={{ width: "40%", height: 11, backgroundColor: colors.border, borderRadius: 4 }} />
      <View style={{ width: "90%", height: 11, backgroundColor: colors.border, borderRadius: 4 }} />
    </Animated.View>
  );
}

// ─── Dream item ───────────────────────────────────────────────────────────────

function DreamRow({
  item,
  onDelete,
}: {
  item: DreamItem;
  onDelete: (id: string) => void;
}) {
  const handleLongPress = () => {
    Alert.alert("Delete dream?", item.title ?? "This dream", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(item.id),
      },
    ]);
  };

  return (
    <VeilCard
      style={{ marginVertical: 4 }}
      onPress={() => router.push(`/dream/${item.id}`)}
    >
      <Pressable onLongPress={handleLongPress}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: fontSizes.base,
            fontWeight: "500",
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {item.title ?? "Untitled Dream"}
        </Text>

        <Text
          style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginBottom: 6 }}
        >
          {formatItemDate(item.created_at)}
        </Text>

        {!!item.narrative && (
          <Text
            style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginBottom: 10 }}
            numberOfLines={1}
          >
            {item.narrative.slice(0, 70)}
          </Text>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {/* First 2 emotion chips */}
          {item.emotions?.slice(0, 2).map((e, i) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.accentSoft,
                borderRadius: borderRadius.full,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: colors.accent, fontSize: fontSizes.xs - 1 }}>
                {e}
              </Text>
            </View>
          ))}

          {/* Gold tarot dot */}
          {item.tarot_card != null && (
            <View style={{ marginLeft: "auto" }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.gold,
                }}
              />
            </View>
          )}
        </View>
      </Pressable>
    </VeilCard>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const effectiveUserId = useEffectiveUserId();

  const [dreams, setDreams] = useState<DreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Search bar animated height
  const searchHeight = useSharedValue(0);
  const searchBarStyle = useAnimatedStyle(() => ({
    height: searchHeight.value,
    overflow: "hidden",
  }));

  const loadDreams = useCallback(async () => {
    if (!effectiveUserId) { setLoading(false); return; }
    const { data } = await supabase
      .from("dream_records")
      .select("id, title, created_at, narrative, emotions, tarot_card")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDreams((data as any[]) ?? []);
    setLoading(false);
  }, [effectiveUserId]);

  // Load on mount
  useEffect(() => { loadDreams(); }, [loadDreams]);

  // Reload on tab focus
  useFocusEffect(
    useCallback(() => { loadDreams(); }, [loadDreams]),
  );

  const toggleSearch = () => {
    const opening = !searchOpen;
    setSearchOpen(opening);
    searchHeight.value = withTiming(opening ? 48 : 0, { duration: 250 });
    if (!opening) setQuery("");
  };

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from("dream_records").delete().eq("id", id);
    setDreams((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Client-side filter
  const filtered = query.trim()
    ? dreams.filter((d) => {
        const q = query.toLowerCase();
        return (
          (d.title ?? "").toLowerCase().includes(q) ||
          (d.narrative ?? "").toLowerCase().includes(q)
        );
      })
    : dreams;

  const sections = groupByMonth(filtered);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: fontSizes.lg,
              fontWeight: "600",
            }}
          >
            Archive
          </Text>
        </View>
        <View style={{ paddingHorizontal: 20, gap: 0 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: fontSizes.lg,
            fontWeight: "600",
          }}
        >
          Archive
        </Text>
        <Pressable testID="btn-search-toggle" onPress={toggleSearch} hitSlop={12}>
          <Ionicons
            name="search-outline"
            size={20}
            color={searchOpen ? colors.accent : colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Animated search bar */}
      <Animated.View style={[searchBarStyle, { paddingHorizontal: 20 }]}>
        <VeilInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your dreams…"
          testID="input-search-archive"
          autoFocus={searchOpen}
        />
      </Animated.View>

      {/* Empty state */}
      {filtered.length === 0 && !loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
            gap: 12,
          }}
        >
          <Ionicons name="moon-outline" size={56} color={colors.textMuted} />
          <VeilText variant="body" color={colors.textMuted}>
            {query ? "No dreams match your search." : "Your dreams will live here."}
          </VeilText>
          {!query && (
            <View style={{ width: "100%", marginTop: 4 }}>
              <VeilButton
                label="Record your first dream"
                testID="btn-record-first-dream"
                onPress={() => router.push("/dream/capture")}
                variant="ghost"
              />
            </View>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DreamRow item={item} onDelete={handleDelete} />
          )}
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                letterSpacing: letterSpacing.wide,
                paddingTop: 24,
                paddingBottom: 8,
                textTransform: "uppercase",
              }}
            >
              {section.title}
            </Text>
          )}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}
