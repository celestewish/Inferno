-- War Room meeting notes: lightweight, text-only meeting records tied to a
-- board and an optional project/huddle room.
--
-- Inferno stores only meeting metadata here (title, agenda, notes, action items).
-- No audio is ever recorded or stored: voice huddles are live-only and run over
-- WebRTC with Supabase Realtime used purely for presence + signaling (no rows).
-- A note belongs to a room via room_key ('board' or 'project:<id>'), mirroring
-- the Campfire channel_key convention so no separate rooms table is needed.
-- Deletion is a soft archive (archived_at) so meeting history is never lost.
--
-- Security: fully board-scoped. Any board member may read non-archived notes and
-- add/edit/archive notes for boards they belong to, via the existing
-- is_board_member helper, matching the Docs Hub / Campfire write model.

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  room_key text not null default 'board',
  title text not null,
  agenda jsonb not null default '[]'::jsonb,
  notes text not null default '',
  action_items jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Listing a board's notes filters on board_id (and skips archived rows); room
-- filtering narrows further, so index the pair.
create index if not exists meeting_notes_board_room_idx
  on public.meeting_notes (board_id, room_key);

alter table public.meeting_notes enable row level security;

drop policy if exists "meeting_notes_select_member" on public.meeting_notes;
create policy "meeting_notes_select_member"
  on public.meeting_notes for select to authenticated
  using (public.is_board_member(board_id));

drop policy if exists "meeting_notes_insert_member" on public.meeting_notes;
create policy "meeting_notes_insert_member"
  on public.meeting_notes for insert to authenticated
  with check (public.is_board_member(board_id) and created_by = auth.uid());

drop policy if exists "meeting_notes_update_member" on public.meeting_notes;
create policy "meeting_notes_update_member"
  on public.meeting_notes for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "meeting_notes_delete_member" on public.meeting_notes;
create policy "meeting_notes_delete_member"
  on public.meeting_notes for delete to authenticated
  using (public.is_board_member(board_id));

notify pgrst, 'reload schema';
