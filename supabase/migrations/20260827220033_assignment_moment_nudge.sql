-- Extend analytics_events for the assignment nudge
alter table public.analytics_events drop constraint analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check
  check (event_name in (
    'invite_sent','invite_accepted','invite_first_active_day',
    'guest_link_created','guest_link_viewed',
    'assignment_nudge_shown','assignment_nudge_clicked_invite',
    'assignment_nudge_clicked_guest_link','assignment_nudge_dismissed_permanently'
  ));

-- Generic per-board nudge state, reusable by future nudges (e.g. the content-aware
-- growth-signal nudge from the original brief, never built)
create table public.board_nudge_state (
  board_id uuid not null references public.boards(id) on delete cascade,
  nudge_type text not null,
  last_shown_at timestamptz,
  shown_count integer not null default 0,
  dismissed_permanently boolean not null default false,
  primary key (board_id, nudge_type)
);

alter table public.board_nudge_state enable row level security;

create policy board_nudge_state_owner_all
  on public.board_nudge_state
  for all
  to authenticated
  using (exists (select 1 from public.boards b where b.id = board_nudge_state.board_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.boards b where b.id = board_nudge_state.board_id and b.owner_id = auth.uid()));

-- Eligibility check: still solo (<=1 board member), not permanently dismissed,
-- past the cooldown since it was last shown (14 days, adjust here if needed)
create or replace function public.should_show_assignment_nudge(p_board_id uuid)
returns boolean
language sql
security invoker
stable
set search_path = public
as $$
  select
    (select count(*) from public.board_members where board_id = p_board_id) <= 1
    and not exists (
      select 1 from public.board_nudge_state
      where board_id = p_board_id
        and nudge_type = 'assignment_solo_nudge'
        and dismissed_permanently
    )
    and (
      not exists (
        select 1 from public.board_nudge_state
        where board_id = p_board_id and nudge_type = 'assignment_solo_nudge'
      )
      or (
        select last_shown_at from public.board_nudge_state
        where board_id = p_board_id and nudge_type = 'assignment_solo_nudge'
      ) < now() - interval '14 days'
    );
$$;

-- Record that the nudge was shown (bumps cooldown timer, logs event)
create or replace function public.record_assignment_nudge_shown(p_board_id uuid)
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
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Not authorized for this board';
  end if;

  insert into public.board_nudge_state (board_id, nudge_type, last_shown_at, shown_count)
  values (p_board_id, 'assignment_solo_nudge', now(), 1)
  on conflict (board_id, nudge_type) do update
    set last_shown_at = now(),
        shown_count = board_nudge_state.shown_count + 1;

  insert into public.analytics_events (event_name, user_id, board_id, metadata)
  values ('assignment_nudge_shown', auth.uid(), p_board_id, '{}'::jsonb);
end;
$$;

revoke execute on function public.record_assignment_nudge_shown(uuid) from public;
grant execute on function public.record_assignment_nudge_shown(uuid) to authenticated;

-- Record a CTA click (invite modal or guest-link panel)
create or replace function public.record_assignment_nudge_cta(p_board_id uuid, p_cta text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_event_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_cta not in ('invite', 'guest_link') then
    raise exception 'Invalid cta value';
  end if;

  select owner_id into v_owner_id from public.boards where id = p_board_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Not authorized for this board';
  end if;

  v_event_name := case p_cta
    when 'invite' then 'assignment_nudge_clicked_invite'
    else 'assignment_nudge_clicked_guest_link'
  end;

  insert into public.analytics_events (event_name, user_id, board_id, metadata)
  values (v_event_name, auth.uid(), p_board_id, '{}'::jsonb);
end;
$$;

revoke execute on function public.record_assignment_nudge_cta(uuid, text) from public;
grant execute on function public.record_assignment_nudge_cta(uuid, text) to authenticated;

-- Permanent opt-out for this board
create or replace function public.dismiss_assignment_nudge_permanently(p_board_id uuid)
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
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Not authorized for this board';
  end if;

  insert into public.board_nudge_state (board_id, nudge_type, dismissed_permanently)
  values (p_board_id, 'assignment_solo_nudge', true)
  on conflict (board_id, nudge_type) do update
    set dismissed_permanently = true;

  insert into public.analytics_events (event_name, user_id, board_id, metadata)
  values ('assignment_nudge_dismissed_permanently', auth.uid(), p_board_id, '{}'::jsonb);
end;
$$;

revoke execute on function public.dismiss_assignment_nudge_permanently(uuid) from public;
grant execute on function public.dismiss_assignment_nudge_permanently(uuid) to authenticated;
