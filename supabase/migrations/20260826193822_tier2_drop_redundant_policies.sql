
-- board_invites: "board admins can X" (is_board_admin) is a strict subset of
-- the corresponding "board_invites_X_member" (is_board_member) policy, since
-- every admin is also a member. Verified: 0 rows in board_invites today, and
-- is_board_admin(x) => is_board_member(x) always holds given board_members'
-- role check. Dropping these changes nothing observable.
DROP POLICY "board admins can delete invites" ON public.board_invites;
DROP POLICY "board admins can create invites" ON public.board_invites;
DROP POLICY "board admins can view invites" ON public.board_invites;
DROP POLICY "board admins can update invites" ON public.board_invites;

-- boards INSERT: four policies with the identical predicate (owner_id =
-- auth.uid()), accumulated across iterations. Keep boards_insert_owner
-- (matches this table's boards_delete_owner / boards_update_owner naming).
DROP POLICY "Users can create their own boards" ON public.boards;
DROP POLICY "authenticated users can create boards" ON public.boards;
DROP POLICY "boards_insert_own" ON public.boards;
