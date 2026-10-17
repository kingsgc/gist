/**
 * StatePickerModal — searchable selector for Nigerian states.
 * Cleaner than a 37-chip scroll, and it exposes the "Nationwide" option.
 */

import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { colors, font, radius, spacing } from "@/constants/theme";
import { NIGERIAN_STATES } from "@/constants/states";
import { Button, Chip, Input } from "@/components/ui";

export function StatePickerModal({
  visible,
  value,
  onChange,
}: {
  visible: boolean;
  value: string | null;
  onChange: (state: string | null) => void;
}) {
  const router = useRouter();

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <View style={styles.modal} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Where's the gist from?</Text>
          <Pressable
            onPress={() => {
              onChange(null);
              router.back();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }: { pressed: boolean }) => [
              styles.close,
              pressed && styles.closePressed,
            ]}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <Input
          placeholder="Search a state…"
          placeholderTextColor={colors.textFaint}
          value={value ?? ""}
          onChangeText={onChange}
          style={styles.search}
        />

        <View style={styles.options}>
          <Chip
            label="Nationwide"
            active={!value}
            onPress={() => onChange(null)}
          />
          <FlatList
            data={NIGERIAN_STATES}
            keyExtractor={(s) => s}
            numColumns={2}
            columnWrapperStyle={styles.grid}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Chip
                label={item}
                active={value === item}
                onPress={() => onChange(item)}
              />
            )}
          />
        </View>
      </View>
    </View>
  );
}

const Pressable = require("react-native").Pressable;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    width: "92%",
    maxHeight: "82%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: font.sizes.md,
    fontWeight: "800",
    color: colors.ink,
  },
  close: {
    padding: 8,
  },
  closePressed: {
    opacity: 0.6,
  },
  closeText: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: "700",
  },
  search: {
    margin: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  options: {
    padding: spacing.md,
  },
  grid: {
    gap: spacing.xs,
  },
  list: {
    paddingBottom: spacing.md,
  },
});
