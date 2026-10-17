/**
 * Deep-link landing — gist://share/<id>?ref=CODE
 *
 * This closes the viral loop: someone taps a WhatsApp share, lands
 * here on the exact post, sees the referral banner, and is nudged to
 * register so the sharer gets attribution.
 */

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { GistShareCard } from "@/components/GistShareCard";
import { Button, Card, EmptyState, Meta } from "@/components/ui";
import { colors, font, MAX_CONTENT_WIDTH, radius, spacing } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { Post } from "@/types";

export default function ShareLandingScreen() {
  const { id, ref: referral } = useLocalSearchParams<{ id: string; ref?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getPost(String(id))
      .then(setPost)
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) return <EmptyState title="Loading gist…" />;

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Card style={styles.banner}>
          <Text style={styles.bannerTitle}>
            🇳🇬 You were invited to Gist{referral ? ` with code ${String(referral)}` : ""}
          </Text>
          <Text style={styles.bannerText}>
            Anonymous gist for Naija. Read everything free — register to drop
            your own.
          </Text>
        </Card>

        {post ? (
          <>
            <View style={styles.cardWrap}>
              <GistShareCard post={post} />
            </View>
            <Meta>
              ❤️ {post.likeCount} · 💬 {post.commentCount} · 📤 {post.shareCount}
            </Meta>
          </>
        ) : (
          <EmptyState title="Gist don expire" subtitle="This post no dey exist again." />
        )}

        {!user ? (
          <Button
            label="Register to join the gist"
            onPress={() => router.push("/auth")}
            style={styles.cta}
          />
        ) : null}
        <Button
          label="Open the full feed"
          variant="ghost"
          onPress={() => router.replace("/")}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxWidth: MAX_CONTENT_WIDTH,
    width: "100%",
    alignSelf: "center",
    gap: spacing.md,
    alignItems: "center",
  },
  banner: {
    width: "100%",
    backgroundColor: colors.greenSoft,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  bannerTitle: {
    fontSize: font.sizes.md,
    fontWeight: "900",
    color: colors.greenDark,
  },
  bannerText: {
    fontSize: font.sizes.sm,
    color: colors.greenDark,
    lineHeight: 19,
  },
  cardWrap: {
    borderRadius: radius.lg,
    overflow: "hidden",
    marginVertical: spacing.sm,
  },
  cta: {
    width: "100%",
    marginTop: spacing.sm,
  },
});
