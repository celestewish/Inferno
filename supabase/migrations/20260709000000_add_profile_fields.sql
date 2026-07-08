-- Add profile personalization fields and per-user onboarding tracking.
-- Non-destructive and idempotent: existing profiles keep working and new
-- columns are nullable so no backfill is required.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists gamer_tag text,
  add column if not exists pronouns text,
  add column if not exists onboarding_seen_at timestamptz;

-- display_name existed originally, but guard it for older environments.
alter table public.profiles
  add column if not exists display_name text;
