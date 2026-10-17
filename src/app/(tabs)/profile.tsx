/**
 * Profile — identity, stats, and the growth engine:
 * your referral code + a one-tap WhatsApp invite blast.
 */

import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Button, Card, EmptyState, Meta } from "@/components/ui";
import { colors, font, MAX_CONTENT_WIDTH, radius, spacing } from "@/constants/theme";
import { initials } from "@/lib/format";
import { openWhatsApp } from "@/lib/share";
import { dataMode } from "@/lib/api";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { Post } from "@/types";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [myPosts, setMyPosts] = useState<Post[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api
        .listPosts()
        .then((rows) =>
          setMyPosts(
            rows.filter((p) => !p.isAnonymous && p.handle === user.handle),
          ),
        )
        .catch(() => setMyPosts([]));
    }, [user]),
  );

  if (!user) {
    return (
      <View style={styles.guest}>
        <Text style={styles.guestEmoji}>🫥</Text>
        <Text style={styles.guestTitle}>You never register</Text>
        <Text style={styles.guestText}>
          Create an account to drop gist, join discussions and get your personal
          invite link for the WhatsApp loop.
        </Text>
        <Button label="Register to participate" onPress={() => router.push("/auth")} />
      </View>
    );
  }

  const totalLikes = myPosts.reduce((sum, p) => sum + p.likeCount, 0);
  const totalShares = myPosts.reduce((sum, p) => sum + p.shareCount, 0);

  const inviteMessage =
    `👋 I dey use Gist — anonymous gist app for Naija. You go see the hottest local banter, and you fit post your own gist without fear.\n\n` +
    `Use my code: ${user.referralCode}\n` +
    `Download: https://gist.app/join/${user.referralCode}`;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.handle)}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.handle}>@{user.handle}</Text>
          <Meta>{user.email}</Meta>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Stat label="Public posts" value={myPosts.length} />
        <Stat label="Likes" value={totalLikes} />
        <Stat label="Shares" value={totalShares} />
      </View>

      <Card style={styles.inviteCard}>
        <Text style={styles.inviteTitle}>🔥 Grow the community</Text>
        <Text style={styles.inviteText}>
          Every gist you share carries your referral code. The more people join
          with your code, the bigger your corner of Naija gets.
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Your invite code</Text>
          <Text style={styles.code}>{user.referralCode}</Text>
        </View>
        <Button
          label="📤 Invite on WhatsApp"
          variant="whatsapp"
          onPress={() => openWhatsApp(inviteMessage)}
        />
      </Card>

      <Text style={styles.sectionLabel}>My public gist</Text>
      {myPosts.length === 0 ? (
        <EmptyState
          title="No public gist yet"
          subtitle="Posts you make as yourself (not anonymous) show up here."
        />
      ) : (
        myPosts.map((p) => (
          <Card key={p.id} style={styles.postItem}>
            <Text style={styles.postBody} numberOfLines={3}>
              {p.body}
            </Text>
            <Meta>
              ❤️ {p.likeCount} · 💬 {p.commentCount} · 📤 {p.shareCount}
            </Meta>
          </Card>
        ))
      )}

      <Meta>
        {dataMode === "demo"
          ? "⚠️ Demo mode — data stays on this device. Add Supabase keys to .env to go live."
          : "🟢 Connected to Supabase"}
      </Meta>

      <Button label="Sign out" variant="danger" onPress={() => logout().then(() => router.replace("/"))} style={styles.signOut} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxWidth: MAX_CONTENT_WIDTH,
    width: "100%",
    alignSelf: "center",
    gap: spacing.md,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.primary,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  handle: {
    fontSize: font.sizes.lg,
    fontWeight: "900",
    color: colors.text,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.primary,
  },
  statLabel: {
    fontSize: font.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  inviteCard: {
    gap: spacing.md,
  },
  inviteTitle: {
    fontSize: font.sizes.lg,
    fontWeight: "900",
    color: colors.text,
  },
  inviteText: {
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
  codeBox: {
    backgroundColor: colors.greenSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: font.sizes.xs,
    color: colors.greenDark,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  code: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.greenDark,
    letterSpacing: 3,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: font.sizes.xs,
    fontWeight: "800",
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  postItem: {
    gap: spacing.sm,
  },
  postBody: {
    fontSize: font.sizes.sm,
    color: colors.text,
    lineHeight: 19,
  },
  signOut: {
    marginTop: spacing.lg,
  },
  guest: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  guestEmoji: { fontSize: 44 },
  guestTitle: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.text,
  },
  guestText: {
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
});
