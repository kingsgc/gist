/**
 * Chats — the app's home screen, WhatsApp-style.
 * One row per conversation: avatar, last message, time, unread badge.
 * The built-in AI assistant is pinned at the top. A green FAB opens
 * the new-chat screen. Browsing requires an account (register to
 * participate — same flow as the rest of the app).
 */

import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { Button, EmptyState, Input } from "@/components/ui";
import { chatColors, colors, font, radius, spacing } from "@/constants/theme";
import { initials, timeAgo } from "@/lib/format";
import { AI_PROFILE, isAiConfigured } from "@/lib/ai";
import { dataMode } from "@/lib/api";
import { chatApi } from "@/lib/chat-api";
import { useAuth } from "@/providers/AuthProvider";
import type { ChatConversation } from "@/types/chat";

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [openingAi, setOpeningAi] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setChats(await chatApi.listChats());
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const openAi = useCallback(async () => {
    if (!user || openingAi) return;
    setOpeningAi(true);
    try {
      const id = await chatApi.openAiChat();
      router.push(`/chat/${id}`);
    } catch {
      // RPC hiccup — refresh next focus
    } finally {
      setOpeningAi(false);
    }
  }, [user, openingAi, router]);

  const filtered = chats.filter((c) =>
    query.trim()
      ? c.peerHandle.toLowerCase().includes(query.trim().toLowerCase())
      : true,
  );

  if (!user && !authLoading) {
    return (
      <View style={styles.guest}>
        <EmptyState
          title="Chats need an account"
          subtitle="Register to message your contacts and text Gisty AI, the built-in assistant."
        />
        <Button label="Register / sign in" onPress={() => router.push("/auth")} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* WhatsApp-style header: title + search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats…"
          style={styles.search}
        />
      </View>

      {/* AI assistant pinned row */}
      <Pressable
        onPress={openAi}
        disabled={openingAi}
        style={({ pressed }) => [
          styles.aiRow,
          !openingAi && pressed && { backgroundColor: colors.greenSoft },
        ]}
      >
        <View style={[styles.avatar, styles.avatarAi]}>
          <Ionicons name="sparkles" size={24} color="#fff" />
        </View>
        <View style={styles.rowMain}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowName} numberOfLines={1}>
              {AI_PROFILE.displayName}
            </Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
          <Text style={styles.rowPreview} numberOfLines={1}>
            {AI_PROFILE.bio}
          </Text>
        </View>
        <Text style={styles.rowTime}>—</Text>
      </Pressable>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.greenSoft }]}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials(item.isAi ? "AI" : item.peerHandle)}
              </Text>
            </View>
            <View style={styles.rowMain}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.isAi ? AI_PROFILE.displayName : item.peerHandle}
              </Text>
              <Text style={styles.rowPreview} numberOfLines={1}>
                {item.lastBody ?? "Say hello 👋"}
              </Text>
            </View>
            <View style={styles.rowSide}>
              <Text style={styles.rowTime}>
                {item.lastAt ? timeAgo(item.lastAt) : ""}
              </Text>
              {item.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 96 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <EmptyState title="Loading chats…" />
          ) : (
            <EmptyState
              title="No chats yet"
              subtitle={
                dataMode === "supabase"
                  ? "Tap the green button to start a chat with someone — or text Gisty AI above."
                  : "Demo mode: chats live on this device only. Add real Supabase keys in .env to chat with actual people."
              }
            />
          )
        }
      />

      {/* FAB — new chat */}
      <Pressable
        accessibilityRole="button"
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => user && router.push("/new-chat")}
      >
        <Ionicons name="chatbubbles" size={26} color="#fff" />
      </Pressable>

      <Text style={styles.modeHint}>
        {isAiConfigured
          ? null
          : "Gisty AI is on backup mode — add EXPO_PUBLIC_AI_API_KEY in .env for real answers."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  guest: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  search: {
    backgroundColor: chatColors.listSearchBg,
    borderColor: "transparent",
    paddingVertical: 8,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm + 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    minHeight: 64,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAi: { backgroundColor: colors.primary, borderColor: colors.greenDark },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  rowMain: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowName: {
    fontSize: font.sizes.lg - 1,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  rowPreview: {
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowSide: {
    alignItems: "flex-end",
    gap: 4,
    marginLeft: spacing.xs,
  },
  rowTime: {
    fontSize: font.sizes.xs,
    color: colors.textFaint,
    fontWeight: "600",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  aiBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  aiBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  listContent: { paddingTop: spacing.xs },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: chatColors.waGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modeHint: {
    textAlign: "center",
    fontSize: font.sizes.xs - 1,
    color: colors.textFaint,
    paddingBottom: 6,
  },
});
