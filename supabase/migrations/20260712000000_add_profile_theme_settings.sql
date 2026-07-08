-- Persist per-user appearance customization (Settings → Appearance swatches).
-- Non-destructive and idempotent: the column is nullable JSONB so existing
-- profiles keep working and no backfill is required. A null value simply means
-- "use the default theme".

alter table public.profiles
  add column if not exists theme_settings jsonb;

-- Refresh the PostgREST schema cache so the new column is visible to the API
-- immediately; without this, freshly added columns can still surface as
-- PGRST204 until the API restarts.
notify pgrst, 'reload schema';
