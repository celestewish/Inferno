# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Environment variables

This app talks to Supabase and needs two variables **at build time** (Vite inlines
`VITE_*` variables into the client bundle — they are not read at runtime):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `VITE_SITE_URL` — canonical site URL used for auth email-confirmation redirects
  and invite accept links. Defaults to `https://infernotaskboard.com/` when unset.
  Set it to `http://localhost:5173` for local development.

Local development: copy `.env.example` to `.env` and fill in your values.

## Deploying to IONOS Deploy Now

The build runs in `.github/workflows/Inferno-build.yaml` (`npm ci && npm run build`,
output folder `dist`). Because Vite embeds env vars during the build, you **must**
add the Supabase values as GitHub repository secrets before the production build,
otherwise the deployed site crashes with `supabaseUrl is required`:

1. Repo **Settings → Secrets and variables → Actions → New repository secret**
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

The workflow already maps these secrets into the build environment.

## Invitation emails (Resend)

Board invitations are delivered by the `send-board-invite` Supabase Edge Function
(`supabase/functions/send-board-invite/index.ts`), which posts to the Resend HTTPS
API. The frontend still generates the `acceptUrl` and calls the function via
`supabase.functions.invoke('send-board-invite', ...)`.

### 1. Verify the sending domain in Resend

1. In the Resend dashboard, add the domain `infernotaskboard.com`.
2. Resend shows a set of DNS records (SPF/`TXT`, DKIM `CNAME`/`TXT`, and an optional
   DMARC `TXT`).
3. In **IONOS → Domains → infernotaskboard.com → DNS**, add each record exactly as
   Resend provides it (host/name and value), then save.
4. Back in Resend, click **Verify**. Propagation can take a few minutes to a few
   hours. The sender `celeste@infernotaskboard.com` only works once the domain is
   verified.

### 2. Set the Edge Function secrets

These are server-side secrets — never prefix them with `VITE_` and never commit them:

```bash
supabase secrets set \
  RESEND_API_KEY="re_..." \
  INVITE_FROM_EMAIL="Inferno <celeste@infernotaskboard.com>"
```

- `RESEND_API_KEY` **(required)** — the function returns a 500 JSON error if missing.
- `INVITE_FROM_EMAIL` *(optional)* — defaults to `Inferno <celeste@infernotaskboard.com>`.

The invite link (`acceptUrl`) is built in the browser from `VITE_SITE_URL` (falling
back to `https://infernotaskboard.com/`) and sent to the function, so no
`SITE_URL`/`APP_URL` secret is required for the function itself.

## Supabase Auth URL configuration

Email confirmation and magic-link redirects are controlled by Supabase, not the app.
In the Supabase dashboard under **Authentication → URL Configuration**:

- **Site URL**: `https://infernotaskboard.com`
- **Redirect URLs**: add `https://infernotaskboard.com/**` (and any local dev origin,
  e.g. `http://localhost:5173/**`)

The signup flow also passes `emailRedirectTo` derived from `VITE_SITE_URL`, so
confirmation links return users to the production domain instead of localhost.

## Database migrations

Schema changes live in `supabase/migrations/`. Apply them with the Supabase CLI
from the project root:

```bash
# One-time: link the local project to your Supabase project (skip if already linked).
# The <ref> is the Project Ref from Supabase → Project Settings → General.
supabase link --project-ref <ref>

# Push every pending migration in supabase/migrations to the linked project.
supabase db push
```

All migrations are idempotent and non-destructive, so `supabase db push` is safe
to re-run.

Current migrations:

- `20260708000000_add_kanban_sections.sql` — adds a `kanban_sections` `jsonb`
  column to `boards` (defaulted to the standard five-lane pipeline) so each
  board's Kanban columns persist.
- `20260709000000_add_profile_fields.sql` — adds the personalization columns
  (`avatar_url`, `gamer_tag`, `pronouns`, `onboarding_seen_at`, `display_name`)
  to `profiles`.
- `20260710000000_profiles_rls_policies.sql` — enables row level security on
  `profiles` and creates the read / insert / update policies.
- `20260711000000_repair_profile_columns.sql` — idempotent repair that
  re-asserts every profile column, re-creates the RLS policies, and refreshes
  the PostgREST schema cache. Fixes environments where `supabase db push`
  reports "up to date" but the columns are still missing.
- `20260712000000_add_profile_theme_settings.sql` — adds a nullable
  `theme_settings` `jsonb` column to `profiles` so the **Settings → Appearance**
  swatches (accent, glow, surface, background) persist per user. A null value
  means "use the default theme". The existing update RLS policy already covers
  it, so no policy change is needed.
- `20260713000000_add_mobile_board_hint.sql` — adds a nullable
  `mobile_board_hint_seen_at` `timestamptz` column to `profiles` so the one-time
  mobile "swipe through the board" hint stays dismissed per user. A null value
  means "hint not yet dismissed". The existing update RLS policy already covers
  it, so no policy change is needed. If the migration has not been applied, the
  hint is simply hidden rather than repeatedly shown.
- `20260714000000_add_board_settings_and_member_role.sql` — adds a `settings`
  `jsonb` column to `boards` (defaulted to `{}`) that stores per-board custom
  **task tags**, **game categories**, and **team roles**, plus a nullable
  `role` `text` column to `team_members` for each member's assigned role. Both
  are non-destructive: if the migration has not been applied, the app falls back
  to the built-in defaults and simply cannot persist new customizations.

> **"Your profile database is missing the new profile columns."**
> This message in **Settings → Profile** means the profile columns are absent
> from the linked project. Normally running `supabase db push` (and
> `supabase link --project-ref <ref>` first if the project is not linked) applies
> the profile migrations above and fixes it.
>
> **If `supabase db push` says "Remote database is up to date" but the app still
> shows this error**, the migration history thinks the profile migration was
> already applied (or the `profiles` table was created outside of migrations),
> so there is no new migration for `db push` to run. Fix it one of two ways:
>
> 1. **Pull/merge this branch** so
>    `20260711000000_repair_profile_columns.sql` is present locally, then run
>    `supabase db push` again — the fresh timestamp makes it a pending migration
>    that will actually run.
> 2. **Or run the SQL manually** in the Supabase dashboard: open
>    **SQL Editor → New query**, paste the contents of
>    `supabase/migrations/20260711000000_repair_profile_columns.sql`, and run it.
>    It is idempotent, so it is safe even if some columns already exist.
>
> Either path adds the missing columns and issues `NOTIFY pgrst, 'reload schema'`
> so the Supabase API picks up the change immediately.

### 3. Deploy the function

```bash
supabase functions deploy send-board-invite
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` remain **frontend build vars**
(GitHub Actions secrets / local `.env`) and are unrelated to the Resend secrets above.

## Vite plugins

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
