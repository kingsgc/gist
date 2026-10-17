/**
 * Chat room — WhatsApp-style conversation screen.
 *
 * Warm paper background, green outgoing bubbles right-aligned and white
 * incoming bubbles left, delivery ticks, and an inverted FlatList so
 * new messages land at the bottom with the input bar pinned above the
 * keyboard. Realtime subscriptions keep live sessions with real people
 * (and Gisty AI) in sync.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui";
import { chatColors, colors, font, radius, spacing } from "@/constants/theme";
import { AI_PROFILE } from "@/lib/ai";
import { chatApi } from "@/lib/chat-api";
import { useAuth } from "@/providers/AuthProvider";
import type { ChatConversation, ChatMessage } from "@/types/chat";

/** Small tick row shown at the tail of outgoing bubbles. */
function Ticks({ read }: { read: boolean }) {
  return (
    <View style={styles.tickWrap}>
      <Ionicons
        name="checkmark"
        size={12}
        color={read ? chatColors.tickRead : chatColors.tickSent}
      />
      <Ionicons
        name="checkmark"
        size={12}
        color={read ? chatColors.tickRead : chatColors.tickSent}
        style={{ marginLeft: -7 }}
      />
    </View>
  );
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Two messages on different days -> show a WhatsApp-style divider. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (sameDay) return "Today";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}

export default function ChatRoomScreen() {
  const { id, peerHandle } = useLocalSearchParams<{ id: string; peerHandle?: string }>();
  const chatId = typeof id === "string" ? id : "";
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [conv, setConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!chatId || !user) return;
    let dead = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const [info, rows] = await Promise.all([
          chatApi.getChat(chatId),
          chatApi.listMessages(chatId),
        ]);
        if (dead) return;
        setConv(info);
        setMessages(rows);
        await chatApi.markRead(chatId).catch(() => undefined);
        unsubscribe = chatApi.subscribe(chatId, (m) => {
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not open this chat.",
        );
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
      unsubscribe?.();
    };
  }, [chatId, user, authLoading]);

  const isAi = conv?.isAi ?? false;
  const displayName = useMemo(() => {
    if (isAi) return AI_PROFILE.displayName;
    return (
      (peerHandle as string | undefined) ?? conv?.peerHandle ?? "Chat"
    );
  }, [isAi, peerHandle, conv]);

  const send = useCallback(async () => {
    const body = input.trim();
    if (!body || sending || !user || !conv) return;
    setInput("");
    setSending(true);

    // optimistic bubble
    const tmp: ChatMessage = {
      id: `tmp_${Date.now()}`,
      chatId,
      senderId: user.id,
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tmp]);

    try {
      const real = await chatApi.sendMessage(chatId, body, user);
      setMessages((prev) => prev.map((m) => (m.id === tmp.id ? real : m)));

      if (conv.isAi) {
        setAiTyping(true);
        const reply = await chatApi.aiReply(
          chatId,
          [...messages, real],
          user,
        );
        setMessages((prev) =>
          prev.some((m) => m.id === reply.id) ? prev : [...prev, reply],
        );
        setAiTyping(false);
      }
    } catch (e) {
      // roll back the optimistic bubble on failure
      setMessages((prev) => prev.filter((m) => m.id !== tmp.id));
      setInput(body);
      setError(
        e instanceof Error ? e.message : "Message did not send. Try again.",
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, user, conv, chatId, messages]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);

  // data for the inverted list: newest at index 0
  const invertedData = useMemo(() => [...messages].reverse(), [messages]);

  if (!user && !authLoading) {
    return (
      <View style={styles.guest}>
        <Button label="Register / sign in" onPress={() => router.push("/auth")} />
        <Text style={styles.guestText}>
          Sign in to open your chats.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: displayName,
          headerStyle: { backgroundColor: "#F0F2F5" },
          headerTintColor: colors.text,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.flex}>
          <View style={styles.body}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <FlatList
              ref={listRef}
              data={invertedData}
              inverted
              keyExtractor={(m) => m.id}
              onContentSizeChange={scrollToEnd}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => {
                const mine = user != null && item.senderId === user.id;
                const next = invertedData[index + 1]; // day above in time
                const showDivider =
                  !next || !isSameDay(next.createdAt, item.createdAt);
                return (
                  <View>
                    {showDivider && (
                      <Text style={styles.divider}>
                        {dayLabel(item.createdAt)}
                      </Text>
                    )}
                    <View
                      style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}
                    >
                      {isAi && !mine && (
                        <View style={styles.aiMiniAvatar}>
                          <Ionicons name="sparkles" size={14} color="#fff" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.bubble,
                          mine ? styles.bubbleMine : styles.bubbleTheirs,
                        ]}
                      >
                        {!mine && isAi && (
                          <Text style={styles.bubbleAiName}>
                            {AI_PROFILE.displayName}
                          </Text>
                        )}
                        <Text style={styles.bubbleText}>{item.body}</Text>
                        <View style={styles.bubbleMeta}>
                          <Text style={styles.bubbleTime}>
                            {timeOf(item.createdAt)}
                          </Text>
                          {mine && <Ticks read />}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                loading ? (
                  <Text style={styles.empty}>Loading messages…</Text>
                ) : (
                  <Text style={styles.empty}>
                    {isAi
                      ? `Say hello to ${AI_PROFILE.displayName} 👋`
                      : "No messages yet — say hello 👋"}
                  </Text>
                )
              }
            />

            {aiTyping && (
              <View style={[styles.bubbleRow, { justifyContent: "flex-start", paddingHorizontal: spacing.sm }]}>
                <View style={[styles.bubble, styles.bubbleTheirs]}>
                  <Text style={styles.empty}>Gisty AI is typing…</Text>
                </View>
              </View>
            )}

            <View
              style={[
                styles.inputBar,
                { paddingBottom: Math.max(insets.bottom, spacing.sm) },
              ]}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={isAi ? "Message Gisty AI" : "Message"}
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                multiline
                editable={!sending}
                onSubmitEditing={send}
              />
              <Pressable
                accessibilityRole="button"
                onPress={send}
                disabled={!input.trim() || sending}
                style={[
                  styles.sendBtn,
                  (!input.trim() || sending) && { opacity: 0.5 },
                ]}
              >
                <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flex: 1,
    // keep bubbles on the warm WhatsApp paper
    backgroundColor: chatColors.chatBg,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  divider: {
    alignSelf: "center",
    backgroundColor: "#E1F2E8",
    color: colors.textMuted,
    fontSize: font.sizes.xs - 1,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginVertical: spacing.sm,
    overflow: "hidden",
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 2,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2,
    paddingTop: 6,
    paddingBottom: 4,
    marginBottom: 2,
  },
  bubbleMine: {
    backgroundColor: chatColors.bubbleOut,
    borderTopRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: chatColors.bubbleIn,
    borderTopLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleAiName: {
    fontSize: font.sizes.xs - 1,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 1,
  },
  bubbleText: {
    fontSize: font.sizes.md,
    color: "#111B21",
    lineHeight: 20,
  },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 10,
    color: "#667781",
  },
  tickWrap: { flexDirection: "row" },
  aiMiniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: chatColors.chatBg,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: chatColors.bubbleIn,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: font.sizes.md,
    color: "#111B21",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: chatColors.waGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: font.sizes.sm,
    paddingVertical: spacing.xl,
  },
  error: {
    textAlign: "center",
    color: colors.danger,
    fontSize: font.sizes.sm,
    padding: spacing.sm,
  },
  guest: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  guestText: { color: colors.textMuted, fontSize: font.sizes.sm },
});
