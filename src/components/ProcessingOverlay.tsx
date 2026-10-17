/**
 * ProcessingOverlay — branded "in flight" popup.
 * Used while logging in and while posting a gist, so the screen feels
 * alive instead of frozen.
 */

import { Modal, ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "@/constants/theme";

export function ProcessingOverlay({
  visible,
  title,
  subtitle,
  size = "large",
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  size?: "small" | "large";
}) {
  const styles = StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      alignItems: "center",
      justifyContent: "center",
    },
    cardCenter: {
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: font.sizes.xl,
      fontWeight: "900",
      color: colors.ink,
      marginTop: spacing.md,
    },
    subtitle: {
      fontSize: font.sizes.sm,
      color: colors.mist,
      marginTop: 6,
      lineHeight: 20,
    },
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size={size} color={colors.primary} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}
