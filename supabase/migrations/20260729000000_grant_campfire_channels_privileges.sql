-- Grant table privileges on campfire_channels to the authenticated role.
--
-- Row-level security decides which ROWS a role may see; table GRANTs are still
-- required for the role to touch the table at all. Without this GRANT, an
-- authenticated board member hits a `42501 permission denied for table
-- campfire_channels` error when listing, creating, or archiving a custom
-- Campfire channel, even though the RLS policies would otherwise allow it.
--
-- This mirrors the earlier grant repairs for board_docs, board_repositories,
-- notification_reads, and meeting_notes. The base tables (boards, tasks,
-- projects, board_messages, ...) were created before this migration history and
-- already carry the default privileges, so they do not need a repair here.
--
-- `anon` is intentionally NOT granted: Campfire is used only by signed-in board
-- members. This migration is idempotent and non-destructive.

grant select, insert, update, delete on table public.campfire_channels to authenticated;

notify pgrst, 'reload schema';
