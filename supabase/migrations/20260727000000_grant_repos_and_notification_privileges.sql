-- Fix: public.board_repositories and public.notification_reads each had RLS
-- enabled with the correct board/user-scoped policies but no table-level
-- privileges, so every request (even from an authenticated board member) failed
-- with "permission denied for table ..." (Postgres 42501). This surfaced in the
-- app as misleading "Code Forge needs its database migration" and "Apply the
-- notifications migration" messages. Same class of issue as board_docs
-- (20260726000000).
--
-- Row-level security decides which ROWS a role may see; table GRANTs are still
-- required for the role to touch the table at all. Grant the privileges each
-- table's policies actually use to `authenticated`. Row visibility remains fully
-- scoped by the existing policies (board_repositories via is_board_member;
-- notification_reads via user_id = auth.uid() and is_board_member), so this does
-- not widen access.
--
-- `anon` is intentionally NOT granted: both features are used only by signed-in
-- board members, and RLS would deny anon rows anyway (auth.uid() is null).
--
-- Grants are idempotent (re-running is a harmless no-op) and non-destructive.

-- board_repositories has select/insert/update/delete policies.
grant select, insert, update, delete on table public.board_repositories to authenticated;

-- notification_reads has select/insert/delete policies (read state is toggled by
-- inserting/deleting rows, never updated in place).
grant select, insert, delete on table public.notification_reads to authenticated;

notify pgrst, 'reload schema';
