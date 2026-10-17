/**
 * VerifyEmailPopup — "Check your email before you log in."
 * Shown right after registration (Supabase: email confirmation on;
 * Demo: user marks the simulated verification).
 */

import { Modal, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { colors, font, radius, spacing } from "@/constants/theme";
import { Button } from "@/components/ui";

export function VerifyEmailPopup({
  visible,
  email,
  onVerified,
}: {
  visible: boolean;
  email: string;
  onVerified: () => void;
}) {
  const router = useRouter();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onVerified}
    >
      <View style={StyleSheet.flatten([styles.backdrop, styles.backdropFlex])}>
        <View style={[styles.card, styles.cardCenter]}>
          <View style={styles.emojiRow}>
            <Text style={styles.emoji}>📧</Text>
            <Text style={styles.email}>{email}</Text>
          </View>

          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.body}>
            We just sent a verification link to your inbox. Tap it, then come
            back and you'll be able to log in and post — including
            anonymously, if you like.
          </Text>

          <Button
            label="I've verified — continue to login"
            onPress={onVerified}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: "88%",
    alignItems: "center",
  },
  cardCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  backdropFlex: {
    flex: 1,
  },
  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 40,
  },
  email: {
    fontSize: font.sizes.xs,
    color: colors.mist,
    textTransform: "lowercase",
  },
  title: {
    fontSize: font.sizes.xl,
    fontWeight: "900",
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: font.sizes.sm,
    color: colors.mist,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  button: {
    width: "100%",
  },
});
