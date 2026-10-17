/**
 * PostCard — the feed workhorse.
 * Shows localized gist with anon/public identity, like/comment/share
 * actions, and hosts the hidden GistShareCard used for screenshot shares.
 */

import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "@/constants/theme";
import { compactCount, initials, timeAgo } from "@/lib/format";
import { runShareLoop } from "@/lib/share";
import type { Post } from "@/types";

import { GistShareCard } from "./GistShareCard";

export interface PostCardProps {
  post: Post;
  referralCode: string;
  onPress?: () => void;
  onToggleLike: (postId: string) => void;
  onShared: (postId: string, newCount: number) => void;
  onRequireAuth: () => void;
  isAuthenticated: boolean;
}

export function PostCard({
  post,
  referralCode,
  onPress,
  onToggleLike,
  onShared,
  onRequireAuth,
  isAuthenticated,
}: PostCardProps) {
  const shareCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleLike = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    onToggleLike(post.id);
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await runShareLoop(shareCardRef, { post, referralCode }, (count) =>
        onShared(post.id, count),
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}>
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            post.isAnonymous && styles.avatarAnon,
          ]}
        >
          <Text style={[styles.avatarText, post.isAnonymous && styles.avatarTextAnon]}>
            {post.isAnonymous ? "🕵️" : initials(post.handle)}
          </Text>
        </View>
        <View style={styles.headerText}>
          <View style={styles.identityRow}>
            <Text style={styles.handle} numberOfLines={1}>
              {post.isAnonymous ? "Anonymous" : `@${post.handle}`}
            </Text>
            {post.isAnonymous ? (
              <View style={styles.anonBadge}>
                <Text style={styles.anonBadgeText}>incognito</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>
            {timeAgo(post.createdAt)}
            {post.state ? ` · ${post.state}` : ""}
            {post.topic ? ` · #${post.topic}` : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.body}>{post.body}</Text>

      <View style={styles.actions}>
        <Action
          icon={post.likedByMe ? "❤️" : "🤍"}
          label={compactCount(post.likeCount)}
          active={post.likedByMe}
          onPress={handleLike}
        />
        <Action
          icon="💬"
          label={compactCount(post.commentCount)}
          onPress={onPress}
        />
        <Action
          icon="📤"
          label={sharing ? "sharing…" : compactCount(post.shareCount)}
          onPress={handleShare}
          whatsapp
        />
      </View>

      {/* Hidden branded card — captured as the screenshot for WhatsApp */}
      <View style={styles.hiddenCapture} pointerEvents="none">
        <GistShareCard ref={shareCardRef} post={post} />
      </View>
    </Pressable>
  );
}

function Action({
  icon,
  label,
  onPress,
  active,
  whatsapp,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  active?: boolean;
  whatsapp?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text
        style={[
          styles.actionLabel,
          active && { color: colors.danger },
          whatsapp && { color: "#128C7E" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarAnon: {
    backgroundColor: colors.anonymousBg,
  },
  avatarText: {
    fontSize: font.sizes.lg,
    fontWeight: "800",
    color: colors.primary,
  },
  avatarTextAnon: {
    fontSize: font.sizes.lg,
  },
  headerText: {
    flex: 1,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  handle: {
    fontWeight: "800",
    fontSize: font.sizes.md,
    color: colors.text,
    flexShrink: 1,
  },
  anonBadge: {
    backgroundColor: colors.anonymousBg,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  anonBadgeText: {
    color: colors.anonymousFg,
    fontSize: font.sizes.xs,
    fontWeight: "700",
  },
  meta: {
    fontSize: font.sizes.xs,
    color: colors.textFaint,
    marginTop: 2,
  },
  body: {
    fontSize: font.sizes.md,
    lineHeight: 22,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionIcon: {
    fontSize: font.sizes.md,
  },
  actionLabel: {
    fontSize: font.sizes.sm,
    fontWeight: "700",
    color: colors.textMuted,
  },
  hiddenCapture: {
    position: "absolute",
    left: -9999,
    top: 0,
  },
});
