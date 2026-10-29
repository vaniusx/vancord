-- Vancord v1 schema.
--
-- Adds the pieces Discord had by 2017 and that a 1.0 release needs:
--   * categories, forum channels and group DMs
--   * custom roles with per-channel permission overrides
--   * server emojis and stickers
--   * an audit log
--   * a points economy with memberships (Vancord+ / Ultra) and server boosts
--   * message replies, pins, mentions and full-text search
--   * the security and performance fixes reported by the Supabase advisors

-- ============================================================ roles & permissions

-- Permissions are a text set rather than a bitmask: readable in the database,
-- diffable in code, and the UI can render them without a decoder table.
create table if not exists public.server_roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 64),
  color text,
  permissions text[] not null default '{}',
  position integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists server_roles_server_idx
  on public.server_roles (server_id, position);
create unique index if not exists server_roles_one_default_idx
  on public.server_roles (server_id) where is_default;

create table if not exists public.member_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.server_roles (id) on delete cascade,
  primary key (user_id, role_id)
);

create index if not exists member_roles_role_idx on public.member_roles (role_id);

create table if not exists public.channel_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  role_id uuid references public.server_roles (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  allow text[] not null default '{}',
  deny text[] not null default '{}',
  constraint overrides_one_target check ((role_id is null) <> (user_id is null))
);

create unique index if not exists overrides_channel_role_idx
  on public.channel_permission_overrides (channel_id, role_id)
  where role_id is not null;
create unique index if not exists overrides_channel_user_idx
  on public.channel_permission_overrides (channel_id, user_id)
  where user_id is not null;

-- Every server gets a default role so new members inherit something.
create or replace function public.ensure_default_role(target_server uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  role_id uuid;
begin
  select id into role_id
  from server_roles
  where server_id = target_server and is_default
  limit 1;

  if role_id is null then
    insert into server_roles (server_id, name, permissions, position, is_default)
    values (target_server, 'Üye', array[
      'view_channels', 'send_messages', 'add_reactions', 'attach_files',
      'read_history', 'connect_voice', 'speak', 'use_external_emoji'
    ], 0, true)
    returning id into role_id;
  end if;

  return role_id;
end;
$$;

create or replace function public.has_permission(target_server uuid, permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from server_members m
    where m.server_id = target_server
      and m.user_id = auth.uid()
      and (
        m.role in ('owner', 'admin')
        or permission = any (
          coalesce(
            (
              select array_agg(distinct p)
              from server_roles r
              join member_roles mr on mr.role_id = r.id
              cross join unnest(r.permissions) as p
              where mr.user_id = auth.uid()
                and r.server_id = target_server
            ),
            '{}'::text[]
          )
        )
      )
  );
$$;

-- Effective permission for a channel: server-wide permission, then role
-- overrides, then the member override, which wins last.
create or replace function public.can_use_channel(target_channel uuid, permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  chan record;
  verdict boolean;
begin
  select c.id, c.server_id, c.type into chan
  from channels c where c.id = target_channel;

  if chan.id is null then
    return false;
  end if;

  if chan.type in ('dm', 'group') then
    return exists (
      select 1 from channel_members
      where channel_id = chan.id and user_id = auth.uid()
    );
  end if;

  if chan.server_id is null then
    return false;
  end if;

  if not public.is_server_member(chan.server_id) then
    return false;
  end if;

  verdict := public.has_permission(chan.server_id, permission);

  -- Role overrides apply in role position order, most senior last.
  select
    case
      when permission = any(o.allow) then true
      when permission = any(o.deny) then false
      else verdict
    end
  into verdict
  from channel_permission_overrides o
  join server_roles r on r.id = o.role_id
  join member_roles mr on mr.role_id = r.id and mr.user_id = auth.uid()
  where o.channel_id = chan.id and o.role_id is not null
  order by r.position asc;

  select
    case
      when permission = any(o.allow) then true
      when permission = any(o.deny) then false
      else verdict
    end
  into verdict
  from channel_permission_overrides o
  where o.channel_id = chan.id and o.user_id = auth.uid();

  return coalesce(verdict, false);
end;
$$;

-- ============================================================ channels

alter table public.channels
  add column if not exists category_id uuid references public.channels (id) on delete set null,
  add column if not exists slowmode_seconds integer not null default 0
    check (slowmode_seconds between 0 and 21600),
  add column if not exists user_limit integer check (user_limit is null or user_limit between 0 and 99),
  add column if not exists nsfw boolean not null default false,
  add column if not exists archived boolean not null default false;

create index if not exists channels_category_idx
  on public.channels (category_id, position);

-- Group DMs and categories need a name without a server / text channels need a
-- server. Replace the original two-way check with one that covers all types.
alter table public.channels drop constraint if exists channels_scope;
alter table public.channels add constraint channels_scope check (
  (type in ('text', 'voice', 'forum', 'category') and server_id is not null and name is not null)
  or (type in ('dm', 'group') and server_id is null)
);

-- ============================================================ messages

alter table public.messages
  add column if not exists reply_to_id uuid references public.messages (id) on delete set null,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users (id) on delete set null,
  add column if not exists search tsvector;

create index if not exists messages_reply_idx on public.messages (reply_to_id);
create index if not exists messages_pinned_idx
  on public.messages (channel_id, pinned_at desc) where pinned_at is not null;
create index if not exists messages_search_idx on public.messages using gin (search);

create or replace function public.messages_update_search()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search := to_tsvector('simple', coalesce(new.content, ''));
  return new;
end;
$$;

drop trigger if exists messages_search_update on public.messages;
create trigger messages_search_update
  before insert or update of content on public.messages
  for each row execute function public.messages_update_search();

update public.messages
set search = to_tsvector('simple', coalesce(content, ''))
where search is null;

create table if not exists public.message_mentions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (message_id, user_id)
);

create index if not exists message_mentions_user_idx
  on public.message_mentions (user_id);

-- @username and @everyone are resolved server side so a client cannot forge a
-- mention for somebody who was never addressed.
create or replace function public.messages_extract_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into message_mentions (message_id, user_id)
  select distinct new.id, p.id
  from profiles p
  where new.content ~ ('(^|\s)@' || p.username::text || '(\s|$|[.,!?])')
  on conflict do nothing;

  if new.content ~ '(^|\s)@everyone(\s|$|[.,!?])' then
    insert into message_mentions (message_id, user_id)
    select new.id, m.user_id
    from channels c
    join server_members m on m.server_id = c.server_id
    where c.id = new.channel_id
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_extract_mentions on public.messages;
create trigger messages_extract_mentions
  after insert on public.messages
  for each row execute function public.messages_extract_mentions();

-- ============================================================ server assets

create table if not exists public.server_emojis (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9_]{2,32}$'),
  storage_path text not null,
  animated boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (server_id, name)
);

create index if not exists server_emojis_server_idx on public.server_emojis (server_id);

create table if not exists public.server_stickers (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 32),
  storage_path text not null,
  description text check (description is null or char_length(description) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists server_stickers_server_idx on public.server_stickers (server_id);

-- ============================================================ audit log

create table if not exists public.audit_log (
  id bigserial primary key,
  server_id uuid not null references public.servers (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_server_idx
  on public.audit_log (server_id, created_at desc);

create or replace function public.record_audit(
  target_server uuid,
  action text,
  target_id text default null,
  metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into audit_log (server_id, actor_id, action, target_id, metadata)
  values (target_server, auth.uid(), action, target_id, metadata);
$$;

-- ============================================================ economy

-- Append-only ledger. Balance is always derived, never stored, so it cannot
-- drift and a client cannot set it.
create table if not exists public.point_events (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);

create index if not exists point_events_user_idx
  on public.point_events (user_id, created_at desc);
create unique index if not exists point_events_dedupe_idx
  on public.point_events (user_id, reason, ref) where ref is not null;

create or replace view public.point_balances
with (security_invoker = true) as
select user_id, coalesce(sum(amount), 0)::integer as balance
from public.point_events
group by user_id;

create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null check (tier in ('plus', 'ultra')),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cosmetics (
  user_id uuid not null references auth.users (id) on delete cascade,
  sku text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, sku)
);

create table if not exists public.server_boosts (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists server_boosts_server_idx
  on public.server_boosts (server_id, expires_at desc);

create or replace function public.active_boost_count(target_server uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from server_boosts
  where server_id = target_server and expires_at > now();
$$;

create or replace function public.boost_level(target_server uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when count >= 14 then 3
    when count >= 7 then 2
    when count >= 2 then 1
    else 0
  end
  from (select public.active_boost_count(target_server) as count) t;
$$;

-- Voice presence, used to pay for time actually spent in a call.
create table if not exists public.voice_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  minutes_paid integer not null default 0,
  primary key (user_id, channel_id)
);

create or replace function public.award_points(
  target_user uuid,
  amount integer,
  reason text,
  ref text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into point_events (user_id, amount, reason, ref)
  values (target_user, amount, reason, ref)
  on conflict do nothing;
$$;

-- One point per message, at most one per minute per user, only in server text
-- channels, only for messages with real content, never for bots or DMs.
create or replace function public.award_message_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chan record;
begin
  if new.author_id is null or new.bot_id is not null then
    return new;
  end if;
  if char_length(btrim(new.content)) < 5 then
    return new;
  end if;

  select type, server_id into chan from channels where id = new.channel_id;
  if chan.type <> 'text' then
    return new;
  end if;

  insert into point_events (user_id, amount, reason, ref)
  select new.author_id, 1, 'message', to_char(now(), 'YYYY-MM-DD"T"HH24:MI')
  where not exists (
    select 1 from point_events
    where user_id = new.author_id
      and reason = 'message'
      and created_at > now() - interval '60 seconds'
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists messages_award_points on public.messages;
create trigger messages_award_points
  after insert on public.messages
  for each row execute function public.award_message_points();

-- Client heartbeat: two points per elapsed minute, capped by real elapsed time
-- so a tampered client cannot claim more than it waited for.
create or replace function public.voice_heartbeat(target_channel uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  elapsed interval;
  earned integer := 0;
  today_total integer;
begin
  if not public.can_use_channel(target_channel, 'speak') then
    return 0;
  end if;

  select now() - last_seen into elapsed
  from voice_sessions
  where user_id = auth.uid() and channel_id = target_channel;

  if elapsed is null then
    insert into voice_sessions (user_id, channel_id)
    values (auth.uid(), target_channel)
    on conflict (user_id, channel_id) do update set last_seen = now();
    return 0;
  end if;

  if elapsed < interval '55 seconds' then
    update voice_sessions set last_seen = now()
    where user_id = auth.uid() and channel_id = target_channel;
    return 0;
  end if;

  select coalesce(sum(amount), 0) into today_total
  from point_events
  where user_id = auth.uid()
    and reason = 'voice'
    and created_at > date_trunc('day', now());

  earned := least(2, greatest(0, 120 - today_total));

  if earned > 0 then
    insert into point_events (user_id, amount, reason, ref)
    values (
      auth.uid(),
      earned,
      'voice',
      to_char(now(), 'YYYY-MM-DD"T"HH24:MI')
    )
    on conflict do nothing;
  end if;

  update voice_sessions
  set last_seen = now(), minutes_paid = minutes_paid + 1
  where user_id = auth.uid() and channel_id = target_channel;

  return earned;
end;
$$;

create table if not exists public.shop_items (
  sku text primary key,
  kind text not null check (kind in ('membership', 'boost', 'cosmetic', 'theme')),
  name_tr text not null,
  name_en text not null,
  description_tr text not null,
  description_en text not null,
  price integer not null check (price > 0),
  duration_days integer,
  metadata jsonb not null default '{}'::jsonb,
  sort integer not null default 100
);

insert into public.shop_items (sku, kind, name_tr, name_en, description_tr, description_en, price, duration_days, metadata, sort) values
  ('vancord_plus_30', 'membership', 'Vancord+ (30 gün)', 'Vancord+ (30 days)',
   'Hareketli avatar ve banner, 10 ek tema, 25 MB yükleme, 720p60 yayın.',
   'Animated avatar and banner, 10 extra themes, 25 MB uploads, 720p60 streaming.',
   3000, 30, '{"tier":"plus"}', 10),
  ('vancord_ultra_30', 'membership', 'Vancord Ultra (30 gün)', 'Vancord Ultra (30 days)',
   'Plus''un tamamı, profil teması, avatar süsü, 1080p60 yayın, 100 MB yükleme, ayda 2 ücretsiz takviye.',
   'Everything in Plus, profile theme, avatar decoration, 1080p60 streaming, 100 MB uploads, 2 free boosts a month.',
   6000, 30, '{"tier":"ultra"}', 20),
  ('boost_30', 'boost', 'Sunucu Takviyesi (30 gün)', 'Server Boost (30 days)',
   'Bir sunucuyu 30 gün boyunca takviyeler. Seviye 3''te animasyonlu sunucu ikonu açılır.',
   'Boosts a server for 30 days. Level 3 unlocks an animated server icon.',
   1000, 30, '{}', 30),
  ('theme_pack_premium', 'theme', 'Premium tema paketi', 'Premium theme pack',
   'On ek renk paleti: sis, orman, okyanus, gün batımı, lav, buz, kum, gece yarısı, kakao, leylak.',
   'Ten extra palettes: mist, forest, ocean, sunset, lava, ice, sand, midnight, cocoa, lilac.',
   1200, null, '{}', 40),
  ('badge_ember', 'cosmetic', 'Kor rozeti', 'Ember badge',
   'Profilinde görünen kalıcı bir kozmetik rozet.', 'A permanent cosmetic badge shown on your profile.',
   800, null, '{"icon":"flame"}', 50),
  ('badge_aurora', 'cosmetic', 'Kutup Işığı rozeti', 'Aurora badge',
   'Profilinde görünen kalıcı bir kozmetik rozet.', 'A permanent cosmetic badge shown on your profile.',
   1500, null, '{"icon":"spark"}', 60)
on conflict (sku) do update set
  name_tr = excluded.name_tr,
  name_en = excluded.name_en,
  description_tr = excluded.description_tr,
  description_en = excluded.description_en,
  price = excluded.price,
  sort = excluded.sort;

create or replace function public.purchase_item(target_sku text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  current_balance integer;
  new_expiry timestamptz;
begin
  select * into item from shop_items where sku = target_sku;
  if item.sku is null then
    raise exception 'unknown_item';
  end if;

  select coalesce(balance, 0) into current_balance
  from point_balances where user_id = auth.uid();
  current_balance := coalesce(current_balance, 0);

  if current_balance < item.price then
    raise exception 'insufficient_points';
  end if;

  insert into point_events (user_id, amount, reason, ref)
  values (auth.uid(), -item.price, 'purchase', target_sku || ':' || gen_random_uuid()::text);

  if item.kind = 'membership' then
    new_expiry := greatest(
      now(),
      coalesce((select expires_at from memberships where user_id = auth.uid()), now())
    ) + make_interval(days => item.duration_days);

    insert into memberships (user_id, tier, expires_at)
    values (auth.uid(), item.metadata ->> 'tier', new_expiry)
    on conflict (user_id) do update
      set tier = excluded.tier, expires_at = excluded.expires_at, updated_at = now();
  elsif item.kind = 'cosmetic' or item.kind = 'theme' then
    insert into cosmetics (user_id, sku) values (auth.uid(), target_sku)
    on conflict do nothing;
  elsif item.kind = 'boost' then
    -- A boost needs a target server; the caller passes it via `ref`.
    raise exception 'boost_requires_server';
  end if;

  return target_sku;
end;
$$;

create or replace function public.boost_server(target_server uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  price integer;
  expiry timestamptz;
  current_balance integer;
begin
  if not public.is_server_member(target_server) then
    raise exception 'not_a_member';
  end if;

  select price into price from shop_items where sku = 'boost_30';
  select coalesce(balance, 0) into current_balance
  from point_balances where user_id = auth.uid();
  current_balance := coalesce(current_balance, 0);

  if current_balance < price then
    raise exception 'insufficient_points';
  end if;

  insert into point_events (user_id, amount, reason, ref)
  values (auth.uid(), -price, 'boost', target_server::text || ':' || gen_random_uuid()::text);

  expiry := now() + interval '30 days';
  insert into server_boosts (server_id, user_id, expires_at)
  values (target_server, auth.uid(), expiry);

  perform public.record_audit(target_server, 'boost.added', null, '{}'::jsonb);
  return expiry;
end;
$$;

create or replace function public.claim_daily()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  today text := to_char(now(), 'YYYY-MM-DD');
  yesterday text := to_char(now() - interval '1 day', 'YYYY-MM-DD');
  streak integer;
  reward integer;
begin
  if exists (
    select 1 from point_events
    where user_id = auth.uid() and reason = 'daily' and ref = today
  ) then
    return 0;
  end if;

  select count(*) into streak
  from point_events
  where user_id = auth.uid() and reason = 'daily' and ref = yesterday;

  reward := case when streak > 0 then 15 else 10 end;

  insert into point_events (user_id, amount, reason, ref)
  values (auth.uid(), reward, 'daily', today)
  on conflict do nothing;

  return reward;
end;
$$;

-- ============================================================ helper: create server

create or replace function public.create_server_v1(server_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_server_id uuid;
  default_role uuid;
  general_id uuid;
  category_id uuid;
begin
  insert into servers (name, owner_id)
  values (server_name, auth.uid())
  returning id into new_server_id;

  insert into server_members (server_id, user_id, role)
  values (new_server_id, auth.uid(), 'owner');

  default_role := public.ensure_default_role(new_server_id);

  insert into channels (server_id, type, name, position)
  values (new_server_id, 'category', 'Metin Kanalları', 0)
  returning id into category_id;

  insert into channels (server_id, type, name, topic, position, category_id)
  values (new_server_id, 'text', 'genel', 'Sunucunun ilk kanalı', 1, category_id)
  returning id into general_id;

  insert into channels (server_id, type, name, position, category_id)
  values (new_server_id, 'category', 'Ses Kanalları', 2);

  perform public.record_audit(new_server_id, 'server.created', new_server_id::text, '{}'::jsonb);

  return new_server_id;
end;
$$;

-- ============================================================ RLS for new tables

alter table public.server_roles enable row level security;
alter table public.member_roles enable row level security;
alter table public.channel_permission_overrides enable row level security;
alter table public.message_mentions enable row level security;
alter table public.server_emojis enable row level security;
alter table public.server_stickers enable row level security;
alter table public.audit_log enable row level security;
alter table public.point_events enable row level security;
alter table public.memberships enable row level security;
alter table public.cosmetics enable row level security;
alter table public.server_boosts enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.shop_items enable row level security;

drop policy if exists "members read roles" on public.server_roles;
create policy "members read roles" on public.server_roles
  for select to authenticated using (public.is_server_member(server_id));

drop policy if exists "admins manage roles" on public.server_roles;
create policy "admins manage roles" on public.server_roles
  for all to authenticated
  using (public.has_permission(server_id, 'manage_roles'))
  with check (public.has_permission(server_id, 'manage_roles'));

drop policy if exists "members read member roles" on public.member_roles;
create policy "members read member roles" on public.member_roles
  for select to authenticated using (
    exists (
      select 1 from server_roles r
      where r.id = member_roles.role_id and public.is_server_member(r.server_id)
    )
  );

drop policy if exists "admins manage member roles" on public.member_roles;
create policy "admins manage member roles" on public.member_roles
  for all to authenticated
  using (
    exists (
      select 1 from server_roles r
      where r.id = member_roles.role_id and public.has_permission(r.server_id, 'manage_roles')
    )
  )
  with check (
    exists (
      select 1 from server_roles r
      where r.id = member_roles.role_id and public.has_permission(r.server_id, 'manage_roles')
    )
  );

drop policy if exists "members read overrides" on public.channel_permission_overrides;
create policy "members read overrides" on public.channel_permission_overrides
  for select to authenticated using (public.can_access_channel(channel_id));

drop policy if exists "admins manage overrides" on public.channel_permission_overrides;
create policy "admins manage overrides" on public.channel_permission_overrides
  for all to authenticated
  using (
    exists (
      select 1 from channels c
      where c.id = channel_permission_overrides.channel_id
        and c.server_id is not null
        and public.has_permission(c.server_id, 'manage_channels')
    )
  )
  with check (
    exists (
      select 1 from channels c
      where c.id = channel_permission_overrides.channel_id
        and c.server_id is not null
        and public.has_permission(c.server_id, 'manage_channels')
    )
  );

drop policy if exists "users read their mentions" on public.message_mentions;
create policy "users read their mentions" on public.message_mentions
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (
      select 1 from messages m
      where m.id = message_mentions.message_id and m.author_id = (select auth.uid())
    )
  );

drop policy if exists "members read emojis" on public.server_emojis;
create policy "members read emojis" on public.server_emojis
  for select to authenticated using (public.is_server_member(server_id));

drop policy if exists "admins manage emojis" on public.server_emojis;
create policy "admins manage emojis" on public.server_emojis
  for all to authenticated
  using (public.has_permission(server_id, 'manage_emojis'))
  with check (public.has_permission(server_id, 'manage_emojis'));

drop policy if exists "members read stickers" on public.server_stickers;
create policy "members read stickers" on public.server_stickers
  for select to authenticated using (public.is_server_member(server_id));

drop policy if exists "admins manage stickers" on public.server_stickers;
create policy "admins manage stickers" on public.server_stickers
  for all to authenticated
  using (public.has_permission(server_id, 'manage_emojis'))
  with check (public.has_permission(server_id, 'manage_emojis'));

drop policy if exists "admins read audit log" on public.audit_log;
create policy "admins read audit log" on public.audit_log
  for select to authenticated using (public.has_permission(server_id, 'view_audit_log'));

drop policy if exists "users read their points" on public.point_events;
create policy "users read their points" on public.point_events
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users read their membership" on public.memberships;
create policy "users read their membership" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "users read their cosmetics" on public.cosmetics;
create policy "users read their cosmetics" on public.cosmetics
  for select to authenticated using (user_id = (select auth.uid()));

-- Public: everyone can see who boosted a server.
drop policy if exists "anyone reads boosts" on public.server_boosts;
create policy "anyone reads boosts" on public.server_boosts
  for select to authenticated using (true);

drop policy if exists "users manage their voice session" on public.voice_sessions;
create policy "users manage their voice session" on public.voice_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "everyone reads shop" on public.shop_items;
create policy "everyone reads shop" on public.shop_items
  for select to authenticated using (true);

-- ============================================================ security fixes

-- Advisors: helper functions must not be callable by an anonymous session.
revoke execute on function public.friend_ids() from anon;
revoke execute on function public.is_banned(uuid) from anon;
revoke execute on function public.is_timed_out(uuid) from anon;
revoke execute on function public.next_channel_position(uuid) from anon;
revoke execute on function public.can_access_channel(uuid) from anon;
revoke execute on function public.is_server_member(uuid) from anon;
revoke execute on function public.is_server_admin(uuid) from anon;
revoke execute on function public.server_role_of(uuid) from anon;
revoke execute on function public.mark_channel_read(uuid) from anon;
revoke execute on function public.unread_counts() from anon;

-- Advisors: pin the search path on the remaining unpinned function.
create or replace function public.bot_risk_tier(target_bot uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when b.permissions && array['members.moderate', 'channels.manage'] then 3
        when b.permissions && array['messages.send', 'messages.delete'] then 2
        else 1
      end
      from bots b where b.id = target_bot
    ),
    1
  );
$$;

-- Advisors: cover the foreign keys that had no index.
create index if not exists bot_installs_installed_by_idx on public.bot_installs (installed_by);
create index if not exists bots_approved_by_idx on public.bots (approved_by);
create index if not exists channel_reads_user_idx on public.channel_reads (user_id);
create index if not exists invites_created_by_idx on public.invites (created_by);
create index if not exists member_timeouts_created_by_idx on public.member_timeouts (created_by);
create index if not exists member_timeouts_user_idx on public.member_timeouts (user_id);
create index if not exists messages_bot_idx on public.messages (bot_id);
create index if not exists mod_actions_actor_idx on public.mod_actions (actor_id);
create index if not exists mod_actions_target_idx on public.mod_actions (target_id);
create index if not exists reactions_user_idx on public.reactions (user_id);
create index if not exists server_automod_log_idx on public.server_automod (log_channel_id);
create index if not exists server_bans_banned_by_idx on public.server_bans (banned_by);
create index if not exists server_bans_user_idx on public.server_bans (user_id);
create index if not exists user_badges_badge_idx on public.user_badges (badge_id);
create index if not exists user_badges_granted_by_idx on public.user_badges (granted_by);
