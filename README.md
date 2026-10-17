# Gist 🇳🇬

Anonymous community engagement + local banter, built for the Nigerian market.
React Native (TypeScript) + Expo, backed by Supabase (Postgres + Auth).

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
