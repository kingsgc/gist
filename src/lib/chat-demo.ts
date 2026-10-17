/**
 * Demo implementation of the chat API — local, offline, persisted to
 * AsyncStorage. Mirrors src/lib/chat-demo semantics so the full chat
 * UX runs before any Supabase project exists. The AI assistant replies
 * locally (offline persona) or via the configured LLM key.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AI_PROFILE,
  fetchAiReply,
  offlineReply,
  type AiTurn,
} from "./ai";
import type { ChatApi } from "./chat-api";
import type { ChatContact, ChatConversation, ChatMessage } from "@/types/chat";
import type { SessionUser } from "@/types";

const STORAGE_KEY = "gist.demo.chat.v1";
const AI_CHAT_ID = "chat_ai";

const nowIso = () => new Date().toISOString();

interface DemoChatState {
  chats: ChatConversation[];
  messages: ChatMessage[];
}

interface DemoAccountHandle {
  id: string;
  handle: string;
}

const SEEDED_CONTACTS: ChatContact[] = [
  { id: "u_demo", handle: "kemisola_x", avatarUrl: null },
  { id: "u_tega", handle: "tega_dev", avatarUrl: null },
  { id: "u_linda", handle: "linda_public", avatarUrl: null },
];

async function load(): Promise<DemoChatState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoChatState;
  } catch {
    // corrupted store — start fresh
  }
  return { chats: [], messages: [] };
}

async function save(state: DemoChatState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createDemoChatApi(): ChatApi {
  return {
    async listChats() {
      const state = await load();
      // always surface the AI chat first, even before first use
      if (!state.chats.some((c) => c.isAi)) {
        state.chats.unshift({
          id: AI_CHAT_ID,
          isAi: true,
          peerId: null,
          peerHandle: AI_PROFILE.displayName,
          peerAvatarUrl: null,
          lastBody: null,
          lastAt: null,
          unread: 0,
        });
      }
      return state.chats.sort((a, b) => {
        if (a.isAi !== b.isAi) return a.isAi ? -1 : 1;
        return (b.lastAt ?? "").localeCompare(a.lastAt ?? "");
      });
    },

    async getChat(chatId) {
      const state = await load();
      return (
        state.chats.find((c) => c.id === chatId) ?? null
      );
    },

    async startDirectChat(peerId) {
      const state = await load();
      const existing = state.chats.find((c) => c.peerId === peerId);
      if (existing) return existing.id;

      const accounts = await AsyncStorage.getItem("gist.demo.v1")
        .then((raw) => (raw ? (JSON.parse(raw) as { accounts: DemoAccountHandle[] }).accounts : []))
        .catch(() => [] as DemoAccountHandle[]);
      const seeded = SEEDED_CONTACTS.find((c) => c.id === peerId);
      const peer =
        accounts.find((a) => a.id === peerId) ??
        (seeded ? { id: seeded.id, handle: seeded.handle } : null);
      if (!peer) throw new Error("That user is not available in demo mode.");

      const chat: ChatConversation = {
        id: `chat_${Math.random().toString(36).slice(2, 10)}`,
        isAi: false,
        peerId: peer.id,
        peerHandle: peer.handle,
        peerAvatarUrl: null,
        lastBody: null,
        lastAt: null,
        unread: 0,
      };
      state.chats.push(chat);
      await save(state);
      return chat.id;
    },

    async openAiChat() {
      const state = await load();
      if (!state.chats.some((c) => c.isAi)) {
        state.chats.unshift({
          id: AI_CHAT_ID,
          isAi: true,
          peerId: null,
          peerHandle: AI_PROFILE.displayName,
          peerAvatarUrl: null,
          lastBody: null,
          lastAt: null,
          unread: 0,
        });
        await save(state);
      }
      return AI_CHAT_ID;
    },

    async listMessages(chatId) {
      const state = await load();
      return state.messages
        .filter((m) => m.chatId === chatId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async sendMessage(chatId, body, user) {
      const state = await load();
      const msg: ChatMessage = {
        id: `m_${Math.random().toString(36).slice(2, 12)}`,
        chatId,
        senderId: user.id,
        body: body.trim(),
        createdAt: nowIso(),
      };
      state.messages.push(msg);
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.lastBody = msg.body;
        chat.lastAt = msg.createdAt;
      }
      await save(state);
      return msg;
    },

    async aiReply(chatId, history, user) {
      const turns: AiTurn[] = history.map((m) => ({
        role: m.senderId === user.id ? ("user" as const) : ("assistant" as const),
        content: m.body,
      }));
      const lastUser = [...history].reverse().find((m) => m.senderId === user.id);
      const llm = await fetchAiReply(turns);
      const body =
        llm ?? offlineReply(lastUser?.body ?? "");

      const state = await load();
      const msg: ChatMessage = {
        id: `m_${Math.random().toString(36).slice(2, 12)}`,
        chatId,
        senderId: null,
        body,
        createdAt: nowIso(),
      };
      state.messages.push(msg);
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.lastBody = msg.body;
        chat.lastAt = msg.createdAt;
      }
      await save(state);
      return msg;
    },

    async markRead() {
      // single-device demo: nothing to sync
    },

    async listContacts() {
      return SEEDED_CONTACTS;
    },

    subscribe() {
      // local-only store: no realtime
      return () => {};
    },
  };
}
