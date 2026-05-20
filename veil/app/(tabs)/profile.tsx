import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors, fontSizes, borderRadius } from "../../src/theme/tokens";
import { supabase } from "../../src/lib/supabase";
import { VeilButton } from "../../src/components/ui/VeilButton";
import { VeilCard } from "../../src/components/ui/VeilCard";
import { VeilText } from "../../src/components/ui/VeilText";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number;
  thisMonth: number;
  withTarot: number;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <VeilCard style={{ flex: 1, alignItems: "center", paddingVertical: 16 }}>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: fontSizes["2xl"],
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.xs,
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </VeilCard>
  );
}

function SettingsRow({
  label,
  right,
  onPress,
  isLast = false,
}: {
  label: string;
  right: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: fontSizes.base }}>
        {label}
      </Text>
      {right}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userId, signOut } = useAuth();
  const { user } = useUser();

  const [stats, setStats] = useState<Stats>({ total: 0, thisMonth: 0, withTarot: 0 });
  const [isGuest, setIsGuest] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load stats and guest flag on mount
  useEffect(() => {
    AsyncStorage.getItem("veil_guest").then((val) => setIsGuest(val === "true"));
  }, []);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("dream_records")
      .select("created_at, tarot_card")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!data) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = data as any[];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setStats({
          total: rows.length,
          thisMonth: rows.filter((r) => new Date(r.created_at) >= monthStart).length,
          withTarot: rows.filter((r) => r.tarot_card != null).length,
        });
      });
  }, [userId]);

  const handleSignOut = useCallback(async () => {
    await AsyncStorage.removeItem("veil_guest");
    await signOut();
    router.replace("/(auth)/sign-in");
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This will permanently delete all your dreams.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (userId) {
              await supabase.from("dream_records").delete().eq("user_id", userId);
            }
            try {
              await user?.delete();
            } catch {
              // Guest or already deleted
            }
            await AsyncStorage.removeItem("veil_guest");
            router.replace("/(auth)/sign-in");
          },
        },
      ],
    );
  }, [userId, user]);

  const handleExport = useCallback(async () => {
    if (!userId) return;
    setExporting(true);
    try {
      const { data } = await supabase
        .from("dream_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const json = JSON.stringify(data ?? [], null, 2);
      const file = new FileSystem.File(FileSystem.Paths.cache, "veil-dreams.json");
      file.write(json);
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Export your dreams",
      });
    } catch (err) {
      Alert.alert("Export failed", "Could not export your dreams.");
    } finally {
      setExporting(false);
    }
  }, [userId]);

  // Derived display values
  const displayName = user?.fullName ?? user?.firstName ?? (isGuest ? "Guest" : "Dreamer");
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? (isGuest ? "No account" : "");
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarUrl = user?.imageUrl ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. User header */}
        <View
          style={{
            paddingTop: insets.top + 24,
            paddingBottom: 24,
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontSize: fontSizes.lg,
                  fontWeight: "600",
                }}
              >
                {avatarLetter}
              </Text>
            </View>
          )}

          <Text
            style={{
              color: colors.textPrimary,
              fontSize: fontSizes.lg,
              fontWeight: "600",
              marginTop: 12,
            }}
          >
            {displayName}
          </Text>

          {!!displayEmail && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                marginTop: 4,
              }}
            >
              {displayEmail}
            </Text>
          )}

          {isGuest && (
            <View style={{ marginTop: 16, width: "100%" }}>
              <VeilButton
                label="Create Account"
                onPress={() => router.replace("/(auth)/sign-in")}
                variant="primary"
              />
            </View>
          )}
        </View>

        {/* 2. Stats row */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
          <StatCard value={stats.total} label="dreams" />
          <StatCard value={stats.thisMonth} label="this month" />
          <StatCard value={stats.withTarot} label="with oracle" />
        </View>

        {/* 3. Settings */}
        <VeilCard style={{ paddingHorizontal: 16, paddingVertical: 0 }}>
          {/* DEFERRED: push notifications not yet implemented */}
          <SettingsRow
            label="Notifications"
            right={
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Coming soon
              </Text>
            }
          />
          <SettingsRow
            label="Privacy Policy"
            right={
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            }
            onPress={() => Linking.openURL("https://your-privacy-policy-url")}
          />
          <SettingsRow
            label="Export dreams"
            right={
              exporting ? (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  Exporting…
                </Text>
              ) : (
                <Ionicons name="download-outline" size={18} color={colors.textMuted} />
              )
            }
            onPress={handleExport}
            isLast
          />
        </VeilCard>

        {/* 4. Account */}
        <View style={{ marginTop: 32 }}>
          <VeilButton label="Sign out" onPress={handleSignOut} variant="ghost" />
          <Pressable onPress={handleDeleteAccount} style={{ marginTop: 20, alignItems: "center" }}>
            <Text style={{ color: colors.error, fontSize: fontSizes.xs }}>
              Delete account
            </Text>
          </Pressable>
        </View>

        {/* 5. Footer */}
        <View style={{ marginTop: 40, alignItems: "center", gap: 6 }}>
          <VeilText variant="caption" color={colors.textMuted}>
            Veil · v1.0.0
          </VeilText>
          <VeilText
            variant="caption"
            color={colors.textMuted}
            style={{ textAlign: "center" }}
          >
            Dreams are personal echoes. Veil provides reflections, not diagnoses.
          </VeilText>
        </View>
      </ScrollView>
    </View>
  );
}
