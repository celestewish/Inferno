-- Extend analytics_events to cover guest-link events
alter table public.analytics_events drop constraint analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check
  check (event_name in (
    'invite_sent','invite_accepted','invite_first_active_day',
    'guest_link_created','guest_link_viewed'
  ));

-- One guest link per board (board_id is the PK)
create table public.board_guest_links (
  board_id uuid primary key references public.boards(id) on delete cascade,
  token text not null unique default (gen_random_uuid())::text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

alter table public.board_guest_links enable row level security;

-- Owner can see/manage their own board's link row directly (defense in depth;
-- mutations still go through the RPCs below, which re-check ownership themselves)
create policy board_guest_links_owner_all
  on public.board_guest_links
  for all
  to authenticated
  using (exists (select 1 from public.boards b where b.id = board_guest_links.board_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.boards b where b.id = board_guest_links.board_id and b.owner_id = auth.uid()));

create index board_guest_links_token_idx on public.board_guest_links(token);

-- Owner-only: create or regenerate the link (invalidates any previous token)
create or replace function public.create_or_regenerate_guest_link(p_board_id uuid)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_token text;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_owner_id from public.boards where id = p_board_id;
  if v_owner_id is null then
    raise exception 'Board not found';
  end if;
  if v_owner_id <> auth.uid() then
    raise exception 'Only the board owner can manage the guest link';
  end if;

  v_token := (gen_random_uuid())::text;
  v_expires := now() + interval '30 days';

  insert into public.board_guest_links (board_id, token, created_by, created_at, expires_at, revoked_at)
  values (p_board_id, v_token, auth.uid(), now(), v_expires, null)
  on conflict (board_id) do update
    set token = excluded.token,
        expires_at = excluded.expires_at,
        revoked_at = null,
        created_by = excluded.created_by,
        created_at = now();

  insert into public.analytics_events (event_name, user_id, board_id, metadata)
  values ('guest_link_created', auth.uid(), p_board_id, '{}'::jsonb);

  return query select v_token, v_expires;
end;
$$;

revoke execute on function public.create_or_regenerate_guest_link(uuid) from public;
grant execute on function public.create_or_regenerate_guest_link(uuid) to authenticated;

-- Owner-only: revoke the link without generating a new one
create or replace function public.revoke_guest_link(p_board_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_owner_id from public.boards where id = p_board_id;
  if v_owner_id is null then
    raise exception 'Board not found';
  end if;
  if v_owner_id <> auth.uid() then
    raise exception 'Only the board owner can manage the guest link';
  end if;

  update public.board_guest_links
  set revoked_at = now()
  where board_id = p_board_id and revoked_at is null;
end;
$$;

revoke execute on function public.revoke_guest_link(uuid) from public;
grant execute on function public.revoke_guest_link(uuid) to authenticated;

-- Anon-callable by design: validates the token and returns ONLY a curated,
-- read-only snapshot. No task descriptions, subtasks, activity, code/doc refs,
-- or member info are exposed. This is the sole entry point for guest access;
-- no RLS was opened up on boards/tasks/projects for the anon role.
create or replace function public.get_board_guest_view(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.board_guest_links%rowtype;
  v_board jsonb;
  v_tasks jsonb;
begin
  select * into v_link
  from public.board_guest_links
  where token = p_token
    and revoked_at is null
    and expires_at > now();

  if not found then
    raise exception 'This link is invalid, revoked, or has expired';
  end if;

  select jsonb_build_object(
    'board_id', b.id,
    'name', b.name,
    'description', b.description,
    'kanban_sections', b.kanban_sections
  ) into v_board
  from public.boards b
  where b.id = v_link.board_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'status', t.status,
    'priority', t.priority,
    'discipline', t.discipline,
    'assignee', t.assignee,
    'due', t.due,
    'due_date', t.due_date,
    'labels', t.labels,
    'sort_order', t.sort_order
  ) order by t.sort_order), '[]'::jsonb) into v_tasks
  from public.tasks t
  join public.projects p on p.id = t.project_id
  where p.board_id = v_link.board_id;

  insert into public.analytics_events (event_name, guest_token, board_id, metadata)
  values ('guest_link_viewed', p_token, v_link.board_id, '{}'::jsonb);

  return jsonb_build_object('board', v_board, 'tasks', v_tasks);
end;
$$;
