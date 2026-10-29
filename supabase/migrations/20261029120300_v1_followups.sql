-- v1 follow-ups applied after the initial schema, captured here so a fresh
-- database converges to the same state.

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
        (c.type in ('text', 'voice', 'forum', 'category')
          and c.server_id is not null
          and public.is_server_member(c.server_id))
        or (c.type in ('dm', 'group')
          and exists (
            select 1 from channel_members m
            where m.channel_id = c.id and m.user_id = auth.uid()
          ))
      )
  );
$$;

create or replace function public.start_group_dm(member_ids uuid[], group_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_channel uuid;
  unique_members uuid[];
begin
  select array_agg(distinct id) into unique_members
  from unnest(array_append(member_ids, auth.uid())) as id;

  if array_length(unique_members, 1) < 2 then
    raise exception 'group_needs_two_members';
  end if;
  if array_length(unique_members, 1) > 10 then
    raise exception 'group_too_large';
  end if;

  insert into channels (type, name)
  values ('group', nullif(btrim(coalesce(group_name, '')), ''))
  returning id into new_channel;

  insert into channel_members (channel_id, user_id)
  select new_channel, m from unnest(unique_members) as m;

  return new_channel;
end;
$$;

create or replace function public.add_group_member(target_channel uuid, new_member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  chan record;
  member_count integer;
begin
  select id, type into chan from channels where id = target_channel;
  if chan.type not in ('dm', 'group') then
    raise exception 'not_a_direct_channel';
  end if;
  if not exists (
    select 1 from channel_members where channel_id = target_channel and user_id = auth.uid()
  ) then
    raise exception 'not_a_participant';
  end if;

  select count(*) into member_count from channel_members where channel_id = target_channel;
  if member_count >= 10 then
    raise exception 'group_too_large';
  end if;

  insert into channel_members (channel_id, user_id)
  values (target_channel, new_member)
  on conflict do nothing;
end;
$$;

create or replace function public.mention_counts()
returns table (channel_id uuid, count integer)
language sql
stable
security definer
set search_path = public
as $$
  select m.channel_id, count(*)::integer
  from message_mentions mm
  join messages m on m.id = mm.message_id
  left join channel_reads r
    on r.channel_id = m.channel_id and r.user_id = mm.user_id
  where mm.user_id = auth.uid()
    and m.deleted_at is null
    and m.author_id <> auth.uid()
    and (r.last_read_at is null or m.created_at > r.last_read_at)
  group by m.channel_id;
$$;

create or replace function public.boost_server(target_server uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  item_price integer;
  expiry timestamptz;
  current_balance integer;
begin
  if not public.is_server_member(target_server) then
    raise exception 'not_a_member';
  end if;

  select s.price into item_price from shop_items s where s.sku = 'boost_30';
  if item_price is null then
    raise exception 'boost_not_configured';
  end if;

  select coalesce(sum(pe.amount), 0) into current_balance
  from point_events pe where pe.user_id = auth.uid();

  if current_balance < item_price then
    raise exception 'insufficient_points';
  end if;

  insert into point_events (user_id, amount, reason, ref)
  values (auth.uid(), -item_price, 'boost', target_server::text || ':' || gen_random_uuid()::text);

  expiry := now() + interval '30 days';
  insert into server_boosts (server_id, user_id, expires_at)
  values (target_server, auth.uid(), expiry);

  perform public.record_audit(target_server, 'boost.added', null, '{}'::jsonb);
  return expiry;
end;
$$;

create or replace function public.bot_risk_tier(requested text[])
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when requested && array['members.moderate', 'channels.manage'] then 3
    when requested && array['messages.manage'] then 2
    else 1
  end;
$$;

-- Functions default to EXECUTE for PUBLIC. Revoke everywhere, then grant the
-- RPCs a signed-in client actually calls.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from anon, public', fn.signature);
  end loop;
end;
$$;

do $$
declare
  allowed text[] := array[
    'is_server_member(uuid)', 'is_server_admin(uuid)', 'server_role_of(uuid)',
    'can_access_channel(uuid)', 'can_use_channel(uuid, text)', 'has_permission(uuid, text)',
    'find_user_by_username(text)', 'friend_ids()', 'unread_counts()', 'mention_counts()',
    'mark_channel_read(uuid)', 'start_dm(uuid)', 'start_group_dm(uuid[], text)',
    'add_group_member(uuid, uuid)', 'create_server(text)', 'create_server_v1(text)',
    'create_channel(uuid, text, public.channel_type, text)',
    'update_channel(uuid, text, text, boolean)', 'delete_channel(uuid)',
    'next_channel_position(uuid)', 'create_invite(uuid, integer, integer)',
    'join_server(text)', 'is_banned(uuid)', 'is_timed_out(uuid)',
    'ensure_default_role(uuid)', 'active_boost_count(uuid)', 'boost_level(uuid)',
    'purchase_item(text)', 'boost_server(uuid)', 'claim_daily()', 'voice_heartbeat(uuid)',
    'create_bot(text, text, text, text[])', 'mark_bot_tested(uuid, boolean, integer, jsonb)',
    'rotate_bot_token(uuid)', 'review_bot(uuid, text, text)',
    'bot_risk_tier(uuid)', 'bot_risk_tier(text[])'
  ];
  signature text;
begin
  foreach signature in array allowed loop
    begin
      execute format('grant execute on function public.%s to authenticated', signature);
    exception when undefined_function then
      raise notice 'missing function %', signature;
    end;
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_integration_secret'
  ) then
    revoke all on function public.get_integration_secret(text) from anon, authenticated, public;
  end if;
end;
$$;

-- A plain member has no explicit role row, so permissions fall back to the
-- server's default role. Without this an existing member could not send messages.
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
        or exists (
          select 1
          from server_roles r
          join member_roles mr on mr.role_id = r.id
          where mr.user_id = auth.uid()
            and r.server_id = target_server
            and permission = any (r.permissions)
        )
        or (
          not exists (
            select 1
            from server_roles r2
            join member_roles mr2 on mr2.role_id = r2.id
            where mr2.user_id = auth.uid() and r2.server_id = target_server
          )
          and exists (
            select 1
            from server_roles d
            where d.server_id = target_server
              and d.is_default
              and permission = any (d.permissions)
          )
        )
      )
  );
$$;

revoke all on function public.has_permission(uuid, text) from anon, public;
grant execute on function public.has_permission(uuid, text) to authenticated;

do $$
declare
  srv record;
begin
  for srv in select id from servers loop
    perform public.ensure_default_role(srv.id);
  end loop;
end;
$$;
