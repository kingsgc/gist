-- ============================================================
-- Gist Chat MVP — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (idempotent).         Run as the project owner role.
-- ============================================================

-- ------------------------------------------------------------
-- STORAGE TABLES
-- chats: one row per conversation. is_ai = true marks the
--        assistant chat (single human participant).
-- chat_participants: who is in each chat + read marker.
-- chat_messages: bubble text. sender_id = null => the AI assistant.
-- ------------------------------------------------------------

create table if not exists public.chats (
  id         uuid primary key default gen_random_uuid(),
  is_ai      boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  chat_id      uuid not null references public.chats (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index if not exists chat_participants_user_idx
  on public.chat_participants (user_id);

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats (id) on delete cascade,
  sender_id  uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_chat_idx
  on public.chat_messages (chat_id, created_at);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.chats             enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages     enable row level security;

-- chats: readable only when you are a participant.
drop policy if exists "chats_select_participant" on public.chats;
create policy "chats_select_participant" on public.chats
  for select to authenticated
  using (
    exists (
      select 1
      from public.chat_participants cp
      where cp.chat_id = chats.id
        and cp.user_id = auth.uid()
    )
  );

-- chat_participants: you can read your own rows only
-- (client reads peer identity via the list_chats() RPC).
drop policy if exists "chat_participants_select_own" on public.chat_participants;
create policy "chat_participants_select_own" on public.chat_participants
  for select to authenticated
  using (user_id = auth.uid());

-- chat_messages: participants can read; humans can only insert
-- their own lines (AI lines arrive through the send_ai_reply RPC).
drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.chat_participants cp
      where cp.chat_id = chat_messages.chat_id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_participants cp
      where cp.chat_id = chat_messages.chat_id
        and cp.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- RPCs
-- ------------------------------------------------------------

-- Start (or reuse) a 1:1 chat with another profile.
create or replace function public.start_direct_chat(p_peer uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not signed in';
  end if;
  if p_peer = v_me then
    raise exception 'You cannot chat with yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_peer) then
    raise exception 'That user does not exist';
  end if;

  select c.id into v_id
  from public.chats c
  join public.chat_participants a on a.chat_id = c.id and a.user_id = v_me
  join public.chat_participants b on b.chat_id = c.id and b.user_id = p_peer
  where c.is_ai = false
    and (select count(*) from public.chat_participants cp where cp.chat_id = c.id) = 2
  limit 1;

  if v_id is null then
    insert into public.chats (is_ai) values (false) returning id into v_id;
    insert into public.chat_participants (chat_id, user_id)
    values (v_id, v_me), (v_id, p_peer);
  end if;

  return v_id;
end;
$$;

-- Open (or reuse) this user's private AI assistant chat.
create or replace function public.open_ai_chat()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from public.profiles where id = v_me) then
    insert into public.profiles (id, handle)
    values (v_me, 'gist_' || substr(md5(v_me::text), 1, 8))
    on conflict (id) do nothing;
  end if;

  select c.id into v_id
  from public.chats c
  join public.chat_participants cp on cp.chat_id = c.id
  where c.is_ai and cp.user_id = v_me
  limit 1;

  if v_id is null then
    insert into public.chats (is_ai) values (true) returning id into v_id;
    insert into public.chat_participants (chat_id, user_id) values (v_id, v_me);
  end if;

  return v_id;
end;
$$;

-- The client asks the LLM itself, then persists the assistant's
-- answer through this RPC (only allowed inside AI chats).
create or replace function public.send_ai_reply(p_chat_id uuid, p_body text)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.chat_messages;
begin
  if not exists (
    select 1 from public.chat_participants
    where chat_id = p_chat_id and user_id = auth.uid()
  ) then
    raise exception 'Not your chat';
  end if;
  if not exists (
    select 1 from public.chats where id = p_chat_id and is_ai
  ) then
    raise exception 'Not an AI chat';
  end if;
  if char_length(coalesce(p_body, '')) not between 1 and 2000 then
    raise exception 'Message must be 1-2000 characters';
  end if;

  insert into public.chat_messages (chat_id, sender_id, body)
  values (p_chat_id, null, p_body)
  returning * into v_row;

  update public.chat_participants
  set last_read_at = now()
  where chat_id = p_chat_id and user_id = auth.uid();

  return v_row;
end;
$$;

-- Header metadata for one chat (peer identity + is_ai flag).
create or replace function public.get_chat_info(p_chat_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'id', c.id,
    'is_ai', c.is_ai,
    'peer_id', p.id,
    'peer_handle', p.handle,
    'peer_avatar_url', p.avatar_url
  )
  from public.chats c
  join public.chat_participants me
    on me.chat_id = c.id and me.user_id = auth.uid()
  left join public.chat_participants them
    on them.chat_id = c.id and them.user_id <> auth.uid()
  left join public.profiles p on p.id = them.user_id
  where c.id = p_chat_id;
$$;

-- One row per chat for the Chats screen.
create or replace function public.list_chats()
returns table (
  chat_id         uuid,
  is_ai           boolean,
  peer_id         uuid,
  peer_handle     text,
  peer_avatar_url text,
  last_body       text,
  last_at         timestamptz,
  unread          integer
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.is_ai,
    p.id,
    p.handle,
    p.avatar_url,
    (select m.body from public.chat_messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    (select m.created_at from public.chat_messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    (select count(*)::int from public.chat_messages m
      where m.chat_id = c.id
        and m.created_at > me.last_read_at
        and m.sender_id is distinct from me.user_id)
  from public.chats c
  join public.chat_participants me
    on me.chat_id = c.id and me.user_id = auth.uid()
  left join public.chat_participants them
    on them.chat_id = c.id and them.user_id <> me.user_id
  left join public.profiles p on p.id = them.user_id;
$$;

-- Scrolling a chat marks it read.
create or replace function public.mark_chat_read(p_chat_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chat_participants
  set last_read_at = now()
  where chat_id = p_chat_id and user_id = auth.uid();
$$;

grant execute on function public.start_direct_chat(uuid)     to authenticated;
grant execute on function public.open_ai_chat()              to authenticated;
grant execute on function public.send_ai_reply(uuid, text)   to authenticated;
grant execute on function public.get_chat_info(uuid)         to authenticated;
grant execute on function public.list_chats()                to authenticated;
grant execute on function public.mark_chat_read(uuid)        to authenticated;

-- ------------------------------------------------------------
-- REALTIME — push new messages to open chat rooms
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime not found — enable Realtime for chat_messages in the dashboard.';
end $$;
