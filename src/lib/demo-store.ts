/**
 * Local demo store — mirrors the Supabase schema so the whole app is
 * fully interactive without a live project. Persists to AsyncStorage.
 * Swap to Supabase by filling .env (see src/lib/api.ts).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  Comment,
  FeedFilter,
  NewCommentInput,
  NewPostInput,
  Post,
  SessionUser,
} from "@/types";

import type { AuthResult } from "./api";

const STORAGE_KEY = "gist.demo.v1";
const SESSION_KEY = "gist.demo.session";

interface DemoState {
  posts: Post[];
  comments: Comment[];
  accounts: Array<SessionUser & { password: string; verified: boolean }>;
}

const now = () => new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const SEED: DemoState = {
  posts: [
    {
      id: "p1",
      authorId: null,
      handle: "anon_9f2k1x",
      avatarUrl: null,
      isAnonymous: true,
      body: "I was in Danfo going to Oshodi and the conductor said 'enter with your change o, I no get' — sir, the fare is 300, I gave you 500 😭",
      state: "Lagos",
      topic: "danfo-diaries",
      imageUrl: null,
      likeCount: 214,
      commentCount: 3,
      shareCount: 41,
      likedByMe: false,
      createdAt: hoursAgo(1),
    },
    {
      id: "p2",
      authorId: "u_demo",
      handle: "kemisola_x",
      avatarUrl: null,
      isAnonymous: false,
      body: "Jollof take: my oga says party jollof > home jollof. Resignation letter don ready. 🍚",
      state: "Oyo",
      topic: "jollof-wars",
      imageUrl: null,
      likeCount: 89,
      commentCount: 2,
      shareCount: 12,
      likedByMe: true,
      createdAt: hoursAgo(3),
    },
    {
      id: "p3",
      authorId: null,
      handle: "anon_3p8m2c",
      avatarUrl: null,
      isAnonymous: true,
      body: "Third Mainland at 6:47am is not traffic, it's a spiritual experience. I finished my whole podcast, replied all my messages, and even thought about my life decisions.",
      state: "Lagos",
      topic: "lagos-traffic",
      imageUrl: null,
      likeCount: 512,
      commentCount: 2,
      shareCount: 87,
      likedByMe: false,
      createdAt: hoursAgo(5),
    },
    {
      id: "p4",
      authorId: "u_demo",
      handle: "tega_dev",
      avatarUrl: null,
      isAnonymous: false,
      body: "My landlord just sent 'Happy New Month' and attached account number. Sir, we are in October.",
      state: "Delta",
      topic: "naija-twitter",
      imageUrl: null,
      likeCount: 340,
      commentCount: 1,
      shareCount: 65,
      likedByMe: false,
      createdAt: hoursAgo(9),
    },
    {
      id: "p5",
      authorId: null,
      handle: "anon_7b1q4z",
      avatarUrl: null,
      isAnonymous: true,
      body: "Aso-ebi family meeting: 4 people said green, 3 said wine, 2 said peach. The wedding is Saturday. 😩",
      state: "Edo",
      topic: "aso-ebi-drama",
      imageUrl: null,
      likeCount: 156,
      commentCount: 1,
      shareCount: 23,
      likedByMe: false,
      createdAt: hoursAgo(14),
    },
    {
      id: "p6",
      authorId: "u_demo",
      handle: "amaka_writes",
      avatarUrl: null,
      isAnonymous: false,
      body: "Japa update: visa approved, bag don pack, jollof recipe don save for offline. Who wan follow me go Manchester? ✈️",
      state: "Anambra",
      topic: "japa",
      imageUrl: null,
      likeCount: 728,
      commentCount: 0,
      shareCount: 130,
      likedByMe: false,
      createdAt: hoursAgo(20),
    },
  ],
  comments: [
    { id: "c1", postId: "p1", authorId: null, handle: "anon_5t1w", avatarUrl: null, isAnonymous: true, body: " conductor go dey form say he no see your change 😂", createdAt: hoursAgo(0.8) },
    { id: "c2", postId: "p1", authorId: "u_demo", handle: "kemisola_x", avatarUrl: null, isAnonymous: false, body: "Oshodi never see anything. Try Yaba last Friday.", createdAt: hoursAgo(0.5) },
    { id: "c3", postId: "p1", authorId: null, handle: "anon_2x9r", avatarUrl: null, isAnonymous: true, body: "Sir enter with your change took me OUT 😭😭", createdAt: hoursAgo(0.2) },
    { id: "c4", postId: "p2", authorId: null, handle: "anon_8k3d", avatarUrl: null, isAnonymous: true, body: "Party jollof dey sweet pass, na true. Smoky + stew wee no dey look back.", createdAt: hoursAgo(2.5) },
    { id: "c5", postId: "p2", authorId: "u_demo", handle: "tega_dev", avatarUrl: null, isAnonymous: false, body: "Home jollof warriors, assemble! 🍳", createdAt: hoursAgo(2) },
    { id: "c6", postId: "p3", authorId: null, handle: "anon_4m6v", avatarUrl: null, isAnonymous: true, body: "Life decisions part na real. That bridge go make you think.", createdAt: hoursAgo(4) },
    { id: "c7", postId: "p3", authorId: "u_demo", handle: "amaka_writes", avatarUrl: null, isAnonymous: false, body: "6:47am is rookie numbers. Come by 5:55am.", createdAt: hoursAgo(3) },
    { id: "c8", postId: "p4", authorId: null, handle: "anon_1j7s", avatarUrl: null, isAnonymous: true, body: "The account number attachment na real masterclass 😂", createdAt: hoursAgo(8) },
    { id: "c9", postId: "p5", authorId: "u_demo", handle: "kemisola_x", avatarUrl: null, isAnonymous: false, body: "Family wey no settle aso-ebi by Thursday na quitters.", createdAt: hoursAgo(12) },
  ],
  accounts: [],
};

let state: DemoState | null = null;

async function load(): Promise<DemoState> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    state = raw ? (JSON.parse(raw) as DemoState) : structuredClone(SEED);
  } catch {
    state = structuredClone(SEED);
  }
  return state;
}

async function persist() {
  if (!state) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // non-fatal — demo only
  }
}

function toPublic(p: Post): Post {
  return p.isAnonymous ? { ...p, authorId: null, avatarUrl: null } : p;
}

function toPublicComment(c: Comment): Comment {
  return c.isAnonymous ? { ...c, authorId: null, avatarUrl: null } : c;
}

export const demoStore = {
  async getSession(): Promise<SessionUser | null> {
    const id = await AsyncStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const s = await load();
    const acct = s.accounts.find((a) => a.id === id);
    if (!acct) return null;
    const { password: _pw, ...user } = acct;
    return user;
  },

  async signUp(handle: string, email: string, password: string): Promise<AuthResult> {
    const s = await load();
    const clean = handle.trim().toLowerCase();
    if (s.accounts.some((a) => a.handle === clean || a.email === email)) {
      throw new Error("Handle or email already taken. Try another one.");
    }
    const user: SessionUser & { password: string; verified: boolean } = {
      id: `u_${uid()}`,
      email,
      handle: clean,
      avatarUrl: null,
      referralCode: clean.slice(0, 6).toUpperCase() + uid().slice(0, 2).toUpperCase(),
      verified: false,
      password,
    };
    s.accounts.push(user);
    await persist();
    await AsyncStorage.setItem(SESSION_KEY, user.id);
    const { password: _pw, ...pub } = user;
    // Demo mode mirrors the real platform: registration succeeds, but the
    // user must verify before logging in.
    return { user: pub as SessionUser, needsEmailVerification: true, email };
  },

  async signIn(email: string, password: string): Promise<SessionUser> {
    const s = await load();
    const acct = s.accounts.find((a) => a.email === email.trim().toLowerCase());
    if (!acct) {
      throw new Error("No account with that email. Check your spelling.");
    }
    if (acct.password !== password) {
      throw new Error("Wrong password. Try again.");
    }
    if (!acct.verified) {
      // Demo mode: block login until the user marks themselves verified.
      throw new Error(
        "Verify your email first — check your inbox. (Demo: tap 'Verify my email' below.)",
      );
    }
    await AsyncStorage.setItem(SESSION_KEY, acct.id);
    const { password: _pw, ...user } = acct;
    return user;
  },

  /** Demo-only: marks the account verified (what the email link does). */
  async confirmEmail(email: string) {
    const s = await load();
    const acct = s.accounts.find((a) => a.email === email.trim().toLowerCase());
    if (acct) {
      acct.verified = true;
      await persist();
    }
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },

  async listPosts(filter: FeedFilter = {}): Promise<Post[]> {
    const s = await load();
    return s.posts
      .filter((p) => (filter.state ? p.state === filter.state : true))
      .filter((p) => (filter.topic ? p.topic === filter.topic : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toPublic);
  },

  async getPost(id: string): Promise<Post | null> {
    const s = await load();
    const p = s.posts.find((x) => x.id === id);
    return p ? toPublic(p) : null;
  },

  async createPost(input: NewPostInput, user: SessionUser): Promise<Post> {
    const s = await load();
    const post: Post = {
      id: `p_${uid()}`,
      authorId: user.id,
      handle: input.isAnonymous ? `anon_${uid().slice(0, 6)}` : user.handle,
      avatarUrl: null,
      isAnonymous: input.isAnonymous,
      body: input.body.trim(),
      state: input.state,
      topic: input.topic,
      imageUrl: null,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      likedByMe: false,
      createdAt: now(),
    };
    s.posts.unshift(post);
    await persist();
    return toPublic(post);
  },

  async deletePost(id: string, user: SessionUser): Promise<void> {
    const s = await load();
    s.posts = s.posts.filter((p) => !(p.id === id && p.authorId === user.id));
    s.comments = s.comments.filter((c) => c.postId !== id);
    await persist();
  },

  async toggleLike(id: string): Promise<{ liked: boolean; likeCount: number }> {
    const s = await load();
    const p = s.posts.find((x) => x.id === id);
    if (!p) return { liked: false, likeCount: 0 };
    p.likedByMe = !p.likedByMe;
    p.likeCount = Math.max(0, p.likeCount + (p.likedByMe ? 1 : -1));
    await persist();
    return { liked: p.likedByMe, likeCount: p.likeCount };
  },

  async listComments(postId: string): Promise<Comment[]> {
    const s = await load();
    return s.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(toPublicComment);
  },

  async createComment(input: NewCommentInput, user: SessionUser): Promise<Comment> {
    const s = await load();
    const comment: Comment = {
      id: `c_${uid()}`,
      postId: input.postId,
      authorId: user.id,
      handle: input.isAnonymous ? `anon_${uid().slice(0, 6)}` : user.handle,
      avatarUrl: null,
      isAnonymous: input.isAnonymous,
      body: input.body.trim(),
      createdAt: now(),
    };
    s.comments.push(comment);
    const post = s.posts.find((p) => p.id === input.postId);
    if (post) post.commentCount += 1;
    await persist();
    return toPublicComment(comment);
  },

  async recordShare(postId: string): Promise<number> {
    const s = await load();
    const p = s.posts.find((x) => x.id === postId);
    if (!p) return 0;
    p.shareCount += 1;
    await persist();
    return p.shareCount;
  },
};
