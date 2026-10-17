/**
 * Chat API — routes every call to Supabase when credentials exist in
 * .env (realtime-backed, shared between real people), otherwise to the
 * local demo store so the MVP stays fully interactive offline.
 */

import { getSupabase } from "./supabase";
import { createSupabaseChatApi } from "./chat-supabase";
import { createDemoChatApi } from "./chat-demo";

import type { ChatContact, ChatConversation, ChatMessage } from "@/types/chat";
import type { SessionUser } from "@/types";

export interface ChatApi {
  listChats(): Promise<ChatConversation[]>;
  getChat(chatId: string): Promise<ChatConversation | null>;
  startDirectChat(peerId: string): Promise<string>;
  openAiChat(): Promise<string>;
  listMessages(chatId: string): Promise<ChatMessage[]>;
  sendMessage(
    chatId: string,
    body: string,
    user: SessionUser,
  ): Promise<ChatMessage>;
  /**
   * Generate + persist the assistant's reply inside an AI chat.
   * Uses the configured LLM, falling back to the offline persona.
   */
  aiReply(
    chatId: string,
    history: ChatMessage[],
    user: SessionUser,
  ): Promise<ChatMessage>;
  markRead(chatId: string): Promise<void>;
  /** All profiles that can be chatted with. */
  listContacts(user: SessionUser): Promise<ChatContact[]>;
  /**
   * Subscribe to new messages in one chat. Returns an unsubscribe
   * function (no-op in demo mode).
   */
  subscribe(chatId: string, onInsert: (m: ChatMessage) => void): () => void;
}

const liveClient = getSupabase();

export const chatApi: ChatApi =
  liveClient ? createSupabaseChatApi(liveClient) : createDemoChatApi();
