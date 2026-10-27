<p align="center">
  <img src="assets/images/icon.png" alt="Gist logo" width="140" />
</p>

<h1 align="center">Gist 🇳🇬</h1>

<p align="center">
  Anonymous community engagement + local banter, built for the Nigerian market.<br/>
  React Native (TypeScript) + Expo, backed by Supabase (Postgres + Auth).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/Expo-SDK%2057-black" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/React%20Native-0.86-61dafb" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

<p align="center">
  <img src="assets/images/logo-glow.png" alt="Gist" width="420" />
</p>

## Features

- **Scrollable localized feed** — every gist can be tagged with a Nigerian
  state and a hot topic (`#jollof-wars`, `#lagos-traffic`, `#japa`…), with
  filter chips across the top.
- **Anonymous / public toggle** — flip a switch before posting; anonymous
  gists are masked at the database level (see `supabase/schema.sql`), so not
  even a direct API query can link an anonymous post to its author.
- **Register to participate** — anyone can read; posting, liking and
  replying require an account. Replies can be anonymous too.
- **Screenshot → WhatsApp sharing loop** — tapping share captures a branded
  "Gist card" (PNG) of the post via `react-native-view-shot`, logs the share
  with your referral code, then hands the image to the native share sheet so
  it lands straight in WhatsApp chats/status. Recipients open
  `gist://share/<post>?ref=CODE`, see the post + referral banner, and are
  nudged to register — closing the growth loop.
- **Demo mode out of the box** — with placeholder `.env` values the app runs
  fully offline against a seeded local store (`src/lib/demo-store.ts`), so
  every screen and interaction works before you create a Supabase project.

## Chat MVP (WhatsApp-style) 💬

The app has pivoted to a chat-first MVP: **Chats** is the home tab. Real 1:1
messages run on Supabase tables + realtime, and a built-in **Gisty AI**
assistant contact texts like a regular chat.

Setup, one time — after `supabase/schema.sql`:

1. Paste [`supabase/chat-schema.sql`](supabase/chat-schema.sql) into the
   Supabase SQL Editor and run it (chat tables, RLS, RPCs, realtime).
2. For real AI answers, paste your own (OpenAI-compatible) key in `.env`:

   ```bash
   EXPO_PUBLIC_AI_API_KEY=<your-key>
   EXPO_PUBLIC_AI_BASE_URL=https://api.openai.com/v1   # or any OpenAI-compatible endpoint
   EXPO_PUBLIC_AI_MODEL=gpt-4o-mini
   ```

   Leave the key empty and Gisty AI replies from the built-in offline persona.
3. Restart the dev server (`npx expo start -c`).

The old gist-feed screens are still in the codebase (see git history) but are
no longer part of the app's navigation.

## Get started

```bash
npm install
npx expo start
```

Then press `a` (Android emulator), `i` (iOS simulator) or `w` (web), or scan
the QR code with Expo Go.

## Connecting Supabase (going live)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   tables, row-level-security policies, masked feed views, and the
   `toggle_like` / `record_share` RPCs.
3. In **Project Settings → API**, copy the Project URL and anon public key
   into `.env`:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

4. Restart the dev server (`npx expo start -c`). The profile screen shows
   🟢 Connected to Supabase when live.

> `.env` is git-ignored. Never commit real keys — `.env.example` documents
> the required variables with placeholders.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for clients; RLS enforces access) |
| `EXPO_PUBLIC_SHARE_DOMAIN` | Deep-link scheme used in shared links (default `gist`) |

## Project structure

```
src/
  app/                 # expo-router screens
    (tabs)/            #   Feed, Compose, Profile (bottom tabs)
    auth.tsx           #   Register / sign in (modal)
    post/[id].tsx      #   Gist + discussion thread
    share/[id].tsx     #   Deep-link landing for WhatsApp shares
  components/          # PostCard, GistShareCard (screenshot card), UI kit
  lib/
    supabase.ts        # Client + .env credentials
    supabase-api.ts    # Live data layer (views + RPCs)
    demo-store.ts      # Seeded offline fallback
    api.ts             # Router: picks Supabase or demo
    share.ts           # Screenshot → WhatsApp loop
  providers/           # AuthProvider (session context)
  constants/           # Theme tokens, Nigerian states, hot topics
supabase/
  schema.sql           # Full schema + RLS + RPCs (run in SQL editor)
```

## The sharing loop, in detail

1. User taps **Share** on any gist.
2. `src/lib/share.ts` captures the offscreen `GistShareCard` as a PNG.
3. `record_share` RPC bumps `share_count` and stores the sharer's
   `referral_code` (growth attribution, queryable in the `shares` table).
4. `expo-sharing` opens the native sheet with the PNG — pick WhatsApp.
   Fallback: `whatsapp://send?text=…` with the gist text + link.
5. Recipient opens `gist://share/<id>?ref=CODE` → landing screen shows the
   gist and an invite banner → they register → attribution recorded.

## License

See [LICENSE](./LICENSE).
