
-- Wrap direct auth.uid()/auth.jwt() calls in scalar subselects so Postgres
-- evaluates them once per query instead of once per row. Logic unchanged.

ALTER POLICY "board_docs_insert_member" ON public.board_docs
  WITH CHECK (is_board_member(board_id) AND (user_id = (select auth.uid())));

ALTER POLICY "board admins can create invites" ON public.board_invites
  WITH CHECK (is_board_admin(board_id) AND ((select auth.uid()) = invited_by));

ALTER POLICY "board_invites_insert_member" ON public.board_invites
  WITH CHECK (is_board_member(board_id) AND (invited_by = (select auth.uid())));

ALTER POLICY "board_invites_select_member_or_invitee" ON public.board_invites
  USING (is_board_member(board_id) OR (lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))));

ALTER POLICY "board_invites_update_member_or_invitee" ON public.board_invites
  USING (is_board_member(board_id) OR (lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))));

ALTER POLICY "board_members_delete_owner_or_self" ON public.board_members
  USING (is_board_owner(board_id) OR (user_id = (select auth.uid())));

ALTER POLICY "Users can create their own memberships" ON public.board_members
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "Users can read their own board memberships" ON public.board_members
  USING (user_id = (select auth.uid()));

ALTER POLICY "board_messages_delete_own" ON public.board_messages
  USING (user_id = (select auth.uid()));

ALTER POLICY "message authors or board admins can delete messages" ON public.board_messages
  USING (((select auth.uid()) = user_id) OR is_board_admin(board_id));

ALTER POLICY "board_messages_insert_member" ON public.board_messages
  WITH CHECK (is_board_member(board_id) AND (user_id = (select auth.uid())));

ALTER POLICY "board_messages_update_own" ON public.board_messages
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "board_repositories_insert_member" ON public.board_repositories
  WITH CHECK (is_board_member(board_id) AND (user_id = (select auth.uid())));

ALTER POLICY "board owners can delete boards" ON public.boards
  USING (EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = boards.id AND bm.user_id = (select auth.uid()) AND bm.role = 'owner'));

ALTER POLICY "boards_delete_owner" ON public.boards
  USING (owner_id = (select auth.uid()));

ALTER POLICY "Users can create their own boards" ON public.boards
  WITH CHECK (owner_id = (select auth.uid()));

ALTER POLICY "authenticated users can create boards" ON public.boards
  WITH CHECK ((select auth.uid()) = owner_id);

ALTER POLICY "boards_insert_own" ON public.boards
  WITH CHECK (owner_id = (select auth.uid()));

ALTER POLICY "boards_insert_owner" ON public.boards
  WITH CHECK (owner_id = (select auth.uid()));

ALTER POLICY "Users can read their own boards" ON public.boards
  USING ((owner_id = (select auth.uid())) OR (id IN (SELECT bm.board_id FROM board_members bm WHERE bm.user_id = (select auth.uid()))));

ALTER POLICY "boards_select_member_or_owner" ON public.boards
  USING ((owner_id = (select auth.uid())) OR is_board_member(id));

ALTER POLICY "board owners can update boards" ON public.boards
  USING (EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = boards.id AND bm.user_id = (select auth.uid()) AND bm.role = 'owner'));

ALTER POLICY "boards_update_member" ON public.boards
  USING (is_board_member(id) OR (owner_id = (select auth.uid())))
  WITH CHECK (is_board_member(id) OR (owner_id = (select auth.uid())));

ALTER POLICY "boards_update_owner" ON public.boards
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

ALTER POLICY "campfire_channels_insert_member" ON public.campfire_channels
  WITH CHECK (is_board_member(board_id) AND (created_by = (select auth.uid())));

ALTER POLICY "meeting_notes_insert_member" ON public.meeting_notes
  WITH CHECK (is_board_member(board_id) AND (created_by = (select auth.uid())));

ALTER POLICY "notification_reads_delete_own" ON public.notification_reads
  USING ((user_id = (select auth.uid())) AND is_board_member(board_id));

ALTER POLICY "notification_reads_insert_own" ON public.notification_reads
  WITH CHECK ((user_id = (select auth.uid())) AND is_board_member(board_id));

ALTER POLICY "notification_reads_select_own" ON public.notification_reads
  USING ((user_id = (select auth.uid())) AND is_board_member(board_id));

ALTER POLICY "Users own their profiles" ON public.profiles
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can insert their own profile" ON public.profiles
  WITH CHECK (id = (select auth.uid()));

ALTER POLICY "Users can update their own profile" ON public.profiles
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

ALTER POLICY "projects_delete" ON public.projects
  USING ((select auth.uid()) = user_id);

ALTER POLICY "projects_insert" ON public.projects
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "projects_select" ON public.projects
  USING ((select auth.uid()) = user_id);

ALTER POLICY "projects_update" ON public.projects
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "tasks_delete" ON public.tasks
  USING ((select auth.uid()) = user_id);

ALTER POLICY "tasks_insert" ON public.tasks
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "tasks_select" ON public.tasks
  USING ((select auth.uid()) = user_id);

ALTER POLICY "tasks_update" ON public.tasks
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "team_delete" ON public.team_members
  USING ((select auth.uid()) = user_id);

ALTER POLICY "team_insert" ON public.team_members
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "team_select" ON public.team_members
  USING ((select auth.uid()) = user_id);

ALTER POLICY "team_update" ON public.team_members
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
