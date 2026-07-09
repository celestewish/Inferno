-- Board-level customization + per-member role.
-- Non-destructive and idempotent: new columns are nullable / defaulted so
-- existing rows keep working and no backfill is required.

-- Per-board customization bucket. Stores user-defined task tags, game
-- categories/genres, and team role labels as a single JSONB object, e.g.
--   { "tags": [...], "categories": [...], "roles": [...] }
-- Defaults to an empty object so the app merges custom values on top of the
-- built-in defaults. A single column keeps future customization additive
-- without another migration.
alter table public.boards
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Repair any row that somehow holds a non-object value.
update public.boards
set settings = '{}'::jsonb
where settings is null
   or jsonb_typeof(settings) <> 'object';

-- Optional role label for a team member (e.g. Programmer, Artist, Designer).
-- Nullable so existing members keep working; a null value means "no role set".
alter table public.team_members
  add column if not exists role text;

-- Refresh the PostgREST schema cache so the new columns are visible to the API
-- immediately; without this, freshly added columns can still surface as
-- PGRST204 until the API restarts.
notify pgrst, 'reload schema';
