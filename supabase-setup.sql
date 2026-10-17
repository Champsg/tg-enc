-- tg-enc setup (v3)
-- Run this once in Supabase Dashboard > SQL Editor.
-- Also enable: Authentication > Sign In / Providers > Anonymous sign-ins.
--
-- If you ran an earlier version of this script, uncomment the next lines first:
-- drop table if exists public.message_reactions cascade;
-- drop table if exists public.chat_reads cascade;
-- drop table if exists public.direct_messages cascade;
-- drop table if exists public.conversations cascade;
-- drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id text primary key,                 -- equals auth.uid()
  username text not null unique,
  display_name text not null,
  public_key jsonb not null,
  last_seen bigint,
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  chat_id text primary key,            -- opaque SHA-256 of the two user ids
  user_a text not null,
  user_b text not null,
  updated_at bigint not null,
  created_at timestamptz default now()
);
create index if not exists idx_conversations_user_a on public.conversations (user_a);
create index if not exists idx_conversations_user_b on public.conversations (user_b);

create table if not exists public.direct_messages (
  id text primary key,
  chat_id text not null references public.conversations(chat_id) on delete cascade,
  sender_id text not null,
  payload jsonb not null,
  reply_to_id text,
  timestamp bigint not null,
  created_at timestamptz default now()
);
create index if not exists idx_direct_messages_chat
  on public.direct_messages (chat_id, timestamp asc);

create table if not exists public.message_reactions (
  message_id text not null references public.direct_messages(id) on delete cascade,
  chat_id text not null,
  user_id text not null,
  username text not null,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists idx_message_reactions_chat
  on public.message_reactions (chat_id);

create table if not exists public.chat_reads (
  chat_id text not null references public.conversations(chat_id) on delete cascade,
  user_id text not null,
  last_read_at bigint not null default 0,
  primary key (chat_id, user_id)
);

-- Let the client watch for new conversations / messages (row level security
-- still decides which rows each user receives).
do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.chat_reads enable row level security;

create or replace function public.is_chat_member(p_chat_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.chat_id = p_chat_id
      and auth.uid()::text in (c.user_a, c.user_b)
  );
$$;

grant execute on function public.is_chat_member(text) to anon, authenticated;

-- profiles: public directory, but only you can create/update/delete your row
drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles
  for select using (true);

drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles
  for insert with check (id = auth.uid()::text);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles
  for delete using (id = auth.uid()::text);

-- conversations: only the two participants can see or touch a row
drop policy if exists "read own conversations" on public.conversations;
create policy "read own conversations" on public.conversations
  for select using (auth.uid()::text in (user_a, user_b));

drop policy if exists "start own conversations" on public.conversations;
create policy "start own conversations" on public.conversations
  for insert with check (auth.uid()::text in (user_a, user_b));

drop policy if exists "update own conversations" on public.conversations;
create policy "update own conversations" on public.conversations
  for update using (auth.uid()::text in (user_a, user_b))
  with check (auth.uid()::text in (user_a, user_b));

drop policy if exists "delete own conversations" on public.conversations;
create policy "delete own conversations" on public.conversations
  for delete using (auth.uid()::text in (user_a, user_b));

-- messages: readable by participants, writable only by the real sender
drop policy if exists "read messages in own chats" on public.direct_messages;
create policy "read messages in own chats" on public.direct_messages
  for select using (public.is_chat_member(chat_id));

drop policy if exists "send own messages" on public.direct_messages;
create policy "send own messages" on public.direct_messages
  for insert with check (
    sender_id = auth.uid()::text
    and public.is_chat_member(chat_id)
  );

drop policy if exists "delete messages in own chats" on public.direct_messages;
create policy "delete messages in own chats" on public.direct_messages
  for delete using (public.is_chat_member(chat_id));

-- reactions
drop policy if exists "read reactions in own chats" on public.message_reactions;
create policy "read reactions in own chats" on public.message_reactions
  for select using (public.is_chat_member(chat_id));

drop policy if exists "add own reactions" on public.message_reactions;
create policy "add own reactions" on public.message_reactions
  for insert with check (
    user_id = auth.uid()::text
    and public.is_chat_member(chat_id)
  );

drop policy if exists "remove own reactions" on public.message_reactions;
create policy "remove own reactions" on public.message_reactions
  for delete using (
    user_id = auth.uid()::text
    and public.is_chat_member(chat_id)
  );

-- read state
drop policy if exists "read receipts in own chats" on public.chat_reads;
create policy "read receipts in own chats" on public.chat_reads
  for select using (public.is_chat_member(chat_id));

drop policy if exists "write own read state" on public.chat_reads;
create policy "write own read state" on public.chat_reads
  for insert with check (
    user_id = auth.uid()::text
    and public.is_chat_member(chat_id)
  );

drop policy if exists "update own read state" on public.chat_reads;
create policy "update own read state" on public.chat_reads
  for update using (
    user_id = auth.uid()::text
    and public.is_chat_member(chat_id)
  )
  with check (
    user_id = auth.uid()::text
    and public.is_chat_member(chat_id)
  );

-- Optional legacy cleanup (only if you no longer need the old room table):
-- drop table if exists public.secret_envelopes cascade;
