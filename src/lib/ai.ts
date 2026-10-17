/**
 * Built-in AI assistant — "Gisty AI".
 *
 * The client asks the LLM directly (key lives in .env, never in the
 * repo) and persists the reply through the `send_ai_reply` RPC so the
 * assistant's messages belong to the chat but never to a fake user.
 * With no key (or a provider outage) a small offline persona keeps the
 * conversation alive so the app always feels responsive.
 */

export const AI_PROFILE = {
  handle: "gisty_ai",
  displayName: "Gisty AI",
  bio: "Your built-in assistant in Gist — ask me anything.",
};

const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY ?? "";
const baseUrl =
  (process.env.EXPO_PUBLIC_AI_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  ) || "https://api.openai.com/v1";
const model = process.env.EXPO_PUBLIC_AI_MODEL ?? "gpt-4o-mini";

/** True when a real LLM key is configured in .env. */
export const isAiConfigured = apiKey.length > 10;

export interface AiTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = [
  "You are Gisty AI, the friendly built-in assistant inside the Gist app,",
  "a Nigerian social chat app. Keep replies short and conversational —",
  "you are inside a WhatsApp-style chat, not a document.",
  "Warm, witty, plain language; light Naija flavour is welcome but never",
  "overdone. If you do not know something, say so plainly.",
].join(" ");

async function callLlm(history: AiTurn[]): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    throw new Error(`AI provider returned ${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned an empty reply");
  return text;
}

/** Tiny offline persona used when no key is set or the provider fails. */
export function offlineReply(lastUserMessage: string): string {
  const said = lastUserMessage.toLowerCase();
  if (/^hi|hello|hey|good (morning|afternoon|evening)/.test(said)) {
    return "Hey there! I'm Gisty AI 👋 How can I help you today?";
  }
  if (said.includes("help") || said.includes("how")) {
    return (
      "I'm here to chat, answer questions and keep you company. " +
      "Tip: add an EXPO_PUBLIC_AI_API_KEY in .env to unlock my full brain 🧠"
    );
  }
  if (said.endsWith("?")) {
    return "Good question! For full answers, plug in an LLM key in .env — for now I'm running on backup mode 😅";
  }
  return "Got it 👍 (Offline assistant mode — add EXPO_PUBLIC_AI_API_KEY in .env for real answers.)";
}

/**
 * Generate the assistant's next message.
 * Returns null when no key is configured so the caller can use the
 * offline persona instead.
 */
export async function fetchAiReply(
  history: AiTurn[],
): Promise<string | null> {
  if (!isAiConfigured) return null;
  try {
    return await callLlm(history.slice(-12));
  } catch {
    return null;
  }
}
