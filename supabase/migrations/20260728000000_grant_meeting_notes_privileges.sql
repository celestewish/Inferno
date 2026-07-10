-- Fix: public.meeting_notes had RLS enabled with the correct board-scoped
-- policies (20260723000000_add_meeting_notes) but no table-level privileges, so
-- every request from an authenticated board member failed with "permission
-- denied for table meeting_notes" (Postgres 42501). This surfaced in the app as
-- a misleading "Apply the War Room migration (supabase db push)" banner even
-- though the table exists. Same class of issue as board_docs (20260726000000)
-- and board_repositories / notification_reads (20260727000000).
--
-- Row-level security decides which ROWS a role may see; table GRANTs are still
-- required for the role to touch the table at all. Grant the privileges the
-- meeting_notes policies actually use to `authenticated`. Row visibility remains
-- fully board-scoped by the existing policies (select/insert/update/delete are
-- all gated by public.is_board_member(board_id), and insert additionally
-- requires created_by = auth.uid()), so this does not widen access across
-- boards.
--
-- `anon` is intentionally NOT granted: War Room is used only by signed-in board
-- members, and RLS would deny anon rows anyway (auth.uid() is null).
--
-- Grants are idempotent (re-running is a harmless no-op) and non-destructive.

grant select, insert, update, delete on table public.meeting_notes to authenticated;

notify pgrst, 'reload schema';
