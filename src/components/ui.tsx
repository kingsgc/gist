/** Shared UI primitives — themed, responsive, zero extra deps. */

import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import { colors, font, radius, spacing } from "@/constants/theme";

/* ---------------------------------------------------------------- Button */

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "whatsapp";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  small,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "whatsapp"
          ? "#25D366"
          : "transparent";
  const fg =
    variant === "ghost" ? colors.primary : variant === "primary" ? colors.primaryContrast : "#FFFFFF";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && styles.buttonGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.buttonLabel, small && styles.buttonLabelSmall, { color: fg }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Chip */

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: "default" | "anon";
}

export function Chip({ label, active, onPress, tone = "default" }: ChipProps) {
  const isActive = Boolean(active);
  const anon = tone === "anon";
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        isActive && {
          backgroundColor: anon ? colors.anonymousBg : colors.primary,
          borderColor: anon ? colors.anonymousBg : colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          isActive && { color: anon ? colors.anonymousFg : colors.primaryContrast },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ----------------------------------------------------------------- Input */

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

/* ----------------------------------------------------------------- Card */

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ------------------------------------------------------------ Meta text */

export function Meta({ children }: { children: ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

/* ---------------------------------------------------------------- Empty */

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonLabel: {
    fontSize: font.sizes.md,
    fontWeight: "700",
  },
  buttonLabelSmall: {
    fontSize: font.sizes.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginRight: spacing.sm,
  },
  chipLabel: {
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: font.sizes.md,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  meta: {
    fontSize: font.sizes.xs,
    color: colors.textFaint,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: font.sizes.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
