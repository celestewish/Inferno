# Inferno release operations runbook

This runbook covers running Inferno in production during the alpha: release
readiness, backups, uptime monitoring, incident response, and the recurring
maintenance cadence. Inferno is operated by Rousell Technologies LLC.

Everything here is safe for public viewing. It intentionally contains no
secrets, tokens, connection strings, or admin-only identifiers. Anything that
requires a credential is described by where to find it in a dashboard, not by
the value itself.

## 1. Release readiness status

- **Backups:** set up and verified. Daily automated backups run in Supabase and
  a manual pre-release dump is taken before each release (see section 2).
- **Uptime monitoring:** set up and verified. An external checker polls the
  production URL and routes alerts to the support mailbox (see section 3).
- **Operating entity:** Inferno is operated by Rousell Technologies LLC. Support
  and alert routing use `celeste@infernotaskboard.com`.

## 2. Supabase backup process

Inferno stores all application data in Supabase (Postgres). Backups are a
Supabase feature and depend on the plan, so verify the setting rather than
assuming it is on.

- **Daily automated backups** are managed from the Supabase Dashboard under
  **Database -> Backups**. Confirm that daily backups are active for the
  production Supabase project before relying on them. Point-in-time recovery is a
  separate add-on; confirm whether it is enabled.
- **Production project:** the production Supabase project reference is stored
  outside this repository (in the linked project settings and local Supabase
  config, not committed here). Do not publish the raw project reference in public
  docs or issues.
- **Pre-release manual dump.** Before each release, take a manual database dump
  and keep at least one recent copy off Supabase:

  ```
  supabase db dump --linked --file backups/pre-release-YYYY-MM-DD.sql
  ```

  Replace `YYYY-MM-DD` with the release date. This requires the local project to
  be linked to the production Supabase project first.
- **Restore safety rule.** Whenever possible, restore into a separate Supabase
  project first, verify the data is correct and complete, and only then decide
  whether to restore into production. Never restore straight over production data
  without a verified staging restore.
- **Storage assets.** Supabase Storage objects are not included in database
  backups. If Inferno uses Storage for uploaded assets, back those objects up
  separately; a database dump alone will not recover them.

## 3. Uptime monitoring process

- **Production URL:** https://infernotaskboard.com/
- **Healthy status:** an HTTP 2XX response and the page content loads (for
  example, assert on the response status and the presence of the page title).
- **Monitoring service.** Use an external uptime checker (free tiers such as
  UptimeRobot, Better Stack, or a hosting-provided health check are sufficient
  for the alpha). Point the check at the root URL on a regular interval.
- **Alert routing.** Route downtime and recovery alerts to the support and admin
  mailbox `celeste@infernotaskboard.com` so an owner is notified when the site
  is unreachable.

When an alert fires, check the following in order:

1. **IONOS deployment status:** confirm the latest deploy succeeded and the site
   is being served.
2. **Supabase status:** check the Supabase status page and the project dashboard
   for outages or degraded services.
3. **Browser console and network:** open the site and look for console errors or
   failed network requests (auth, data fetches, edge functions).
4. **Recent deploys:** review the most recent commits and deploys for anything
   that could have broken the build or runtime.
5. **Migrations:** check whether a recent database migration changed schema the
   app depends on.

## 4. Incident response

### Severity levels

- **P0 (critical):** the site is down or unusable for all users, or there is
  data loss or a data exposure. Respond immediately.
- **P1 (major):** a core feature is broken for many users (for example, sign-in,
  loading boards, or saving tasks), but a workaround or partial service exists.
  Respond same day.
- **P2 (minor):** a limited or cosmetic issue, or one affecting few users, with
  low impact. Schedule a fix in the normal cadence.

### Triage checklist

1. Confirm the report and reproduce the issue if possible.
2. Assign a severity (P0/P1/P2).
3. Identify scope: all users or some, and which feature or page.
4. Check recent deploys and migrations as the most likely cause.
5. Check Supabase status and the browser console/network for errors.
6. Decide whether to roll forward with a fix or roll back (see below).

### Rollback steps (IONOS / GitHub deployment)

At a high level, the site is a static build deployed from the repository:

1. Identify the last known good commit or deploy.
2. Revert the offending change in GitHub (revert the commit or merge a fix) so
   the tracked branch points at a known good state.
3. Trigger a redeploy through the IONOS Deploy Now pipeline (or rebuild and
   publish from the last known good commit).
4. Confirm the production URL returns to a healthy status after the redeploy.

### Supabase migration rollback caution

Do not blindly roll back database migrations. A rollback can drop columns or
tables and destroy user data that was written after the migration. Before
reverting any schema change:

- Determine whether user data could be affected.
- Prefer a forward fix (a new migration that corrects the schema) over a
  destructive rollback.
- If a rollback is unavoidable, take a fresh dump first and, where possible,
  test the rollback on a separate project before touching production.

### Communication checklist for users

- Acknowledge the incident to affected users (in-app notice or email as
  appropriate) with a short, plain description of the impact.
- Give a status and, if known, an expected timeframe.
- Post an update when service is restored.
- Follow up with a brief summary if the incident was significant, and note any
  action users should take.
- Route incident correspondence through `celeste@infernotaskboard.com`.

## 5. Post-release maintenance cadence

### Weekly

- Review uptime incidents and alerts from the past week.
- Run a dependency audit (for example, `npm audit`) and review advisories.
- Review the feedback inbox and triage new reports.

### Before each release

- Run the build and the test suites and confirm they pass.
- Confirm all pending database migrations are applied and correct.
- Confirm uptime monitoring is green.
- Confirm a recent backup is visible, and take the pre-release manual dump
  (section 2).

### Monthly

- Test the restore process, or at minimum document a restore drill: restore a
  recent dump into a separate Supabase project, verify the data, and record the
  result and the date.

## 6. Notes

- Keep this runbook public-viewer safe. Do not add secrets, tokens, connection
  strings, raw project references, or other admin-only details.
- Do not put an EIN, SSN, date of birth, personal home address, or bank or
  payment account numbers in this public repository or in any public filing or
  issue. Those belong only in the private admin dashboards.
