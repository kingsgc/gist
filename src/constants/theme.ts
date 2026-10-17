/** Design tokens — bold Naija街头 vibe: green-white nod, amber accent, dark-first. */

import { Platform } from "react-native";

export const palette = {
  green: "#008751", // Nigerian flag green
  greenDark: "#00603A",
  greenSoft: "#E6F4EC",
  amber: "#FFB020",
  red: "#E5484D",
  ink: "#0B1210",
  slate: "#4A5952",
  mist: "#8A9890",
  cloud: "#F4F7F5",
  white: "#FFFFFF",
  line: "#E2E8E4",
  nightSurface: "#111A16",
  nightCard: "#16211C",
};

export const colors = {
  background: palette.cloud,
  card: palette.white,
  text: palette.ink,
  textMuted: palette.slate,
  textFaint: palette.mist,
  border: palette.line,
  primary: palette.green,
  primaryContrast: palette.white,
  accent: palette.amber,
  danger: palette.red,
  anonymousBg: "#1D2540",
  anonymousFg: "#C9D4FF",
  // raw palette (used for branded surfaces like the share card)
  green: palette.green,
  greenDark: palette.greenDark,
  greenSoft: palette.greenSoft,
  white: palette.white,
  ink: palette.ink,
  mist: palette.mist,
  amber: palette.amber,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const font = {
  ...Platform.select({ ios: { family: "System" }, default: {} }),
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
  },
};

/** Max content width so the layout stays readable on tablets/web. */
export const MAX_CONTENT_WIDTH = 640;

/**
 * WhatsApp-style chat tokens.
 * Close to WhatsApp's light palette so the chat screens feel familiar.
 */
export const chatColors = {
  /** warm paper background behind the bubbles */
  chatBg: "#EFE7DE",
  /** outgoing bubble — WhatsApp's signature green */
  bubbleOut: "#D9FDD3",
  bubbleIn: "#FFFFFF",
  waGreen: "#25D366",
  /** delivered double-check */
  tickSent: "#8696A0",
  /** read double-check */
  tickRead: "#53BDEB",
  listSearchBg: "#F0F2F5",
};
