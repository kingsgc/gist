/**
 * New chat — WhatsApp-style contact picker.
 * The AI assistant sits pinned at the top; below it every registered
 * profile you can start a 1:1 chat with. Starting a chat reuses an
 * existing conversation when one already exists.
 */

import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { EmptyState } from "@/components/ui";
import { chatColors, colors, font, spacing } from "@/constants/theme";
import { AI_PROFILE } from "@/lib/ai";
import { chatApi } from "@/lib/chat-api";
import { useAuth } from "@/providers/AuthProvider";
import type { ChatContact } from "@/types/chat";

export default function NewChatScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let dead = false;
    chatApi
      .listContacts(user)
      .then((rows) => {
        if (!dead) setContacts(rows);
      })
      .catch(() => {
        if (!dead) setContacts([]);
      })
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
    };
  }, [user]);

  const openAiChat = useCallback(async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const id = await chatApi.openAiChat();
      router.replace(`/chat/${id}`);
    } finally {
      setBusy(false);
    }
  }, [user, busy, router]);

  const openContact = useCallback(
    async (peerId: string) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        const id = await chatApi.startDirectChat(peerId);
        router.replace(`/chat/${id}`);
      } finally {
        setBusy(false);
      }
    },
    [user, busy, router],
  );

  if (!user && !authLoading) {
    return (
      <View style={styles.guest}>
        <EmptyState
          title="Sign in first"
          subtitle="You need an account to start chats."
        />
      </View>
    );
  }

  const filtered = contacts.filter((c) =>
    query.trim()
      ? c.handle.toLowerCase().includes(query.trim().toLowerCase())
      : true,
  );

  return (
    <>
      <Stack.Screen options={{ title: "New chat", presentation: "card" }} />
      <View style={styles.flex}>
        {/* pinned AI assistant */}
        <Pressable
          onPress={openAiChat}
          disabled={busy}
          style={({ pressed }) => [
            styles.row,
            pressed && !busy && { backgroundColor: colors.greenSoft },
          ]}
        >
          <View style={[styles.avatar, styles.avatarAi]}>
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <View style={styles.rowMain}>
            <View style={styles.rowTitleLine}>
              <Text style={styles.rowName}>{AI_PROFILE.displayName}</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            </View>
            <Text style={styles.rowSub} numberOfLines={1}>
              {AI_PROFILE.bio}
            </Text>
          </View>
        </Pressable>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search contacts…"
          placeholderTextColor={colors.textFaint}
          style={styles.search}
        />
        <Text style={styles.sectionLabel}>Contacts on Gist</Text>

        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.greenSoft },
              ]}
              onPress={() => openContact(item.id)}
              disabled={busy}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.handle[0] ?? "?").toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowMain}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.handle}
                </Text>
                <Text style={styles.rowSub}>Hey there! I am using Gist.</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? (
              <EmptyState title="Loading contacts…" />
            ) : (
              <EmptyState
                title="No contacts found"
                subtitle="Other registered users will appear here. In demo mode only seeded contacts exist."
              />
            )
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  guest: { flex: 1, justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minHeight: 64,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAi: { backgroundColor: colors.primary },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  rowMain: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowName: {
    fontSize: font.sizes.md + 1,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  rowSub: { fontSize: font.sizes.sm, color: colors.textMuted, marginTop: 1 },
  search: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: chatColors.listSearchBg,
    borderColor: "transparent",
    paddingVertical: 8,
  },
  sectionLabel: {
    marginLeft: spacing.lg,
    marginBottom: spacing.xs,
    fontSize: font.sizes.xs,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  aiBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  aiBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
