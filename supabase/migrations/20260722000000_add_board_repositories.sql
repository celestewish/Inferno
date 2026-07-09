-- Code Forge: lightweight, metadata-only registry of external code repositories
-- linked to a board (GitHub for the MVP). Inferno stores only repo metadata and
-- an external URL here; no credentials, code, or files are stored, and there is
-- no OAuth or private-repo API access.
--
-- A repo may optionally be linked to a project. Deletion is a soft archive
-- (archived_at) so a link is never silently lost.
--
-- Security: fully board-scoped, mirroring the board_docs / board_messages write
-- model. Any board member may read non-archived repos and add/edit/archive repos
-- for boards they belong to. All access flows through the is_board_member helper.

create table if not exists public.board_repositories (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'github',
  display_name text not null,
  repo_url text not null,
  owner text,
  repo text,
  description text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Listing a board's repos filters on board_id (and skips archived rows).
create index if not exists board_repositories_board_idx
  on public.board_repositories (board_id);

alter table public.board_repositories enable row level security;

drop policy if exists "board_repositories_select_member" on public.board_repositories;
create policy "board_repositories_select_member"
  on public.board_repositories for select to authenticated
  using (public.is_board_member(board_id));

drop policy if exists "board_repositories_insert_member" on public.board_repositories;
create policy "board_repositories_insert_member"
  on public.board_repositories for insert to authenticated
  with check (public.is_board_member(board_id) and user_id = auth.uid());

drop policy if exists "board_repositories_update_member" on public.board_repositories;
create policy "board_repositories_update_member"
  on public.board_repositories for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "board_repositories_delete_member" on public.board_repositories;
create policy "board_repositories_delete_member"
  on public.board_repositories for delete to authenticated
  using (public.is_board_member(board_id));

notify pgrst, 'reload schema';
