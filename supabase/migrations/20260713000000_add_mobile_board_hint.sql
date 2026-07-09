-- Track whether a user has dismissed the mobile "swipe to move through the
-- board" hint, so it never reappears once closed. Non-destructive and
-- idempotent: the column is nullable so existing profiles keep working and no
-- backfill is required. A null value simply means "hint not yet dismissed".

alter table public.profiles
  add column if not exists mobile_board_hint_seen_at timestamptz;

-- Refresh the PostgREST schema cache so the new column is visible to the API
-- immediately; without this, freshly added columns can still surface as
-- PGRST204 until the API restarts.
notify pgrst, 'reload schema';
