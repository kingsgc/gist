/**
 * Feed — scrollable, localized gist stream.
 * State + topic filters, anon/public posts side by side.
 * Browsing is open; interactions prompt registration.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { Button, Chip, EmptyState } from "@/components/ui";
import { APP_TAGLINE, HOT_TOPICS, NIGERIAN_STATES } from "@/constants/states";
import { colors, font, MAX_CONTENT_WIDTH, spacing } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { Post } from "@/types";

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await api.listPosts({ state: stateFilter, topic: topicFilter });
      setPosts(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load gist. Pull to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stateFilter, topicFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleToggleLike = useCallback(async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: Math.max(0, p.likeCount + (p.likedByMe ? -1 : 1)),
            }
          : p,
      ),
    );
    try {
      const result = await api.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, ...result } : p)),
      );
    } catch {
      // revert silently; next refresh resyncs
    }
  }, []);

  const handleShared = useCallback((postId: string, newCount: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, shareCount: newCount } : p)),
    );
  }, []);

  const requireAuth = useCallback(() => {
    router.push("/auth");
  }, [router]);

  const allTopics = useMemo(() => {
    const seen = new Set<string>(HOT_TOPICS);
    for (const p of posts) {
      if (p.topic) seen.add(p.topic);
    }
    return Array.from(seen);
  }, [posts]);

  const header = useMemo(
    () => (
      <View>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        {!user ? (
          <View style={styles.registerBanner}>
            <Text style={styles.registerText}>
              Read the gist for free. Register to post, like & reply — anonymously if you like.
            </Text>
            <Button label="Register to participate" onPress={requireAuth} small />
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>State</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip
            label="All Naija"
            active={!stateFilter}
            onPress={() => setStateFilter(null)}
          />
          {NIGERIAN_STATES.map((s) => (
            <Chip
              key={s}
              label={s}
              active={stateFilter === s}
              onPress={() => setStateFilter(stateFilter === s ? null : s)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Topics</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="All" active={!topicFilter} onPress={() => setTopicFilter(null)} />
          {allTopics.map((t) => (
            <Chip
              key={t}
              label={`#${t}`}
              active={topicFilter === t}
              onPress={() => setTopicFilter(topicFilter === t ? null : t)}
            />
          ))}
        </ScrollView>
      </View>
    ),
    [user, stateFilter, topicFilter, requireAuth, posts],
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.centered}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            loading ? (
              <EmptyState title="Loading gist…" />
            ) : error ? (
              <EmptyState title="E don happen 😬" subtitle={error} />
            ) : (
              <EmptyState
                title="No gist here yet"
                subtitle="Be the first to drop one for this filter."
              />
            )
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              referralCode={user?.referralCode ?? "GIST"}
              isAuthenticated={Boolean(user)}
              onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } })}
              onToggleLike={handleToggleLike}
              onShared={handleShared}
              onRequireAuth={requireAuth}
            />
          )}
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
  centered: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  tagline: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.text,
    marginBottom: spacing.md,
  },
  registerBanner: {
    backgroundColor: colors.greenSoft,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  registerText: {
    color: colors.greenDark,
    fontSize: font.sizes.sm,
    fontWeight: "600",
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: font.sizes.xs,
    fontWeight: "800",
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  chipRow: {
    paddingBottom: spacing.md,
    paddingRight: spacing.lg,
  },
});
