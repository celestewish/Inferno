-- Task-level code and docs links. Tasks can now carry their own GitHub/code
-- references (repo, PR, issue, branch, commit URLs) and doc links, in addition
-- to the project-scoped Docs Hub and Code Forge. Stored inline on the task row
-- as jsonb arrays so they load with the task and need no extra query or table.
--
-- Each code ref: { id, url, label, type }  (type from parseGitHubResourceUrl)
-- Each doc ref:  { id, url, title, docType }
--
-- Security: tasks already inherit board-scoped RLS via their project, so no new
-- policies are required; these are additive columns with safe empty defaults.

alter table public.tasks
  add column if not exists code_refs jsonb not null default '[]'::jsonb;

alter table public.tasks
  add column if not exists doc_refs jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
