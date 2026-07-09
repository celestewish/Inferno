-- Phase One gamification: per-user XP, level, earned badges, and settings.
-- Non-destructive and idempotent: every column uses `add column if not exists`
-- with a safe default, so existing profiles keep working and no backfill is
-- required. Re-running the migration is a no-op.

alter table public.profiles
  add column if not exists xp integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists badges jsonb not null default '[]'::jsonb,
  add column if not exists selected_title text,
  add column if not exists gamification_settings jsonb not null default '{}'::jsonb;

-- Refresh the PostgREST schema cache so the new columns are visible to the API
-- immediately; without this, freshly added columns can still surface as
-- PGRST204 until the API restarts.
notify pgrst, 'reload schema';
