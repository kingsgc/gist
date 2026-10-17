/** Core domain models shared by the Supabase backend and the local demo store. */

export interface Profile {
  id: string;
  handle: string;
  avatarUrl: string | null;
  referralCode: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  handle: string;
  avatarUrl: string | null;
  referralCode: string;
}

export interface AuthResult {
  user: SessionUser | null;
  /** true when the platform requires email confirmation before login */
  needsEmailVerification: boolean;
  /** email used for the registration */
  email: string;
}

export interface Post {
  id: string;
  /** null when the post was made anonymously */
  authorId: string | null;
  handle: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  body: string;
  state: string | null;
  topic: string | null;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string | null;
  handle: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  body: string;
  createdAt: string;
}

export interface NewPostInput {
  body: string;
  isAnonymous: boolean;
  state: string | null;
  topic: string | null;
}

export interface NewCommentInput {
  postId: string;
  body: string;
  isAnonymous: boolean;
}

export interface FeedFilter {
  state?: string | null;
  topic?: string | null;
}
