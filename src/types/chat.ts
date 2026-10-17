/** Chat MVP domain models — shared by the Supabase and demo data layers. */

export interface ChatContact {
  id: string;
  handle: string;
  avatarUrl: string | null;
}

export interface ChatConversation {
  id: string;
  /** true when this is the user's built-in AI assistant chat */
  isAi: boolean;
  peerId: string | null;
  peerHandle: string;
  peerAvatarUrl: string | null;
  lastBody: string | null;
  lastAt: string | null;
  /** messages since the user last had this chat open */
  unread: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  /** null when the message came from the AI assistant */
  senderId: string | null;
  body: string;
  createdAt: string;
}
