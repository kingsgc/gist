-- ============================================================
-- Gist — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent).
-- Run as the project owner role (the postgres role). If the SQL
-- Editor role is not the owner / superuser, the GRANT lines will
-- fail with "permission denied". In that case, switch the editor
-- to the project owner role first.
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSION
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PROFILES
-- One row per auth user. Holds public handle + referral code.
-- Auto-created by trigger on signup (see bottom of file).
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        text not null unique
                  check (char_length(handle) between 3 and 20),
  avatar_url    text,
  referral_code text not null unique
                  default upper(substr(md5(random()::text), 1, 8)),
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- POSTS
-- author_id is ALWAYS stored (ownership, moderation, deletion)
-- but is masked from other users for anonymous posts via the
-- feed_posts view below.
-- ------------------------------------------------------------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  is_anonymous boolean not null default false,
  body         text not null check (char_length(body) between 1 and 500),
  state        text,          -- Nigerian state, e.g. 'Lagos'
  topic        text,          -- e.g. 'jollof-wars'
  image_url    text,
  like_count   integer not null default 0,
  comment_count integer not null default 0,
  share_count  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_state_idx on public.posts (state);
create index if not exists posts_topic_idx on public.posts (topic);

-- ------------------------------------------------------------
-- LIKES  (table is never read directly by clients; see RPCs)
-- ------------------------------------------------------------
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ------------------------------------------------------------
-- COMMENTS  (masked authors for anonymous comments via view)
-- ------------------------------------------------------------
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete cascade,
  is_anonymous boolean not null default false,
  body         text not null check (char_length(body) between 1 and 300),
  created_at   timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments (post_id, created_at);

-- ------------------------------------------------------------
-- SHARES  — growth-loop attribution (who shared what, and which
-- referral code was attached). Powers the viral loop.
-- ------------------------------------------------------------
create table if not exists public.shares (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references public.posts (id) on delete cascade,
  sharer_id      uuid references public.profiles (id) on delete set null,
  referral_code  text,
  channel        text not null default 'whatsapp',
  created_at     timestamptz not null default now()
);

create index if not exists shares_post_id_idx on public.shares (post_id);
create index if not exists shares_referral_idx on public.shares (referral_code);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.posts      enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments   enable row level security;
alter table public.shares     enable row level security;

-- profiles: readable by everyone, editable by owner only
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- posts: insert/delete own only. Select is served via feed_posts
-- view so anonymous authors stay unlinked.
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = author_id);

-- comments: insert/delete own only; select via feed_comments view
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = author_id);

-- shares: anyone may record a share (it is public growth data)
drop policy if exists "shares_insert" on public.shares;
create policy "shares_insert" on public.shares
  for insert with check (true);

drop policy if exists "shares_select" on public.shares;
create policy "shares_select" on public.shares
  for select using (true);

-- ------------------------------------------------------------
-- REVOKE direct table reads so anonymous authors cannot be
-- unmasked by querying posts/comments directly.
-- ------------------------------------------------------------
revoke all on public.posts from anon, authenticated;
revoke all on public.comments from anon, authenticated;
revoke all on public.post_likes from anon, authenticated;

grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.comments to authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.shares to anon, authenticated;
grant select on public.shares to anon, authenticated;

-- ------------------------------------------------------------
-- PUBLIC VIEWS — the only readable surfaces for feed content.
-- Anonymous authors are masked with a stable per-post alias.
-- ------------------------------------------------------------
create or replace view public.feed_posts
with (security_invoker = on) as
select
  p.id,
  case when p.is_anonymous then null else p.author_id end as author_id,
  case when p.is_anonymous
       then 'anon_' || substr(p.id::text, 1, 6)
       else pr.handle end as handle,
  case when p.is_anonymous then null else pr.avatar_url end as avatar_url,
  p.is_anonymous,
  p.body,
  p.state,
  p.topic,
  p.image_url,
  p.like_count,
  p.comment_count,
  p.share_count,
  p.created_at,
  exists (
    select 1 from public.post_likes l
    where l.post_id = p.id and l.user_id = auth.uid()
  ) as liked_by_me
from public.posts p
join public.profiles pr on pr.id = p.author_id;

grant select on public.feed_posts to anon, authenticated;

create or replace view public.feed_comments
with (security_invoker = on) as
select
  c.id,
  c.post_id,
  case when c.is_anonymous then null else c.author_id end as author_id,
  case when c.is_anonymous
       then 'anon_' || substr(c.id::text, 1, 6)
       else pr.handle end as handle,
  case when c.is_anonymous then null else pr.avatar_url end as avatar_url,
  c.is_anonymous,
  c.body,
  c.created_at
from public.comments c
join public.profiles pr on pr.id = c.author_id;

grant select on public.feed_comments to anon, authenticated;

-- ------------------------------------------------------------
-- RPC: toggle_like — atomic, keeps like_count in sync, never
-- exposes the likes table to clients.
-- ------------------------------------------------------------
create or replace function public.toggle_like(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  already_liked boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from post_likes where post_id = p_post_id and user_id = auth.uid()) then
    delete from post_likes where post_id = p_post_id and user_id = auth.uid();
    update posts set like_count = greatest(like_count - 1, 0) where id = p_post_id;
    return false;
  else
    insert into post_likes (post_id, user_id) values (p_post_id, auth.uid());
    update posts set like_count = like_count + 1 where id = p_post_id;
    return true;
  end if;
end;
$$;

grant execute on function public.toggle_like(uuid) to authenticated;

-- ------------------------------------------------------------
-- RPC: record_share — bumps share_count and logs attribution
-- for the WhatsApp growth loop.
-- ------------------------------------------------------------
create or replace function public.record_share(p_post_id uuid, p_channel text default 'whatsapp')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into shares (post_id, sharer_id, referral_code, channel)
  values (
    p_post_id,
    auth.uid(),
    (select referral_code from profiles where id = auth.uid()),
    p_channel
  );

  update posts set share_count = share_count + 1 where id = p_post_id;

  select share_count into new_count from posts where id = p_post_id;
  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.record_share(uuid, text) to anon, authenticated;

-- ------------------------------------------------------------
-- RPC: ensure_my_profile — creates the profile row for a freshly
-- authenticated user if the trigger missed it (e.g. old account). Ids
-- and handles are normalized server-side so anon/session spam can't
-- create dangling rows.
-- ------------------------------------------------------------
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid         uuid := auth.uid();
  base_handle text;
  final_handle text;
  found       public.profiles%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into found from profiles where id = uid;
  if found.id is not null then
    return found;
  end if;

  base_handle := lower(coalesce(
    (select raw_user_meta_data ->> 'handle' from auth.users where id = uid),
    'user_' || substr(uid::text, 1, 6)
  ));
  base_handle := regexp_replace(base_handle, '[^a-z0-9_]', '', 'g');
  if char_length(base_handle) < 3 then
    base_handle := base_handle || '_gist';
  end if;

  final_handle := left(base_handle, 20);
  if exists (select 1 from profiles where handle = final_handle) then
    final_handle := left(base_handle, 15) || '_' || substr(md5(uid::text), 1, 4);
  end if;

  insert into profiles (id, handle)
  values (uid, final_handle)
  on conflict (id) do nothing;

  select * into found from profiles where id = uid;
  return found;
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;

-- ------------------------------------------------------------
-- TRIGGER: keep comment_count in sync
-- ------------------------------------------------------------
create or replace function public.bump_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_trigger on public.comments;
create trigger comments_count_trigger
  after insert or delete on public.comments
  for each row execute function public.bump_comment_count();

-- ------------------------------------------------------------
-- TRIGGER: auto-create a profile row when a user signs up.
-- The client passes { handle } in options.data; we fall back to
-- a generated handle and resolve collisions.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
begin
  base_handle := lower(coalesce(
    new.raw_user_meta_data ->> 'handle',
    'user_' || substr(new.id::text, 1, 6)
  ));
  base_handle := regexp_replace(base_handle, '[^a-z0-9_]', '', 'g');

  final_handle := base_handle;
  if exists (select 1 from profiles where handle = final_handle) then
    final_handle := final_handle || '_' || substr(md5(new.id::text), 1, 4);
  end if;

  insert into public.profiles (id, handle, avatar_url)
  values (new.id, final_handle, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
