/**
 * GistShareCard — branded, screenshot-ready card rendered offscreen
 * inside PostCard. Captured by react-native-view-shot and dropped
 * into WhatsApp via the native share sheet.
 */

import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "@/constants/theme";
import type { Post } from "@/types";

interface Props {
  post: Post;
}

export const GistShareCard = forwardRef<View, Props>(function GistShareCard(
  { post },
  ref,
) {
  const who = post.isAnonymous ? "Anonymous" : `@${post.handle}`;
  const where = post.state ? ` · ${post.state}` : "";

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <View style={styles.brandRow}>
        <View style={styles.logoDot}>
          <Text style={styles.logoText}>G</Text>
        </View>
        <Text style={styles.brand}>GIST</Text>
        <Text style={styles.flag}>🇳🇬</Text>
      </View>

      <Text style={styles.identity}>
        {who}
        <Text style={styles.where}>{where}</Text>
      </Text>

      <Text style={styles.body} numberOfLines={6}>
        {post.body}
      </Text>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>💬 {post.commentCount}</Text>
        <Text style={styles.stat}>❤️ {post.likeCount}</Text>
        <Text style={styles.stat}>📤 {post.shareCount}</Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>Drop your own gist — anonymously 👉 Gist app</Text>
      </View>
    </View>
  );
});

const CARD_WIDTH = 340;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.green,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: font.sizes.md,
  },
  brand: {
    color: colors.white,
    fontWeight: "900",
    fontSize: font.sizes.lg,
    letterSpacing: 3,
  },
  flag: {
    fontSize: font.sizes.md,
    marginLeft: spacing.xs,
  },
  identity: {
    color: colors.white,
    fontWeight: "800",
    fontSize: font.sizes.md,
    marginBottom: spacing.sm,
  },
  where: {
    color: colors.mist,
    fontWeight: "600",
  },
  body: {
    color: colors.white,
    fontSize: font.sizes.md,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: {
    color: colors.mist,
    fontSize: font.sizes.sm,
    fontWeight: "700",
  },
  cta: {
    borderTopWidth: 1,
    borderTopColor: colors.greenDark,
    paddingTop: spacing.md,
  },
  ctaText: {
    color: colors.amber,
    fontWeight: "800",
    fontSize: font.sizes.sm,
  },
});
