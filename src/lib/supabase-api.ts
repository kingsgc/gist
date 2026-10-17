/**
 * Supabase implementation of the Gist API.
 * Reads go through the masked feed_posts / feed_comments views so
 * anonymous authors never leak; writes go to base tables under RLS.
 * Every thrown value is normalized to a plain `Error` via `toError`
 * so the UI never has to guess whether it's an Error or a PostgrestError.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { toError } from "./errors";

import type {
  Comment,
  FeedFilter,
  NewCommentInput,
  NewPostInput,
  Post,
  SessionUser,
} from "@/types";

import type { AuthResult, GistApi } from "./api";

interface FeedPostRow {
  id: string;
  author_id: string | null;
  handle: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  body: string;
  state: string | null;
  topic: string | null;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  liked_by_me: boolean;
}

interface FeedCommentRow {
  id: string;
  post_id: string;
  author_id: string | null;
  handle: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  body: string;
  created_at: string;
}

const mapPost = (r: FeedPostRow): Post => ({
  id: r.id,
  authorId: r.author_id,
  handle: r.handle,
  avatarUrl: r.avatar_url,
  isAnonymous: r.is_anonymous,
  body: r.body,
  state: r.state,
  topic: r.topic,
  imageUrl: r.image_url,
  likeCount: r.like_count,
  commentCount: r.comment_count,
  shareCount: r.share_count,
  likedByMe: r.liked_by_me,
  createdAt: r.created_at,
});

const mapComment = (r: FeedCommentRow): Comment => ({
  id: r.id,
  postId: r.post_id,
  authorId: r.author_id,
  handle: r.handle,
  avatarUrl: r.avatar_url,
  isAnonymous: r.is_anonymous,
  body: r.body,
  createdAt: r.created_at,
});

async function currentSessionUser(
  client: SupabaseClient,
): Promise<SessionUser | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  let profile: { handle: string; avatar_url: string | null; referral_code: string } | null = null;
  const { data: profileRow } = await client
    .from("profiles")
    .select("handle, avatar_url, referral_code")
    .eq("id", user.id)
    .single();
  profile = profileRow;

  // Robust: if the signup trigger never created the row (old accounts),
  // repair it server-side before any write.
  if (!profile) {
    try {
      const { data } = await client.rpc("ensure_my_profile");
      if (data && typeof data === "object" && "handle" in data) {
        const { data: again } = await client
          .from("profiles")
          .select("handle, avatar_url, referral_code")
          .eq("id", user.id)
          .single();
        if (again) profile = again;
      }
    } catch {
      // RPC may be absent on a fresh schema run — fall back to display name
    }
  }

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? "",
      handle: "gist_user",
      avatarUrl: null,
      referralCode: "GIST",
    };
  }

  return {
    id: user.id,
    email: user.email ?? "",
    handle: profile.handle,
    avatarUrl: profile.avatar_url,
    referralCode: profile.referral_code,
  };
}

export function createSupabaseApi(client: SupabaseClient): GistApi {
  return {
    async getSession() {
      const user = await currentSessionUser(client);
      return user;
    },

    async signUp(handle, email, password) {
      const clean = handle.trim().toLowerCase();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { handle: clean } },
      });
      if (error) throw toError(error, "Could not create account.");
      if (!data.user) {
        throw new Error(
          "Could not create account. Check your email to confirm — or use a different email.",
        );
      }
      // No confirmed session yet (auto-confirm disabled)? Then we cannot
      // log them in — we must make them verify their email first.
      const next = data.session ? await currentSessionUser(client) : null;
      return {
        user: next,
        needsEmailVerification: !data.session,
        email,
      };
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw toError(error, "Invalid email or password.");
      const user = await currentSessionUser(client);
      if (!user) throw new Error("Signed in, but your profile is still loading.");
      return user;
    },

    async signOut() {
      await client.auth.signOut();
    },

    async listPosts(filter: FeedFilter = {}) {
      let query = client
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter.state) query = query.eq("state", filter.state);
      if (filter.topic) query = query.eq("topic", filter.topic);
      const { data, error } = await query;
      if (error) throw toError(error, "Could not load gist.");
      return ((data ?? []) as FeedPostRow[]).map(mapPost);
    },

    async getPost(id) {
      const { data, error } = await client
        .from("feed_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) return null;
      return mapPost(data as FeedPostRow);
    },

    async createPost(input, user) {
      // 1. Repair the profile first — the insert will fail with a FK error
      //    if the signup trigger never created it (old accounts).
      const { data, error } = await client.rpc("ensure_my_profile");
      if (error) throw toError(error, "Profile missing — could not post.");

      // 2. Insert without .select(): direct table SELECT is revoked because
      //    anonymous authors are masked via the view.
      const { error: insertError } = await client.from("posts").insert({
        author_id: data && "id" in data ? data.id : user.id,
        is_anonymous: input.isAnonymous,
        body: input.body.trim(),
        state: input.state,
        topic: input.topic,
      });
      if (insertError) throw toError(insertError, "Gist no go send. Try again.");

      const [latest] = await this.listPosts({
        state: input.state,
        topic: input.topic,
      });
      return latest;
    },

    async deletePost(id, user) {
      const { error } = await client
        .from("posts")
        .delete()
        .eq("id", id)
        .eq("author_id", user.id);
      if (error) throw toError(error, "Could not delete gist.");
    },

    async toggleLike(id) {
      const { data, error } = await client.rpc("toggle_like", {
        p_post_id: id,
      });
      if (error) throw toError(error, "Like did not register.");
      const liked = Boolean(data);
      const { data: row } = await client
        .from("feed_posts")
        .select("like_count")
        .eq("id", id)
        .single();
      return { liked, likeCount: (row as { like_count: number } | null)?.like_count ?? 0 };
    },

    async listComments(postId) {
      const { data, error } = await client
        .from("feed_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw toError(error, "Could not load replies.");
      return ((data ?? []) as FeedCommentRow[]).map(mapComment);
    },

    async createComment(input, user) {
      const { error } = await client.from("comments").insert({
        post_id: input.postId,
        author_id: user.id,
        is_anonymous: input.isAnonymous,
        body: input.body.trim(),
      });
      if (error) throw toError(error, "Reply did not go through.");
      const rows = await this.listComments(input.postId);
      return rows[rows.length - 1];
    },

    async confirmEmail() {
      // Real verification happens when the user taps the link in their inbox.
      // This no-op exists so the UI can always advertise the same button.
    },

    async recordShare(postId) {
      const { data, error } = await client.rpc("record_share", {
        p_post_id: postId,
        p_channel: "whatsapp",
      });
      if (error) throw toError(error, "Share did not complete.");
      return typeof data === "number" ? data : 0;
    },
  };
}
