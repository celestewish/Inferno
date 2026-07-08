-- Repair migration: guarantee public.profiles has every column the app reads
-- and writes, then refresh the PostgREST schema cache.
--
-- Why this exists: `supabase db push` only applies migrations that are missing
-- from the remote migration history. If the profiles table was created outside
-- of migrations (e.g. via the dashboard) or an earlier profile migration is
-- recorded as applied while the columns are actually absent, `db push` reports
-- "up to date" yet the app still fails with PGRST204 / 42703 ("column does not
-- exist"). This migration has a fresh timestamp so it is always pending on any
-- project that has not run it, and it is fully idempotent so it converges to the
-- correct state without clobbering anything.

-- 1. Ensure every personalization column exists. ADD COLUMN IF NOT EXISTS is a
--    no-op when the column is already present, so this is safe to re-run.
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists gamer_tag text,
  add column if not exists pronouns text,
  add column if not exists onboarding_seen_at timestamptz;

-- 2. Re-assert the row level security policies. Enabling RLS is idempotent, and
--    each policy is dropped-if-exists then recreated so re-running converges
--    without duplicating or clobbering unrelated policies.
alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 3. Ask PostgREST (the Supabase REST/API layer) to reload its cached schema so
--    the newly added columns are visible to the API immediately. Without this,
--    freshly added columns can still surface as PGRST204 until the API restarts.
notify pgrst, 'reload schema';
