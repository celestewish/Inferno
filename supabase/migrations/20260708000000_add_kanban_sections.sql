-- Add per-board Kanban sections (columns / status lanes).
-- Non-destructive and idempotent: existing boards keep working and are
-- backfilled with the default five-lane pipeline.

alter table public.boards
  add column if not exists kanban_sections jsonb not null default '[
    {"id": "backlog", "label": "Backlog"},
    {"id": "todo", "label": "To Do"},
    {"id": "inprogress", "label": "In Progress"},
    {"id": "review", "label": "Review"},
    {"id": "done", "label": "Done"}
  ]'::jsonb;

-- Backfill any rows that somehow have a null/empty value.
update public.boards
set kanban_sections = '[
    {"id": "backlog", "label": "Backlog"},
    {"id": "todo", "label": "To Do"},
    {"id": "inprogress", "label": "In Progress"},
    {"id": "review", "label": "Review"},
    {"id": "done", "label": "Done"}
  ]'::jsonb
where kanban_sections is null
   or jsonb_typeof(kanban_sections) <> 'array'
   or jsonb_array_length(kanban_sections) = 0;
