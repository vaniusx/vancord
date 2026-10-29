-- Vancord initial schema: profiles, servers, channels, messages, DMs, friends.
-- Every table is protected by row level security; helper functions are
-- security definer so policies never recurse into the table they guard.

create extension if not exists citext;
create extension if not exists pgcrypto;

create type public.server_role as enum ('owner', 'admin', 'member');
create type public.channel_type as enum ('text', 'dm');
create type public.presence_status as enum ('online', 'idle', 'dnd', 'invisible', 'offline');
create type public.friendship_status as enum ('pending', 'accepted', 'blocked');

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique
    check (char_length(username::text) between 2 and 32),
  display_name text not null
    check (char_length(display_name) between 1 and 64),
  avatar_url text,
  accent_color text not null default '#6366f1',
  status public.presence_status not null default 'online',
  custom_status text check (custom_status is null or char_length(custom_status) <= 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

-- ---------------------------------------------------------------- servers

create table public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  icon_url text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index servers_owner_idx on public.servers (owner_id);

create table public.server_members (
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.server_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create index server_members_user_idx on public.server_members (user_id);

-- ---------------------------------------------------------------- channels

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references public.servers (id) on delete cascade,
  type public.channel_type not null default 'text',
  name text check (name is null or char_length(name) between 1 and 100),
  topic text check (topic is null or char_length(topic) <= 1024),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint channels_scope check (
    (type = 'text' and server_id is not null and name is not null)
    or (type = 'dm' and server_id is null and name is null)
  )
);

create index channels_server_idx on public.channels (server_id, position);

create table public.channel_members (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (channel_id, user_id)
);

create index channel_members_user_idx on public.channel_members (user_id);

-- ---------------------------------------------------------------- messages

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  content text not null default '' check (char_length(content) <= 4000),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index messages_channel_created_idx
  on public.messages (channel_id, created_at desc, id desc);
create index messages_author_idx on public.messages (author_id);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null,
  mime text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  created_at timestamptz not null default now()
);

create index message_attachments_message_idx
  on public.message_attachments (message_id);

create table public.reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index reactions_message_idx on public.reactions (message_id);

create table public.channel_reads (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- ---------------------------------------------------------------- social

create table public.friendships (
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create index friendships_addressee_idx
  on public.friendships (addressee_id, status);

create table public.invites (
  code text primary key check (char_length(code) between 6 and 32),
  server_id uuid not null references public.servers (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now()
);

create index invites_server_idx on public.invites (server_id);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_server_member(target_server uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from server_members
    where server_id = target_server
      and user_id = auth.uid()
  );
$$;

create or replace function public.server_role_of(target_server uuid)
returns public.server_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from server_members
  where server_id = target_server
    and user_id = auth.uid();
$$;

create or replace function public.is_server_admin(target_server uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('owner', 'admin')
     from server_members
     where server_id = target_server
       and user_id = auth.uid()),
    false
  );
$$;

create or replace function public.can_access_channel(target_channel uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from channels c
    where c.id = target_channel
      and (
        (c.type = 'text' and public.is_server_member(c.server_id))
        or (
          c.type = 'dm'
          and exists (
            select 1
            from channel_members m
            where m.channel_id = c.id
              and m.user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.find_user_by_username(target_username text)
returns table (id uuid, username citext, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from profiles p
  where p.username = target_username::citext
  limit 1;
$$;

-- ---------------------------------------------------------------- triggers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

create or replace function public.mark_message_edited()
returns trigger
language plpgsql
as $$
begin
  if new.content is distinct from old.content then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

create trigger messages_mark_edited
  before update on public.messages
  for each row execute function public.mark_message_edited();

-- A new auth user gets a profile plus a personal server with one channel.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
  new_server_id uuid;
begin
  base_username := lower(
    coalesce(
      new.raw_user_meta_data ->> 'username',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );
  base_username := regexp_replace(base_username, '[^a-z0-9_.]', '', 'g');
  if char_length(base_username) < 2 then
    base_username := 'user';
  end if;
  base_username := left(base_username, 28);

  candidate := base_username;
  while exists (select 1 from profiles where username = candidate::citext) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'display_name', candidate)
  );

  insert into servers (name, owner_id)
  values (coalesce(new.raw_user_meta_data ->> 'display_name', candidate) || ' sunucusu', new.id)
  returning id into new_server_id;

  insert into server_members (server_id, user_id, role)
  values (new_server_id, new.id, 'owner');

  insert into channels (server_id, type, name, topic, position)
  values (new_server_id, 'text', 'genel', 'Sunucunun ilk kanalı', 0);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- rpc

create or replace function public.create_invite(
  target_server uuid,
  expires_in_hours integer default 24,
  max_uses integer default 10
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_server_admin(target_server) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  new_code := encode(gen_random_bytes(6), 'hex');

  insert into invites (code, server_id, created_by, expires_at, max_uses)
  values (
    new_code,
    target_server,
    auth.uid(),
    case
      when expires_in_hours is null or expires_in_hours <= 0 then null
      else now() + make_interval(hours => expires_in_hours)
    end,
    max_uses
  );

  return new_code;
end;
$$;

create or replace function public.join_server(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.invites;
begin
  select * into target
  from invites
  where code = invite_code
  for update;

  if target.code is null then
    raise exception 'invalid invite' using errcode = '22023';
  end if;

  if target.expires_at is not null and target.expires_at < now() then
    raise exception 'invite expired' using errcode = '22023';
  end if;

  if target.max_uses is not null and target.uses >= target.max_uses then
    raise exception 'invite exhausted' using errcode = '22023';
  end if;

  insert into server_members (server_id, user_id, role)
  values (target.server_id, auth.uid(), 'member')
  on conflict (server_id, user_id) do nothing;

  update invites
  set uses = uses + 1
  where code = invite_code;

  return target.server_id;
end;
$$;

create or replace function public.start_dm(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing uuid;
  created uuid;
begin
  if other_user = auth.uid() then
    raise exception 'cannot DM yourself' using errcode = '22023';
  end if;

  select c.id into existing
  from channels c
  join channel_members a on a.channel_id = c.id and a.user_id = auth.uid()
  join channel_members b on b.channel_id = c.id and b.user_id = other_user
  where c.type = 'dm'
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into channels (type) values ('dm') returning id into created;

  insert into channel_members (channel_id, user_id)
  values (created, auth.uid()), (created, other_user);

  return created;
end;
$$;

create or replace function public.unread_counts()
returns table (channel_id uuid, unread bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.channel_id, count(*)::bigint as unread
  from messages m
  left join channel_reads r
    on r.channel_id = m.channel_id
   and r.user_id = auth.uid()
  where m.deleted_at is null
    and m.author_id <> auth.uid()
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    and public.can_access_channel(m.channel_id)
  group by m.channel_id;
$$;

create or replace function public.mark_channel_read(target_channel uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into channel_reads (channel_id, user_id, last_read_at)
  values (target_channel, auth.uid(), now())
  on conflict (channel_id, user_id)
  do update set last_read_at = excluded.last_read_at;
$$;

-- ---------------------------------------------------------------- rls

alter table public.profiles enable row level security;