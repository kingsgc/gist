/**
 * Supabase implementation of the chat API.
 *
 * Reads/writes go through the chat tables + RPCs defined in
 * supabase/chat-schema.sql. New messages from other devices (real
 * people or the AI) arrive via realtime postgres_changes subscriptions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { toError } from "./errors";
import { AI_PROFILE, fetchAiReply, offlineReply, type AiTurn } from "./ai";

import type { ChatApi } from "./chat-api";
import type {
  ChatContact,
  ChatConversation,
  ChatMessage,
} from "@/types/chat";
import type { SessionUser } from "@/types";

interface ChatRow {
  chat_id: string;
  is_ai: boolean;
  peer_id: string | null;
  peer_handle: string | null;
  peer_avatar_url: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
}

interface MessageRow {
  id: string;
  chat_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
}

const mapChat = (r: ChatRow): ChatConversation => ({
  id: r.chat_id,
  isAi: r.is_ai,
  peerId: r.is_ai ? null : r.peer_id,
  peerHandle: r.is_ai ? AI_PROFILE.displayName : r.peer_handle ?? "gist_user",
  peerAvatarUrl: r.is_ai ? null : r.peer_avatar_url,
  lastBody: r.last_body,
  lastAt: r.last_at,
  unread: r.unread ?? 0,
});

const mapMessage = (r: MessageRow): ChatMessage => ({
  id: r.id,
  chatId: r.chat_id,
  senderId: r.sender_id,
  body: r.body,
  createdAt: r.created_at,
});

export function createSupabaseChatApi(
  client: SupabaseClient,
): ChatApi {
  const toErrorOrThrow = (e: unknown, fallback: string): never => {
    throw toError(e as never, fallback);
  };

  return {
    async listChats() {
      const { data, error } = await client.rpc("list_chats");
      if (error) toErrorOrThrow(error, "Could not load your chats.");
      return ((data ?? []) as ChatRow[]).map(mapChat);
    },

    async getChat(chatId) {
      const { data, error } = await client.rpc("get_chat_info", {
        p_chat_id: chatId,
      });
      if (error) return null;
      const row = data as {
        id: string;
        is_ai: boolean;
        peer_id: string | null;
        peer_handle: string | null;
        peer_avatar_url: string | null;
      } | null;
      if (!row) return null;
      return {
        id: row.id,
        isAi: row.is_ai,
        peerId: row.is_ai ? null : row.peer_id,
        peerHandle: row.is_ai
          ? AI_PROFILE.displayName
          : row.peer_handle ?? "gist_user",
        peerAvatarUrl: row.is_ai ? null : row.peer_avatar_url,
        lastBody: null,
        lastAt: null,
        unread: 0,
      };
    },

    async startDirectChat(peerId) {
      const { data, error } = await client.rpc("start_direct_chat", {
        p_peer: peerId,
      });
      if (error) toErrorOrThrow(error, "Could not open that chat.");
      return data as string;
    },

    async openAiChat() {
      const { data, error } = await client.rpc("open_ai_chat");
      if (error) toErrorOrThrow(error, "Could not open the AI chat.");
      return data as string;
    },

    async listMessages(chatId) {
      const { data, error } = await client
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) toErrorOrThrow(error, "Could not load messages.");
      return ((data ?? []) as MessageRow[]).map(mapMessage);
    },

    async sendMessage(chatId, body, user) {
      const trimmed = body.trim();
      const { data, error } = await client
        .from("chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          body: trimmed,
        })
        .select("*")
        .single();
      if (error) toErrorOrThrow(error, "Message did not send. Try again.");
      return mapMessage(data as MessageRow);
    },

    async aiReply(chatId, history, user) {
      const aiTurns: AiTurn[] = history.map((m) => ({
        role: m.senderId === user.id ? ("user" as const) : ("assistant" as const),
        content: m.body,
      }));
      const llm = await fetchAiReply(aiTurns);
      const body = llm ?? offlineReply(aiTurns[aiTurns.length - 1]?.content ?? "");
      const { data, error } = await client.rpc("send_ai_reply", {
        p_chat_id: chatId,
        p_body: body,
      });
      if (error) toErrorOrThrow(error, "AI reply did not go through.");
      return mapMessage(data as MessageRow);
    },

    async markRead(chatId) {
      const { error } = await client.rpc("mark_chat_read", {
        p_chat_id: chatId,
      });
      if (error) toErrorOrThrow(error, "Could not sync read state.");
    },

    async listContacts(user) {
      const { data, error } = await client
        .from("profiles")
        .select("id, handle, avatar_url")
        .neq("id", user.id)
        .order("handle", { ascending: true })
        .limit(100);
      if (error) toErrorOrThrow(error, "Could not load contacts.");
      return ((data ?? []) as { id: string; handle: string; avatar_url: string | null }[]).map(
        (r) => ({ id: r.id, handle: r.handle, avatarUrl: r.avatar_url }),
      );
    },

    subscribe(chatId, onInsert) {
      const channel = client
        .channel(`chat:${chatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            const row = payload.new as MessageRow;
            if (row) onInsert(mapMessage(row));
          },
        )
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

