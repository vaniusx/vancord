-- Hardening pass:
-- 1. Trigger functions get an explicit search_path.
-- 2. Anonymous visitors lose EXECUTE on every security definer helper.
-- 3. citext moves out of the exposed public schema.
-- 4. Trigger functions resolve citext from the extensions schema.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.mark_message_edited()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.content is distinct from old.content then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

revoke execute on function public.is_server_member(uuid) from anon, public;
revoke execute on function public.server_role_of(uuid) from anon, public;
revoke execute on function public.is_server_admin(uuid) from anon, public;
revoke execute on function public.can_access_channel(uuid) from anon, public;
revoke execute on function public.find_user_by_username(text) from anon, public;
revoke execute on function public.create_invite(uuid, integer, integer) from anon, public;
revoke execute on function public.join_server(text) from anon, public;
revoke execute on function public.start_dm(uuid) from anon, public;
revoke execute on function public.unread_counts() from anon, public;
revoke execute on function public.mark_channel_read(uuid) from anon, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.mark_message_edited() from anon, authenticated, public;

alter extension citext set schema extensions;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
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
  while exists (
    select 1 from public.profiles where username = candidate::extensions.citext
  ) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate::extensions.citext,
    coalesce(new.raw_user_meta_data ->> 'display_name', candidate)
  );

  insert into public.servers (name, owner_id)
  values (
    coalesce(new.raw_user_meta_data ->> 'display_name', candidate) || ' sunucusu',
    new.id
  )
  returning id into new_server_id;

  insert into public.server_members (server_id, user_id, role)
  values (new_server_id, new.id, 'owner');

  insert into public.channels (server_id, type, name, topic, position)
  values (new_server_id, 'text', 'genel', 'Sunucunun ilk kanalı', 0);

  return new;
end;
$$;

create or replace function public.find_user_by_username(target_username text)
returns table (id uuid, username extensions.citext, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where p.username = target_username::extensions.citext
  limit 1;
$$;
