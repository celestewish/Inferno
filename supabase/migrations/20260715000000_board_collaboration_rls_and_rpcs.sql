-- Board-specific collaboration: row level security + privileged RPCs.
--
-- Goal: make every collaboration table strictly board-scoped so that a user
-- who belongs to Board A cannot read or write data for Board B, and give the
-- board owner safe, server-enforced controls to remove members and transfer
-- ownership. UI checks alone are not a security boundary — these policies and
-- SECURITY DEFINER functions enforce the rules in the database.
--
-- Fully idempotent and non-destructive:
--   * RLS is only ever enabled (never disabled).
--   * Every policy is created with a unique, app-owned name and dropped-if-
--     exists before being recreated, so re-running converges without clobbering
--     unrelated policies.
--   * Functions use CREATE OR REPLACE.
--   * No data is deleted and no columns are dropped.

-- ─────────────────────────────────────────────────────────────────────────────
-- Membership helper functions.
--
-- These are SECURITY DEFINER and owned by the migration role (the table owner),
-- so they bypass RLS on board_members / boards. That is essential: a SELECT
-- policy on board_members that itself queried board_members would recurse
-- infinitely. Routing the membership check through a definer function breaks
-- the cycle. search_path is pinned to keep the definer context safe.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop all app-owned helper/RPC functions before (re)creating them. An earlier
-- iteration of this feature shipped these functions with different input
-- parameter names (e.g. target_board_id instead of p_board_id). CREATE OR
-- REPLACE cannot rename a function's input parameters and fails with
-- "cannot change name of input parameter" (SQLSTATE 42P13), so a plain
-- drop-and-recreate is required to converge. A function's identity for DROP is
-- its (name, argument types) — parameter *names* are irrelevant — so these
-- drops match the old definitions regardless of what the parameters were called.
--
-- The two membership helpers are referenced by the RLS policies created further
-- down, so they are dropped with CASCADE. That also removes those dependent
-- policies, every one of which is recreated (drop-if-exists + create) below, so
-- the net effect is idempotent and touches only objects this migration owns.
-- No data is deleted and no columns are dropped.
drop function if exists public.accept_board_invite(text);
drop function if exists public.remove_board_member(uuid, uuid);
drop function if exists public.transfer_board_ownership(uuid, uuid);
drop function if exists public.set_board_member_role(uuid, uuid, text);
drop function if exists public.invite_role_to_member_role(text);
drop function if exists public.is_board_member(uuid) cascade;
drop function if exists public.is_board_owner(uuid) cascade;

create or replace function public.is_board_member(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_board_owner(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = p_board_id
      and b.owner_id = auth.uid()
  );
$$;

-- board_invites uses owner/admin/member; board_members uses owner/editor/viewer.
create or replace function public.invite_role_to_member_role(p_role text)
returns text
language sql
immutable
as $$
  select case p_role
    when 'owner' then 'owner'
    when 'admin' then 'editor'
    when 'member' then 'viewer'
    else 'viewer'
  end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- boards
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.boards enable row level security;

drop policy if exists "boards_select_member_or_owner" on public.boards;
create policy "boards_select_member_or_owner"
  on public.boards for select to authenticated
  using (owner_id = auth.uid() or public.is_board_member(id));

drop policy if exists "boards_insert_own" on public.boards;
create policy "boards_insert_own"
  on public.boards for insert to authenticated
  with check (owner_id = auth.uid());

-- Board-level customization (settings, kanban_sections, name, description) is
-- editable by any member so existing board-customization flows keep working;
-- ownership transfer itself is done through a SECURITY DEFINER RPC below.
drop policy if exists "boards_update_member" on public.boards;
create policy "boards_update_member"
  on public.boards for update to authenticated
  using (public.is_board_member(id) or owner_id = auth.uid())
  with check (public.is_board_member(id) or owner_id = auth.uid());

drop policy if exists "boards_delete_owner" on public.boards;
create policy "boards_delete_owner"
  on public.boards for delete to authenticated
  using (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- board_members
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.board_members enable row level security;

drop policy if exists "board_members_select_member" on public.board_members;
create policy "board_members_select_member"
  on public.board_members for select to authenticated
  using (public.is_board_member(board_id));

-- Owners add members directly. This also covers first-board bootstrap: the
-- creator inserts their own owner row immediately after creating the board, at
-- which point boards.owner_id already equals auth.uid(). Invite acceptance is
-- handled by the accept_board_invite() RPC, which runs as definer and does not
-- rely on this policy.
drop policy if exists "board_members_insert_owner" on public.board_members;
create policy "board_members_insert_owner"
  on public.board_members for insert to authenticated
  with check (public.is_board_owner(board_id));

drop policy if exists "board_members_update_owner" on public.board_members;
create policy "board_members_update_owner"
  on public.board_members for update to authenticated
  using (public.is_board_owner(board_id))
  with check (public.is_board_owner(board_id));

-- Owner can remove anyone; a member can remove (leave) their own row.
drop policy if exists "board_members_delete_owner_or_self" on public.board_members;
create policy "board_members_delete_owner_or_self"
  on public.board_members for delete to authenticated
  using (public.is_board_owner(board_id) or user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- board_invites
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.board_invites enable row level security;

-- A member of the board can see its pending invites; an invitee can see the
-- invites addressed to their own email (needed to render "invites waiting for
-- you" and to accept via the RPC).
drop policy if exists "board_invites_select_member_or_invitee" on public.board_invites;
create policy "board_invites_select_member_or_invitee"
  on public.board_invites for select to authenticated
  using (
    public.is_board_member(board_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "board_invites_insert_member" on public.board_invites;
create policy "board_invites_insert_member"
  on public.board_invites for insert to authenticated
  with check (public.is_board_member(board_id) and invited_by = auth.uid());

-- Owners/members can update invites for their board; invitees can update the
-- invite addressed to them (invite acceptance also flows through the RPC).
drop policy if exists "board_invites_update_member_or_invitee" on public.board_invites;
create policy "board_invites_update_member_or_invitee"
  on public.board_invites for update to authenticated
  using (
    public.is_board_member(board_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "board_invites_delete_member" on public.board_invites;
create policy "board_invites_delete_member"
  on public.board_invites for delete to authenticated
  using (public.is_board_member(board_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- board_messages
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.board_messages enable row level security;

drop policy if exists "board_messages_select_member" on public.board_messages;
create policy "board_messages_select_member"
  on public.board_messages for select to authenticated
  using (public.is_board_member(board_id));

drop policy if exists "board_messages_insert_member" on public.board_messages;
create policy "board_messages_insert_member"
  on public.board_messages for insert to authenticated
  with check (public.is_board_member(board_id) and user_id = auth.uid());

drop policy if exists "board_messages_update_own" on public.board_messages;
create policy "board_messages_update_own"
  on public.board_messages for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "board_messages_delete_own" on public.board_messages;
create policy "board_messages_delete_own"
  on public.board_messages for delete to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- team_members (per-board name/role roster)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.team_members enable row level security;

drop policy if exists "team_members_select_member" on public.team_members;
create policy "team_members_select_member"
  on public.team_members for select to authenticated
  using (public.is_board_member(board_id));

drop policy if exists "team_members_insert_member" on public.team_members;
create policy "team_members_insert_member"
  on public.team_members for insert to authenticated
  with check (public.is_board_member(board_id));

drop policy if exists "team_members_update_member" on public.team_members;
create policy "team_members_update_member"
  on public.team_members for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "team_members_delete_member" on public.team_members;
create policy "team_members_delete_member"
  on public.team_members for delete to authenticated
  using (public.is_board_member(board_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- projects
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.projects enable row level security;

drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
  on public.projects for select to authenticated
  using (public.is_board_member(board_id));

drop policy if exists "projects_insert_member" on public.projects;
create policy "projects_insert_member"
  on public.projects for insert to authenticated
  with check (public.is_board_member(board_id));

drop policy if exists "projects_update_member" on public.projects;
create policy "projects_update_member"
  on public.projects for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "projects_delete_member" on public.projects;
create policy "projects_delete_member"
  on public.projects for delete to authenticated
  using (public.is_board_member(board_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks (scoped through their parent project's board)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_member" on public.tasks;
create policy "tasks_select_member"
  on public.tasks for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = tasks.project_id and public.is_board_member(p.board_id)
  ));

drop policy if exists "tasks_insert_member" on public.tasks;
create policy "tasks_insert_member"
  on public.tasks for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = tasks.project_id and public.is_board_member(p.board_id)
  ));

drop policy if exists "tasks_update_member" on public.tasks;
create policy "tasks_update_member"
  on public.tasks for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = tasks.project_id and public.is_board_member(p.board_id)
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = tasks.project_id and public.is_board_member(p.board_id)
  ));

drop policy if exists "tasks_delete_member" on public.tasks;
create policy "tasks_delete_member"
  on public.tasks for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = tasks.project_id and public.is_board_member(p.board_id)
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileged RPCs. All are SECURITY DEFINER and re-check authorization against
-- auth.uid() internally, so they are safe to expose to authenticated clients.
-- ─────────────────────────────────────────────────────────────────────────────

-- Accept an invite by token. Runs as definer so a strict board_members insert
-- policy can forbid arbitrary self-insertion while still allowing a legitimate
-- invitee to join exactly the board they were invited to (and no other).
create or replace function public.accept_board_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.board_invites%rowtype;
  v_email  text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from public.board_invites
  where token = p_token
    and accepted_at is null
  limit 1;

  if not found then
    raise exception 'Invite not found or already accepted';
  end if;

  if lower(v_invite.email) <> v_email then
    raise exception 'This invite was sent to a different email address';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'This invite has expired';
  end if;

  insert into public.board_members (board_id, user_id, role)
  values (v_invite.board_id, auth.uid(), public.invite_role_to_member_role(v_invite.role))
  on conflict (board_id, user_id) do nothing;

  update public.board_invites
  set accepted_at = now(),
      accepted_by = auth.uid()
  where id = v_invite.id
    and accepted_at is null;

  return v_invite.board_id;
end;
$$;

-- Remove (kick) a member from a board. Only the current owner may do this, and
-- the owner cannot remove themselves — ownership must be transferred first.
create or replace function public.remove_board_member(p_board_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.boards where id = p_board_id;

  if v_owner is null then
    raise exception 'Board not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the board owner can remove members';
  end if;

  if p_user_id = v_owner then
    raise exception 'Transfer ownership before removing the owner';
  end if;

  delete from public.board_members
  where board_id = p_board_id and user_id = p_user_id;
end;
$$;

-- Transfer board ownership to another current member. Updates boards.owner_id
-- and both board_members role rows atomically. The former owner is demoted to
-- editor so they retain collaboration access without admin controls.
create or replace function public.transfer_board_ownership(p_board_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.boards where id = p_board_id;

  if v_owner is null then
    raise exception 'Board not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the board owner can transfer ownership';
  end if;

  if p_new_owner_id = v_owner then
    raise exception 'You already own this board';
  end if;

  if not exists (
    select 1 from public.board_members
    where board_id = p_board_id and user_id = p_new_owner_id
  ) then
    raise exception 'New owner must already be a member of the board';
  end if;

  update public.boards set owner_id = p_new_owner_id where id = p_board_id;

  update public.board_members set role = 'owner'
  where board_id = p_board_id and user_id = p_new_owner_id;

  update public.board_members set role = 'editor'
  where board_id = p_board_id and user_id = v_owner;
end;
$$;

-- Change a member's collaboration role (editor/viewer). Owner-only. The owner's
-- own row and the 'owner' role are managed exclusively via transfer_ownership.
create or replace function public.set_board_member_role(p_board_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.boards where id = p_board_id;

  if v_owner is null then
    raise exception 'Board not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the board owner can change member roles';
  end if;

  if p_role not in ('editor', 'viewer') then
    raise exception 'Role must be editor or viewer';
  end if;

  if p_user_id = v_owner then
    raise exception 'The owner role is changed through ownership transfer';
  end if;

  update public.board_members set role = p_role
  where board_id = p_board_id and user_id = p_user_id;
end;
$$;

grant execute on function public.accept_board_invite(text) to authenticated;
grant execute on function public.remove_board_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_board_ownership(uuid, uuid) to authenticated;
grant execute on function public.set_board_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.is_board_member(uuid) to authenticated;
grant execute on function public.is_board_owner(uuid) to authenticated;

notify pgrst, 'reload schema';
