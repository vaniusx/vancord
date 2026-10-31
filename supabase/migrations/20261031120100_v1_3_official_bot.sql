-- The official Vancord bot.
--
-- It is a row in `bots` with status 'official' and no webhook: instead of being
-- called over HTTP it runs inside the database, writing messages directly. It is
-- never listed as a member and never appears in the member list; only the
-- messages it writes carry its name.
--
-- Applied to the live project on 2026-10-31 as `v1_3_official_bot`.

alter table public.bots drop constraint if exists bots_status_check;
alter table public.bots
  add constraint bots_status_check
  check (status in ('draft', 'pending', 'approved', 'rejected', 'disabled', 'official'));

-- Webhook is not needed by an in-database bot.
alter table public.bots alter column webhook_url drop not null;
alter table public.bots alter column owner_id drop not null;

create unique index if not exists bots_one_official_idx
  on public.bots ((status)) where status = 'official';

create or replace function public.official_bot_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from bots where status = 'official' limit 1;
$$;

-- Server-level switches for the official bot. Absent means "use the default".
create table if not exists public.official_bot_settings (
  server_id uuid primary key references public.servers (id) on delete cascade,
  welcome_enabled boolean not null default true,
  modlog_enabled boolean not null default true,
  boost_messages boolean not null default true,
  stats_channel_id uuid references public.channels (id) on delete set null,
  welcome_channel_id uuid references public.channels (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.official_bot_settings enable row level security;

drop policy if exists "members read official settings" on public.official_bot_settings;
create policy "members read official settings" on public.official_bot_settings
  for select to authenticated using (public.is_server_member(server_id));

drop policy if exists "admins manage official settings" on public.official_bot_settings;
create policy "admins manage official settings" on public.official_bot_settings
  for all to authenticated
  using (public.has_permission(server_id, 'manage_roles'))
  with check (public.has_permission(server_id, 'manage_roles'));

-- Post a message as the official bot.
create or replace function public.bot_say(target_channel uuid, body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  bot uuid := public.official_bot_id();
  new_message uuid;
begin
  if bot is null then
    return null;
  end if;

  insert into messages (channel_id, author_id, bot_id, content)
  values (target_channel, null, bot, body)
  returning id into new_message;

  return new_message;
end;
$$;

revoke all on function public.bot_say(uuid, text) from anon, authenticated, public;

-- Welcome: a new member gets a greeting in the configured channel. Creating a
-- server inserts the owner as a member, which would otherwise post a "welcome to
-- your own server" message every time, so owners and the first member skip it.
create or replace function public.official_welcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg record;
  member_name text;
  target uuid;
  member_count integer;
begin
  if new.role = 'owner' then
    return new;
  end if;

  select count(*) into member_count
  from server_members where server_id = new.server_id;
  if member_count <= 1 then
    return new;
  end if;

  select welcome_enabled, welcome_channel_id into cfg
  from official_bot_settings where server_id = new.server_id;

  if cfg.welcome_enabled is false then
    return new;
  end if;

  target := coalesce(
    cfg.welcome_channel_id,
    (select system_channel_id from servers where id = new.server_id),
    (select id from channels where server_id = new.server_id and type = 'text'
       order by position limit 1)
  );

  if target is null then
    return new;
  end if;

  select display_name into member_name from profiles where id = new.user_id;

  perform public.bot_say(
    target,
    format('**%s** sunucuya katıldı. Hoş geldin!', coalesce(member_name, 'Yeni üye'))
  );

  return new;
end;
$$;

drop trigger if exists official_welcome on public.server_members;
create trigger official_welcome
  after insert on public.server_members
  for each row execute function public.official_welcome();

-- Moderation log: copy every mod_actions row into the server's log channel.
create or replace function public.official_modlog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg record;
  target uuid;
  actor_name text;
  target_name text;
  action_label text;
begin
  select modlog_enabled into cfg from official_bot_settings where server_id = new.server_id;
  if cfg.modlog_enabled is false then
    return new;
  end if;

  select log_channel_id into target from server_automod where server_id = new.server_id;
  if target is null then
    target := (select id from channels
               where server_id = new.server_id and name = 'mod-log' limit 1);
  end if;
  if target is null then
    return new;
  end if;

  select display_name into actor_name from profiles where id = new.actor_id;
  select display_name into target_name from profiles where id = new.target_id;

  action_label := case new.action
    when 'timeout' then 'susturuldu'
    when 'kick' then 'atıldı'
    when 'ban' then 'yasaklandı'
    when 'unban' then 'yasağı kaldırıldı'
    when 'message_delete' then 'mesajı silindi'
    else new.action
  end;

  perform public.bot_say(
    target,
    format('%s → **%s** %s', coalesce(actor_name, 'Sistem'),
           coalesce(target_name, 'bilinmeyen'), action_label)
  );

  return new;
end;
$$;

drop trigger if exists official_modlog on public.mod_actions;
create trigger official_modlog
  after insert on public.mod_actions
  for each row execute function public.official_modlog();

-- Boost announcement.
create or replace function public.official_boost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg record;
  target uuid;
  booster text;
  level integer;
begin
  select boost_messages into cfg from official_bot_settings where server_id = new.server_id;
  if cfg.boost_messages is false then
    return new;
  end if;

  target := coalesce(
    (select system_channel_id from servers where id = new.server_id),
    (select id from channels where server_id = new.server_id and type = 'text'
       order by position limit 1)
  );
  if target is null then
    return new;
  end if;

  select display_name into booster from profiles where id = new.user_id;
  level := public.boost_level(new.server_id);

  perform public.bot_say(
    target,
    format('**%s** sunucuyu takviyeledi. Seviye %s!', coalesce(booster, 'Biri'), level)
  );

  return new;
end;
$$;

drop trigger if exists official_boost on public.server_boosts;
create trigger official_boost
  after insert on public.server_boosts
  for each row execute function public.official_boost();

revoke all on function public.official_bot_id() from anon, authenticated, public;
revoke all on function public.official_welcome() from anon, authenticated, public;
revoke all on function public.official_modlog() from anon, authenticated, public;
revoke all on function public.official_boost() from anon, authenticated, public;

-- Seed the bot row itself. The token columns are unused by an in-database bot,
-- but they are NOT NULL, so a placeholder is stored instead of a real secret.
insert into public.bots (owner_id, name, description, avatar_url, token_hash, token_prefix, webhook_url, permissions, risk_tier, status)
values (
  null,
  'Vancord',
  'Resmî Vancord botu. Karşılama, moderasyon kaydı ve takviye bildirimlerini yönetir.',
  null,
  'official-no-token',
  'official',
  null,
  array['messages.send'],
  1,
  'official'
)
on conflict do nothing;

-- Every existing server keeps the defaults.
insert into public.official_bot_settings (server_id)
select id from public.servers
on conflict (server_id) do nothing;
