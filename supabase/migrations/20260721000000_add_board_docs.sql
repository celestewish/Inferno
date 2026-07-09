-- Docs Hub: lightweight, metadata-only registry of external documents linked to
-- a board (design docs, tech plans, art direction, QA notes, postmortems, etc.).
--
-- Inferno stores only metadata and an external URL here; no file contents are
-- uploaded or stored. A doc may optionally be linked to a project and/or a task.
-- Deletion is a soft archive (archived_at) so links are never silently lost.
--
-- Security: fully board-scoped. Any board member may read non-archived docs and
-- add/edit/archive docs for boards they belong to, mirroring the board_messages
-- write model (role-gating is a possible follow-up). All access flows through
-- the existing is_board_member helper.

create table if not exists public.board_docs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  doc_type text not null default 'Other',
  description text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Listing a board's docs filters on board_id (and skips archived rows).
create index if not exists board_docs_board_idx
  on public.board_docs (board_id);

alter table public.board_docs enable row level security;

drop policy if exists "board_docs_select_member" on public.board_docs;
create policy "board_docs_select_member"
  on public.board_docs for select to authenticated
  using (public.is_board_member(board_id));

drop policy if exists "board_docs_insert_member" on public.board_docs;
create policy "board_docs_insert_member"
  on public.board_docs for insert to authenticated
  with check (public.is_board_member(board_id) and user_id = auth.uid());

drop policy if exists "board_docs_update_member" on public.board_docs;
create policy "board_docs_update_member"
  on public.board_docs for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "board_docs_delete_member" on public.board_docs;
create policy "board_docs_delete_member"
  on public.board_docs for delete to authenticated
  using (public.is_board_member(board_id));

notify pgrst, 'reload schema';
