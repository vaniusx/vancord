-- v1 enum additions.
--
-- Postgres cannot use a new enum value in the same transaction that adds it, so
-- these live in their own migration file. The rest of the v1 schema follows in
-- 20261029120100_v1_schema.sql.

alter type public.channel_type add value if not exists 'voice';
alter type public.channel_type add value if not exists 'category';
alter type public.channel_type add value if not exists 'group';
alter type public.channel_type add value if not exists 'forum';
