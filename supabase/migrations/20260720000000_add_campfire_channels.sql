-- Campfire channels: user-created rooms grouped under each project.
--
-- The board-wide room (channel_key 'board') and each project's default room
-- (channel_key 'project:<id>') are implicit and always present in the UI, so
-- they are never stored here and can never be removed. This table holds only
-- the extra, user-created channels for a project.
--
-- Removing a channel archives it (sets archived_at) rather than deleting the
-- row, and never touches board_messages, so historical messages posted to an
-- archived channel are preserved and simply hidden from the room list.
--
-- Security: fully board-scoped. Board members may read/add/archive channels for
-- boards they belong to; nobody else can. This mirrors the board_messages
-- policies and keeps project rooms board-member gated.

create table if not exists public.campfire_channels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  channel_key text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (board_id, channel_key)
);

-- Listing a board's channels filters on board_id (and skips archived rows).
create index if not exists campfire_channels_board_idx
  on public.campfire_channels (board_id);

alter table public.campfire_channels enable row level security;

drop policy if exists "campfire_channels_select_member" on public.campfire_channels;
create policy "campfire_channels_select_member"
  on public.campfire_channels for select to authenticated
  using (public.is_board_member(board_id));

drop policy if exists "campfire_channels_insert_member" on public.campfire_channels;
create policy "campfire_channels_insert_member"
  on public.campfire_channels for insert to authenticated
  with check (public.is_board_member(board_id) and created_by = auth.uid());

-- Archiving is an UPDATE (set archived_at); any board member may archive or
-- restore a channel. Message bodies live in board_messages and are unaffected.
drop policy if exists "campfire_channels_update_member" on public.campfire_channels;
create policy "campfire_channels_update_member"
  on public.campfire_channels for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

-- Hard delete is allowed for board members too, but the app prefers archiving.
drop policy if exists "campfire_channels_delete_member" on public.campfire_channels;
create policy "campfire_channels_delete_member"
  on public.campfire_channels for delete to authenticated
  using (public.is_board_member(board_id));

notify pgrst, 'reload schema';
