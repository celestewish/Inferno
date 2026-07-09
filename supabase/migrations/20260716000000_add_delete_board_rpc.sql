-- Owner-only board deletion with ordered child cleanup.
--
-- Deleting a board must also remove everything scoped to it. The base schema's
-- foreign keys are not guaranteed to cascade (they were created outside these
-- migrations), and RLS makes a client-side, multi-table delete brittle and
-- easy to get wrong. A single SECURITY DEFINER RPC deletes the child rows in
-- dependency order inside one transaction, re-checking ownership against
-- auth.uid() so it is safe to expose to authenticated clients.
--
-- Idempotent and non-destructive to schema: CREATE OR REPLACE only, no data is
-- touched at migration time, no columns are dropped.

-- Drop first so the function can be recreated even if an earlier iteration used
-- a different input parameter name (CREATE OR REPLACE cannot rename params;
-- SQLSTATE 42P13). Identity for DROP is (name, argument types).
drop function if exists public.delete_board(uuid);

create or replace function public.delete_board(p_board_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_owner from public.boards where id = p_board_id;

  if v_owner is null then
    raise exception 'Board not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Only the board owner can delete this board';
  end if;

  -- Children first, deepest dependency to shallowest. Tasks hang off projects,
  -- so they go before projects. The remaining board-scoped tables are
  -- independent of each other and can be removed in any order before the board
  -- row itself.
  delete from public.tasks
  where project_id in (
    select id from public.projects where board_id = p_board_id
  );

  delete from public.projects      where board_id = p_board_id;
  delete from public.board_messages where board_id = p_board_id;
  delete from public.board_invites  where board_id = p_board_id;
  delete from public.team_members   where board_id = p_board_id;
  delete from public.board_members  where board_id = p_board_id;

  delete from public.boards where id = p_board_id;
end;
$$;

grant execute on function public.delete_board(uuid) to authenticated;

-- Refresh the PostgREST schema cache so the new RPC is callable immediately.
notify pgrst, 'reload schema';
