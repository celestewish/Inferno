-- Fix: public.board_docs had RLS enabled with board-scoped policies but no
-- table-level privileges, so every request (even from an authenticated board
-- member) failed with "permission denied for table board_docs". This surfaced in
-- the app as a misleading "Docs Hub needs its database migration" message.
--
-- Row-level security decides which ROWS a role may see; table GRANTs are still
-- required for the role to touch the table at all. Grant the standard CRUD
-- privileges to `authenticated`. Row visibility remains fully board-scoped
-- through the existing is_board_member policies, so this does not expose docs
-- across boards.
--
-- `anon` is intentionally NOT granted access: Docs Hub is only used by signed-in
-- board members, and RLS would deny anon rows anyway (auth.uid() is null). This
-- keeps docs private and non-public.
--
-- Grants are idempotent (re-running is a harmless no-op) and non-destructive.

grant select, insert, update, delete on table public.board_docs to authenticated;

notify pgrst, 'reload schema';
