-- Row level security policies, storage buckets and realtime publication.
-- Policies lean on security definer helpers from the initial migration so
-- they never recurse into the tables they protect.

create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated using (true);

create policy "users insert their own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members read their servers"
  on public.servers for select to authenticated
  using (public.is_server_member(id));

create policy "users create their own servers"
  on public.servers for insert to authenticated
  with check (owner_id = auth.uid());

create policy "owners and admins update servers"
  on public.servers for update to authenticated
  using (public.is_server_admin(id)) with check (public.is_server_admin(id));

create policy "owners delete servers"
  on public.servers for delete to authenticated
  using (owner_id = auth.uid());

create policy "members read the member list"
  on public.server_members for select to authenticated
  using (public.is_server_member(server_id));

create policy "admins add members"
  on public.server_members for insert to authenticated
  with check (public.is_server_admin(server_id));

create policy "admins update roles"
  on public.server_members for update to authenticated
  using (public.is_server_admin(server_id))
  with check (public.is_server_admin(server_id));

create policy "members leave or admins remove"
  on public.server_members for delete to authenticated
  using (user_id = auth.uid() or public.is_server_admin(server_id));

create policy "members read accessible channels"
  on public.channels for select to authenticated
  using (public.can_access_channel(id));

create policy "admins create channels"
  on public.channels for insert to authenticated
  with check (type = 'text' and public.is_server_admin(server_id));

create policy "admins update channels"
  on public.channels for update to authenticated
  using (type = 'text' and public.is_server_admin(server_id))
  with check (type = 'text' and public.is_server_admin(server_id));

create policy "admins delete channels"
  on public.channels for delete to authenticated
  using (type = 'text' and public.is_server_admin(server_id));

create policy "participants read channel membership"
  on public.channel_members for select to authenticated
  using (user_id = auth.uid() or public.can_access_channel(channel_id));

create policy "members read messages"
  on public.messages for select to authenticated
  using (deleted_at is null and public.can_access_channel(channel_id));

create policy "members write their own messages"
  on public.messages for insert to authenticated
  with check (author_id = auth.uid() and public.can_access_channel(channel_id));

create policy "authors edit their messages"
  on public.messages for update to authenticated
  using (author_id = auth.uid() and public.can_access_channel(channel_id))
  with check (author_id = auth.uid() and public.can_access_channel(channel_id));

create policy "authors or admins delete messages"
  on public.messages for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.channels c
      where c.id = messages.channel_id
        and c.server_id is not null
        and public.is_server_admin(c.server_id)
    )
  );

create policy "members read attachments"
  on public.message_attachments for select to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and m.deleted_at is null
        and public.can_access_channel(m.channel_id)
    )
  );

create policy "authors attach files to their messages"
  on public.message_attachments for insert to authenticated
  with check (
    exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and m.author_id = auth.uid()
        and public.can_access_channel(m.channel_id)
    )
  );

create policy "authors delete their attachments"
  on public.message_attachments for delete to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and m.author_id = auth.uid()
    )
  );

create policy "members read reactions"
  on public.reactions for select to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = reactions.message_id
        and public.can_access_channel(m.channel_id)
    )
  );

create policy "members add their own reactions"
  on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      where m.id = reactions.message_id
        and public.can_access_channel(m.channel_id)
    )
  );

create policy "members remove their own reactions"
  on public.reactions for delete to authenticated
  using (user_id = auth.uid());

create policy "users read their read markers"
  on public.channel_reads for select to authenticated
  using (user_id = auth.uid());

create policy "users write their read markers"
  on public.channel_reads for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_channel(channel_id));

create policy "users update their read markers"
  on public.channel_reads for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users delete their read markers"
  on public.channel_reads for delete to authenticated
  using (user_id = auth.uid());

create policy "users read their friendships"
  on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users send friend requests"
  on public.friendships for insert to authenticated
  with check (requester_id = auth.uid());

create policy "parties update friendships"
  on public.friendships for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "parties delete friendships"
  on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "admins read invites"
  on public.invites for select to authenticated
  using (public.is_server_admin(server_id));

create policy "admins create invites"
  on public.invites for insert to authenticated
  with check (public.is_server_admin(server_id) and created_by = auth.uid());

create policy "admins delete invites"
  on public.invites for delete to authenticated
  using (public.is_server_admin(server_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  ),
  (
    'attachments',
    'attachments',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
  )
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments are publicly readable"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "users upload attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.server_members;
