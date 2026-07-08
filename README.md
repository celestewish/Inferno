# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Environment variables

This app talks to Supabase and needs two variables **at build time** (Vite inlines
`VITE_*` variables into the client bundle — they are not read at runtime):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

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

The invite link (`acceptUrl`) is built in the browser from the current origin, so no
`SITE_URL`/`APP_URL` secret is required for the function.

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
