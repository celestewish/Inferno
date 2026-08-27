-- Collaboration Discovery: schema for the post-creation invite prompt,
-- member count indicator, Campfire starter message, and testimonial
-- request popup.
--
-- The invite prompt and testimonial popup are each one-time-per-user
-- nudges, tracked via nullable timestamp columns on profiles, matching the
-- existing onboarding_seen_at / mobile_board_hint_seen_at pattern. The
-- member count indicator needs no schema change (reuses board_members).
-- The Campfire starter message needs a way to mark a board_messages row as
-- system-authored rather than sentinel-authored, since user_id is NOT NULL
-- and always the board owner's real id when the message is inserted client
-- side right after board creation.

alter table public.profiles
  add column if not exists first_invite_prompt_seen_at timestamptz;

alter table public.profiles
  add column if not exists testimonial_prompt_seen_at timestamptz;

alter table public.board_messages
  add column if not exists is_system boolean not null default false;

-- Testimonials: in-app quote submissions from the Feature 4 popup.
-- Board-scoped like board_docs; a user may only read their own submissions,
-- and may only submit for boards they belong to, as themselves.
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists testimonials_board_idx
  on public.testimonials (board_id);

alter table public.testimonials enable row level security;

drop policy if exists "testimonials_select_own" on public.testimonials;
create policy "testimonials_select_own"
  on public.testimonials for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "testimonials_insert_member" on public.testimonials;
create policy "testimonials_insert_member"
  on public.testimonials for insert to authenticated
  with check (public.is_board_member(board_id) and user_id = auth.uid());

notify pgrst, 'reload schema';
