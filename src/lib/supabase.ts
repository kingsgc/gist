import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True only when real credentials are present in .env.
 * The placeholder values from .env.example keep the app in demo mode
 * so the full UI/UX can be exercised without a live project.
 */
export const isSupabaseConfigured =
  supabaseUrl.startsWith("http") &&
  supabaseUrl.endsWith(".supabase.co") &&
  supabaseAnonKey.length > 30 &&
  !supabaseAnonKey.startsWith("your-");

/**
 * Lazy Supabase client.
 *
 * NOTE: the client is created on first use rather than at module load. The
 * client init path triggers @supabase/realtime-js, which needs a native
 * WebSocket constructor, and that breaks in Metro's Node/SSR environment
 * during `expo export` (static rendering). Lazy init keeps the app in
 * demo mode with zero effects; a user with incomplete credentials never
 * hits a load-time crash.
 */
let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  if (!isSupabaseConfigured) return null;
  try {
    cached = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch {
    cached = null;
  }
  return cached;
}

/** Deep-link base used for share attribution (gist://share/<post>?ref=CODE) */
export const SHARE_SCHEME =
  process.env.EXPO_PUBLIC_SHARE_DOMAIN || "gist";
