-- Milestone Boss Fights: per-project boss encounters stored as jsonb.
-- Non-destructive and idempotent: the column uses `add column if not exists`
-- with a safe empty-array default, so existing projects keep working and no
-- backfill is required. Re-running the migration is a no-op.

alter table public.projects
  add column if not exists boss_fights jsonb not null default '[]'::jsonb;

-- Refresh the PostgREST schema cache so the new column is visible to the API
-- immediately; without this, a freshly added column can still surface as
-- PGRST204 until the API restarts.
notify pgrst, 'reload schema';
