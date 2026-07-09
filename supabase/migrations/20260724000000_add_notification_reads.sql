-- Notifications center read state. Inferno derives the notification feed on the
-- client from existing board data (boss fights, action items, pinned messages,
-- members, invites), so there is no notifications table. This table persists only
-- which notification keys a given user has marked read, so "read" survives across
-- reloads and devices. Each notification has a stable key (e.g. 'boss:<id>').
--
-- Security: board + user scoped. A user may only read/write their own read rows,
-- and only for boards they belong to, via the existing is_board_member helper.

create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz not null default now(),
  unique (board_id, user_id, notification_key)
);

create index if not exists notification_reads_board_user_idx
  on public.notification_reads (board_id, user_id);

alter table public.notification_reads enable row level security;

drop policy if exists "notification_reads_select_own" on public.notification_reads;
create policy "notification_reads_select_own"
  on public.notification_reads for select to authenticated
  using (user_id = auth.uid() and public.is_board_member(board_id));

drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own"
  on public.notification_reads for insert to authenticated
  with check (user_id = auth.uid() and public.is_board_member(board_id));

drop policy if exists "notification_reads_delete_own" on public.notification_reads;
create policy "notification_reads_delete_own"
  on public.notification_reads for delete to authenticated
  using (user_id = auth.uid() and public.is_board_member(board_id));

notify pgrst, 'reload schema';
