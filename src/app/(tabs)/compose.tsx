/**
 * Compose — drop a new gist.
 *
 * Upgrades over v1:
 *  • Searchable state picker (modal, not a 37-chip scroll) with a
 *    "Nationwide" option.
 *  • Custom hashtag creation — the presets are suggestions; you can type
 *    your own #tag and it becomes a first-class topic.
 *  • Branded processing popup while the gist is saving.
 *  • Real error messages (no more "gist no go send. try again.").
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { Button, Chip, Input } from "@/components/ui";
import { StatePickerModal } from "@/components/StatePickerModal";
import { HOT_TOPICS } from "@/constants/states";
import { colors, font, MAX_CONTENT_WIDTH, radius, spacing } from "@/constants/theme";
import { api, dataMode } from "@/lib/api";
import { toError } from "@/lib/errors";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";
import { useAuth } from "@/providers/AuthProvider";

const MAX_LEN = 500;
const MAX_TOPIC_LEN = 24;

/** "sanitize: lowercase, drop everything except letters/digits/underscore/hyphen, trim" */
function sanitizeTopic(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "")
    .replace(/[-_]{2,}/g, "-")
    .slice(0, MAX_TOPIC_LEN);
}

export default function ComposeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [state, setState] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(() => MAX_LEN - body.length, [body.length]);
  const customTopic = sanitizeTopic(topicDraft);
  const canPost = body.trim().length > 0 && remaining >= 0 && Boolean(user);

  const submit = async () => {
    if (!canPost || !user) return;
    setPosting(true);
    setError(null);
    try {
      const created = await api.createPost(
        { body, isAnonymous, state, topic },
        user,
      );
      setBody("");
      router.navigate("/");
    } catch (e) {
      setError(toError(e, "Gist no go send. Try again.").message);
    } finally {
      setPosting(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardEmoji}>🫥</Text>
        <Text style={styles.guardTitle}>Register to participate</Text>
        <Text style={styles.guardText}>
          Anonymous or not, you need an account to drop gist. It takes 20 seconds —
          your identity stays hidden if you choose.
        </Text>
        <Button label="Register now" onPress={() => router.replace("/auth")} />
        <Button label="Back to feed" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identityBox}>
          <View style={styles.identityRow}>
            <Text style={styles.identityLabel}>
              {isAnonymous ? "🕵️ Posting as Anonymous" : `Posting as @${user.handle}`}
            </Text>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ true: colors.anonymousBg, false: colors.border }}
              thumbColor={isAnonymous ? colors.anonymousFg : colors.white}
            />
          </View>
          <Text style={styles.identityHint}>
            {isAnonymous
              ? "Nobody — not even us — can link this gist to your account. Only you can delete it."
              : "This gist will carry your public handle. Switch on for full incognito."}
          </Text>
        </View>

        <Input
          multiline
          maxLength={MAX_LEN}
          value={body}
          onChangeText={setBody}
          placeholder="Wetin dey happen? Drop the gist…"
          style={styles.textarea}
        />
        <Text style={[styles.counter, remaining < 30 && styles.counterWarn]}>
          {remaining} left
        </Text>

        <SectionLabel>Where's the gist from? (state)</SectionLabel>
        <Button
          label={state ? `📍 ${state}` : "Pick a state"}
          onPress={() => setModalVisible(true)}
          small
        />

        <SectionLabel>Topic (optional)</SectionLabel>
        <View style={styles.topicRow}>
          <Text style={styles.topicLabel}>
            {topic ? `#${topic}` : "Your tag"}
          </Text>
          <Input
            value={topicDraft}
            onChangeText={setTopicDraft}
            placeholder="e.g. naija-traffic — type your own"
            maxLength={MAX_TOPIC_LEN}
            editable={!posting}
            style={styles.topicInput}
          />
          {customTopic.length > 0 ? (
            <Button
              label="Use"
              small
              onPress={() => setTopic(customTopic)}
            />
          ) : (
            <Button
              label="Create"
              small
              onPress={() => setTopic(customTopic)}
              disabled={customTopic.length === 0}
            />
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="None" active={!topic} onPress={() => setTopic(null)} />
          {HOT_TOPICS.map((t) => (
            <Chip
              key={t}
              label={`#${t}`}
              active={topic === t}
              onPress={() => setTopic(t)}
            />
          ))}
        </ScrollView>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <Button
          label={isAnonymous ? "Send anonymously" : "Post gist"}
          onPress={submit}
          disabled={!canPost}
          loading={posting}
          style={styles.submit}
        />
      </ScrollView>

      <ProcessingOverlay
        visible={posting}
        title="Saving your gist…"
        subtitle="It's on the way to the feed."
      />

      <StatePickerModal
        visible={modalVisible}
        value={state}
        onChange={setState}
      />
    </KeyboardAvoidingView>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

const ErrorText = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.error}>{children}</Text>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxWidth: MAX_CONTENT_WIDTH,
    width: "100%",
    alignSelf: "center",
    gap: spacing.sm,
  },
  identityBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  identityLabel: {
    fontSize: font.sizes.md,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    paddingRight: spacing.md,
  },
  identityHint: {
    marginTop: spacing.sm,
    fontSize: font.sizes.xs,
    color: colors.textMuted,
    lineHeight: 17,
  },
  textarea: {
    minHeight: 130,
    textAlignVertical: "top",
    marginTop: spacing.sm,
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: font.sizes.xs,
    color: colors.textFaint,
  },
  counterWarn: {
    color: colors.danger,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  topicLabel: {
    flex: 1,
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    paddingRight: spacing.sm,
  },
  topicInput: {
    flex: 2,
  },
  chipRow: {
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: font.sizes.xs,
    fontWeight: "800",
    color: colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  submit: {
    marginTop: spacing.xl,
  },
  guard: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  guardEmoji: {
    fontSize: 44,
  },
  guardTitle: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.text,
  },
  guardText: {
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: font.sizes.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
