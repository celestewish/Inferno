
-- ============================================================
-- Tier 1a: Lock down SECURITY DEFINER RPCs from anonymous callers
-- ============================================================

-- Mutating functions: authenticated-only. Revoke the implicit PUBLIC
-- grant (which anon inherits) and keep an explicit authenticated grant.
REVOKE EXECUTE ON FUNCTION public.delete_board(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_board(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_board(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.remove_board_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_board_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_board_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_board_member_role(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_board_member_role(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_board_member_role(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_message_pinned(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_message_pinned(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_message_pinned(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.transfer_board_ownership(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_board_ownership(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.transfer_board_ownership(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_board_invite(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_board_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_board_invite(text) TO authenticated;

-- set_user_id is a trigger-only helper (BEFORE INSERT trigger fires under
-- the trigger mechanism regardless of the invoking role's EXECUTE grant),
-- so it has no legitimate direct caller at all.
REVOKE EXECUTE ON FUNCTION public.set_user_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_id() FROM authenticated;

-- ============================================================
-- Tier 1b: Fix mutable search_path
-- ============================================================
ALTER FUNCTION public.set_user_id() SET search_path = 'public';
ALTER FUNCTION public.is_board_editor(uuid) SET search_path = 'public';
ALTER FUNCTION public.invite_role_to_member_role(text) SET search_path = 'public';

-- ============================================================
-- Tier 1c: Defense-in-depth — explicit auth.uid() IS NULL guards.
-- These three compared `v_owner <> auth.uid()`, which evaluates to NULL
-- (not TRUE) when auth.uid() is NULL, so the ownership check was
-- silently skipped for unauthenticated callers. Grant revocation above
-- already blocks this via the API, but the function logic itself should
-- not rely on that alone.
-- ============================================================

CREATE OR REPLACE FUNCTION public.remove_board_member(p_board_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    raise exception 'Only the board owner can remove members';
  end if;

  if p_user_id = v_owner then
    raise exception 'Transfer ownership before removing the owner';
  end if;

  delete from public.board_members
  where board_id = p_board_id and user_id = p_user_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_board_member_role(p_board_id uuid, p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.transfer_board_ownership(p_board_id uuid, p_new_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
