/**
 * Screenshot → WhatsApp sharing loop.
 *
 * Flow:
 *  1. Capture the branded GistShareCard as a PNG (react-native-view-shot).
 *  2. Record the share on the backend (share_count + referral attribution).
 *  3. Hand the PNG to the native share sheet (expo-sharing) so the user
 *     drops it straight into a WhatsApp status or chat.
 *  4. Fallback on web / failure: open WhatsApp with a pre-filled message
 *     carrying the post link + the sharer's referral code.
 *
 * The referral code rides every share so invitees land back in the app
 * with attribution (gist://share/<post>?ref=CODE).
 */

import * as Linking from "expo-linking";
import { Platform, Share } from "react-native";
import { captureRef } from "react-native-view-shot";

import { SHARE_SCHEME } from "./supabase";
import { timeAgo } from "./format";
import type { Post } from "@/types";

export interface ShareContext {
  post: Post;
  referralCode: string;
}

/** Human-friendly WhatsApp caption. */
export function buildShareMessage({ post, referralCode }: ShareContext): string {
  const who = post.isAnonymous ? "an anon" : `@${post.handle}`;
  const where = post.state ? ` from ${post.state}` : "";
  const link = buildShareLink(post.id, referralCode);
  return (
    `🔥 Gist: ${who}${where} just dropped:\n\n` +
    `"${post.body.length > 140 ? `${post.body.slice(0, 137)}…` : post.body}"\n\n` +
    `💬 ${post.commentCount} replies · ❤️ ${post.likeCount} likes\n` +
    `Read + drop your own gist 👉 ${link}\n\n` +
    `Anonymously. Naija only. #GistNaija`
  );
}

/** Deep link back into the post with referral attribution. */
export function buildShareLink(postId: string, referralCode: string): string {
  return `${SHARE_SCHEME}://share/${postId}?ref=${encodeURIComponent(referralCode)}`;
}

/**
 * Capture the share card view as a PNG file URI.
 * Returns null on web or if capture fails (caller falls back to text).
 */
export async function captureShareCard(
  viewRef: React.RefObject<unknown>,
): Promise<string | null> {
  if (Platform.OS === "web" || !viewRef.current) return null;
  try {
    return await captureRef(viewRef as React.RefObject<number>, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
  } catch {
    return null;
  }
}

/**
 * The full loop: record share → screenshot share → native sheet, with a
 * WhatsApp-deep-link fallback so growth never dead-ends.
 */
export async function runShareLoop(
  viewRef: React.RefObject<unknown>,
  ctx: ShareContext,
  onShared?: (newShareCount: number) => void,
): Promise<void> {
  // 2. attribution first — even if the user cancels the sheet, the share intent is logged
  try {
    const count = await import("./api").then((m) =>
      m.api.recordShare(ctx.post.id),
    );
    onShared?.(count);
  } catch {
    // non-fatal — sharing still works offline
  }

  const message = buildShareMessage(ctx);
  const imageUri = await captureShareCard(viewRef);

  // 3. native share sheet with the screenshot attached
  if (imageUri) {
    try {
      const Sharing = await import("expo-sharing");
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(imageUri, {
          mimeType: "image/png",
          dialogTitle: "Share this gist",
          UTI: "public.png",
        });
        return;
      }
    } catch {
      // fall through to WhatsApp deep link
    }
  }

  // 4. fallback — WhatsApp with pre-filled caption + link
  await openWhatsApp(message);
}

/** Open WhatsApp directly with a pre-filled message (wa.me fallback). */
export async function openWhatsApp(message: string): Promise<void> {
  const encoded = encodeURIComponent(message);
  const deepLink = `whatsapp://send?text=${encoded}`;
  const webLink = `https://wa.me/?text=${encoded}`;
  try {
    const supported = await Linking.canOpenURL(deepLink);
    await Linking.openURL(supported ? deepLink : webLink);
  } catch {
    // last resort: OS share sheet with text only
    try {
      await Share.share({ message });
    } catch {
      // user dismissed — nothing to do
    }
  }
}
