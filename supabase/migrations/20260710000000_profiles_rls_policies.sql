-- Ensure row level security policies exist for the profiles table so
-- authenticated users can read the profiles of board members and manage
-- their own profile row. A missing insert/update policy is a common cause of
-- HTTP 400/403 responses when upserting a profile.
--
-- Idempotent and non-destructive: RLS is only enabled (never disabled) and
-- each named policy is dropped-if-exists then recreated, so re-running the
-- migration converges to the same state without clobbering unrelated policies.

alter table public.profiles enable row level security;

-- Read: any authenticated user may read profile rows (needed to render board
-- member names and avatars).
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Insert: a user may only create their own profile row.
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Update: a user may only update their own profile row.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
