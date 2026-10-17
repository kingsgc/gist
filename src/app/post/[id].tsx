/**
 * Post detail — the gist + its discussion thread.
 * Replying requires registration; replies can also be anonymous.
 * WhatsApp share loop is available from here too (with screenshot).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { GistShareCard } from "@/components/GistShareCard";
import { PostCard } from "@/components/PostCard";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { colors, font, MAX_CONTENT_WIDTH, spacing } from "@/constants/theme";
import { initials, timeAgo } from "@/lib/format";
import { api } from "@/lib/api";
import { runShareLoop } from "@/lib/share";
import { useAuth } from "@/providers/AuthProvider";
import type { Comment, Post } from "@/types";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [anonReply, setAnonReply] = useState(true);
  const [sending, setSending] = useState(false);
  const shareCardRef = useRef<View>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, c] = await Promise.all([api.getPost(id), api.listComments(id)]);
    setPost(p);
    setComments(c);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const handleToggleLike = useCallback(async (postId: string) => {
    setPost((prev) =>
      prev && prev.id === postId
        ? {
            ...prev,
            likedByMe: !prev.likedByMe,
            likeCount: Math.max(0, prev.likeCount + (prev.likedByMe ? -1 : 1)),
          }
        : prev,
    );
    try {
      const result = await api.toggleLike(postId);
      setPost((prev) => (prev && prev.id === postId ? { ...prev, ...result } : prev));
    } catch {
      // refresh will resync
    }
  }, []);

  const handleShared = useCallback((_postId: string, newCount: number) => {
    setPost((prev) => (prev ? { ...prev, shareCount: newCount } : prev));
  }, []);

  const submitReply = async () => {
    if (!user || !post || !draft.trim()) return;
    setSending(true);
    try {
      const created = await api.createComment(
        { postId: post.id, body: draft, isAnonymous: anonReply },
        user,
      );
      setComments((prev) => [...prev, created]);
      setPost((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev,
      );
      setDraft("");
    } catch {
      // keep draft for retry
    } finally {
      setSending(false);
    }
  };

  const handleShareFromHere = async () => {
    if (!post) return;
    await runShareLoop(shareCardRef, { post, referralCode: user?.referralCode ?? "GIST" }, (count) =>
      handleShared(post.id, count),
    );
  };

  if (!loaded) {
    return <EmptyState title="Loading gist…" />;
  }
  if (!post) {
    return (
      <View style={styles.missing}>
        <EmptyState title="Gist don expire" subtitle="This post no dey exist again." />
        <Button label="Back to feed" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        style={styles.flex}
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <PostCard
              post={post}
              referralCode={user?.referralCode ?? "GIST"}
              isAuthenticated={Boolean(user)}
              onToggleLike={handleToggleLike}
              onShared={handleShared}
              onRequireAuth={() => router.push("/auth")}
            />
            <View style={styles.shareRow}>
              <Button
                label="📤 Share to WhatsApp"
                variant="whatsapp"
                small
                onPress={handleShareFromHere}
              />
            </View>
            <Text style={styles.threadLabel}>
              Discussion · {comments.length} {comments.length === 1 ? "reply" : "replies"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No replies yet" subtitle="Be the first to reply — anon or public." />
        }
        renderItem={({ item }) => <CommentRow comment={item} />}
      />

      <View style={styles.composer}>
        {user ? (
          <>
            <View style={styles.replyAnonRow}>
              <Text style={styles.replyAnonLabel}>
                {anonReply ? "🕵️ Replying anonymously" : `Replying as @${user.handle}`}
              </Text>
              <Switch
                value={anonReply}
                onValueChange={setAnonReply}
                trackColor={{ true: colors.anonymousBg, false: colors.border }}
                thumbColor={anonReply ? colors.anonymousFg : colors.white}
              />
            </View>
            <View style={styles.replyRow}>
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder="Drop your reply…"
                style={styles.replyInput}
                maxLength={300}
                onSubmitEditing={submitReply}
              />
              <Button
                label="Send"
                onPress={submitReply}
                loading={sending}
                disabled={!draft.trim()}
                small
              />
            </View>
          </>
        ) : (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginText}>
              Register to join the discussion — anonymously if you like.
            </Text>
            <Button label="Register" onPress={() => router.push("/auth")} small />
          </View>
        )}
      </View>

      {/* Hidden capture target for the share screenshot */}
      <View style={styles.hiddenCapture} pointerEvents="none">
        <GistShareCard ref={shareCardRef} post={post} />
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <Card style={styles.comment}>
      <View style={styles.commentHeader}>
        <View style={[styles.commentAvatar, comment.isAnonymous && styles.commentAvatarAnon]}>
          <Text style={styles.commentAvatarText}>
            {comment.isAnonymous ? "🕵️" : initials(comment.handle)}
          </Text>
        </View>
        <Text style={styles.commentHandle}>
          {comment.isAnonymous ? "Anonymous" : `@${comment.handle}`}
        </Text>
        <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
      </View>
      <Text style={styles.commentBody}>{comment.body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxWidth: MAX_CONTENT_WIDTH,
    width: "100%",
    alignSelf: "center",
  },
  missing: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  shareRow: {
    marginBottom: spacing.lg,
    alignItems: "flex-start",
  },
  threadLabel: {
    fontSize: font.sizes.xs,
    fontWeight: "800",
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  comment: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 6,
  },
  commentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarAnon: {
    backgroundColor: colors.anonymousBg,
  },
  commentAvatarText: {
    fontSize: font.sizes.sm,
    fontWeight: "800",
    color: colors.primary,
  },
  commentHandle: {
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: colors.text,
    flex: 1,
  },
  commentTime: {
    fontSize: font.sizes.xs,
    color: colors.textFaint,
  },
  commentBody: {
    fontSize: font.sizes.sm,
    lineHeight: 20,
    color: colors.text,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  replyAnonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  replyAnonLabel: {
    fontSize: font.sizes.xs,
    fontWeight: "700",
    color: colors.textMuted,
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  replyInput: {
    flex: 1,
  },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  loginText: {
    flex: 1,
    fontSize: font.sizes.sm,
    color: colors.textMuted,
  },
  hiddenCapture: {
    position: "absolute",
    left: -9999,
    top: 0,
  },
});
