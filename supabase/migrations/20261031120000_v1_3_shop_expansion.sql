-- Shop items get a family so the client can group them into gallery tabs, and
-- cosmetics carry the visual data needed to render a preview.
--
-- Applied to the live project on 2026-10-31 as `v1_3_shop_expansion`.

alter table public.shop_items
  add column if not exists family text not null default 'other',
  add column if not exists preview jsonb not null default '{}'::jsonb;

-- Profile frames: eight looks, three tiers. A frame is drawn as a ring, so the
-- preview only needs two colours and a description of the ring style.
insert into public.shop_items (sku, kind, family, name_tr, name_en, description_tr, description_en, price, metadata, preview, sort) values
  ('frame_steel','cosmetic','frame','Çelik çerçeve','Steel frame','Profilden ince bir çelik halka geçer.','A thin steel ring around your avatar.',600,'{"ring":"steel"}','{"outer":"#9CA3AF","inner":"#4B5563","style":"solid"}',100),
  ('frame_ember','cosmetic','frame','Kor çerçeve','Ember frame','Kenarları köz gibi parlayan sıcak bir halka.','A warm ring with a glowing edge.',900,'{"ring":"ember"}','{"outer":"#B45309","inner":"#7C2D12","style":"glow"}',101),
  ('frame_frost','cosmetic','frame','Buz çerçeve','Frost frame','Soğuk mavi, kristal görünümlü halka.','A cold blue crystalline ring.',900,'{"ring":"frost"}','{"outer":"#60A5FA","inner":"#1E3A8A","style":"glow"}',102),
  ('frame_leaf','cosmetic','frame','Yaprak çerçeve','Leaf frame','Yeşil, doğal tonlarda çerçeve.','A green, natural ring.',800,'{"ring":"leaf"}','{"outer":"#4D7C0F","inner":"#28400A","style":"solid"}',103),
  ('frame_neon','cosmetic','frame','Neon çerçeve','Neon frame','Canlı bir neon halka.','A bright neon ring.',1500,'{"ring":"neon"}','{"outer":"#22D3EE","inner":"#0891B2","style":"glow"}',104),
  ('frame_crystal','cosmetic','frame','Kristal çerçeve','Crystal frame','Işığı kıran kristal halka.','A ring that catches the light.',1500,'{"ring":"crystal"}','{"outer":"#E879F9","inner":"#7E22CE","style":"glow"}',105),
  ('frame_gold','cosmetic','frame','Altın çerçeve','Gold frame','Parlak altın halka, Ultra üyeleri için.','A polished gold ring for Ultra members.',2500,'{"ring":"gold","tier":"ultra"}','{"outer":"#FCD34D","inner":"#B45309","style":"metal"}',106),
  ('frame_aurora','cosmetic','frame','Kutup ışığı çerçevesi','Aurora frame','Renk değiştiren bir halka, Ultra üyeleri için.','A shifting ring for Ultra members.',3000,'{"ring":"aurora","tier":"ultra"}','{"outer":"#34D399","inner":"#6366F1","style":"animated"}',107)
on conflict (sku) do update set
  family = excluded.family, preview = excluded.preview, price = excluded.price,
  name_tr = excluded.name_tr, name_en = excluded.name_en,
  description_tr = excluded.description_tr, description_en = excluded.description_en,
  sort = excluded.sort;

-- Nameplates change the colour of the display name.
insert into public.shop_items (sku, kind, family, name_tr, name_en, description_tr, description_en, price, metadata, preview, sort) values
  ('plate_ocean','cosmetic','plate','Okyanus isim plakası','Ocean nameplate','İsmin okyanus mavisine döner.','Your name turns ocean blue.',700,'{"color":"#0369A1"}','{"color":"#0369A1"}',200),
  ('plate_rose','cosmetic','plate','Gül isim plakası','Rose nameplate','İsmin gül rengine döner.','Your name turns rose.',700,'{"color":"#DB2777"}','{"color":"#DB2777"}',201),
  ('plate_gold','cosmetic','plate','Altın isim plakası','Gold nameplate','İsmin altın rengine döner.','Your name turns gold.',1600,'{"color":"#B45309"}','{"color":"#B45309"}',202)
on conflict (sku) do update set
  family = excluded.family, preview = excluded.preview, price = excluded.price,
  name_tr = excluded.name_tr, name_en = excluded.name_en,
  description_tr = excluded.description_tr, description_en = excluded.description_en,
  sort = excluded.sort;

-- Existing cosmetics get their family too.
update public.shop_items set family = 'badge' where sku like 'badge_%';
update public.shop_items set family = 'membership' where kind = 'membership';
update public.shop_items set family = 'theme' where kind = 'theme';
update public.shop_items set family = 'boost' where kind = 'boost';

create index if not exists shop_items_family_idx on public.shop_items (family, sort);

-- Perks comparison used by the store: what each tier unlocks.
create or replace function public.membership_perks()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'plus', jsonb_build_object(
      'animated_avatar', true,
      'animated_banner', true,
      'extra_themes', 10,
      'upload_mb', 25,
      'stream_quality', '720p60',
      'custom_accent', true,
      'profile_theme', false,
      'avatar_frame', false,
      'soundboard', false
    ),
    'ultra', jsonb_build_object(
      'animated_avatar', true,
      'animated_banner', true,
      'extra_themes', 20,
      'upload_mb', 100,
      'stream_quality', '1080p60',
      'custom_accent', true,
      'profile_theme', true,
      'avatar_frame', true,
      'soundboard', true
    )
  );
$$;

revoke all on function public.membership_perks() from anon, public;
grant execute on function public.membership_perks() to authenticated;

-- Gifting: buy an item for somebody else out of your own balance.
create or replace function public.gift_item(target_sku text, recipient uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  balance integer;
  expiry timestamptz;
begin
  if recipient = auth.uid() then
    raise exception 'cannot_gift_self';
  end if;
  if not exists (select 1 from profiles where id = recipient) then
    raise exception 'user_not_found';
  end if;

  select * into item from shop_items where sku = target_sku;
  if item.sku is null then raise exception 'unknown_item'; end if;
  if item.kind = 'boost' then raise exception 'boost_not_giftable'; end if;

  select coalesce(sum(amount), 0) into balance from point_events where user_id = auth.uid();
  if balance < item.price then raise exception 'insufficient_points'; end if;

  insert into point_events (user_id, amount, reason, ref)
  values (auth.uid(), -item.price, 'gift', target_sku || ':' || recipient::text || ':' || gen_random_uuid()::text);

  if item.kind = 'membership' then
    expiry := greatest(now(), coalesce((select expires_at from memberships where user_id = recipient), now()))
      + make_interval(days => item.duration_days);
    insert into memberships (user_id, tier, expires_at)
    values (recipient, item.metadata ->> 'tier', expiry)
    on conflict (user_id) do update set tier = excluded.tier, expires_at = excluded.expires_at, updated_at = now();
  else
    insert into cosmetics (user_id, sku) values (recipient, target_sku) on conflict do nothing;
  end if;

  return target_sku;
end;
$$;

revoke all on function public.gift_item(text, uuid) from anon, public;
grant execute on function public.gift_item(text, uuid) to authenticated;
