/**
 * Unified data API — routes every call to Supabase when credentials
 * exist in .env, otherwise to the local demo store.
 */

import type {
  Comment,
  FeedFilter,
  NewCommentInput,
  NewPostInput,
  Post,
  SessionUser,
} from "@/types";

import { demoStore } from "./demo-store";
import { isSupabaseConfigured, getSupabase } from "./supabase";
import { createSupabaseApi } from "./supabase-api";

export const dataMode: "supabase" | "demo" = isSupabaseConfigured
  ? "supabase"
  : "demo";

/** Registration outcome: user is known + possibly awaiting email verification. */
export interface AuthResult {
  user: SessionUser | null;
  /** true when the platform requires email confirmation before login */
  needsEmailVerification: boolean;
  /** email that was used for this registration */
  email: string;
}

export interface GistApi {
  getSession(): Promise<SessionUser | null>;
  /** Returns AuthResult so the UI can show the verify popup before login. */
  signUp(handle: string, email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<SessionUser>;
  /** Demo-only: mark the account verified. No-op on Supabase (user clicks the link). */
  confirmEmail(email: string): Promise<void>;
  signOut(): Promise<void>;
  listPosts(filter?: FeedFilter): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  createPost(input: NewPostInput, user: SessionUser): Promise<Post>;
  deletePost(id: string, user: SessionUser): Promise<void>;
  toggleLike(id: string): Promise<{ liked: boolean; likeCount: number }>;
  listComments(postId: string): Promise<Comment[]>;
  createComment(input: NewCommentInput, user: SessionUser): Promise<Comment>;
  recordShare(postId: string): Promise<number>;
}

const liveClient = getSupabase();
export const api: GistApi =
  dataMode === "supabase" && liveClient
    ? createSupabaseApi(liveClient)
    : demoStore;
