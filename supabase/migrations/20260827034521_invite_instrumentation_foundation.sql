-- 1. Fix the broken accept_board_invite bug: accepted_by column referenced but never existed
alter table public.board_invites
  add column accepted_by uuid references auth.users(id);

-- 2. Analytics events table (guest-ready, structured columns, narrow v1 event set)
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in ('invite_sent','invite_accepted','invite_first_active_day')),
  user_id uuid references auth.users(id),
  guest_token text,
  board_id uuid references public.boards(id),
  invite_id uuid references public.board_invites(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_actor_check check (user_id is not null or guest_token is not null)
);

alter table public.analytics_events enable row level security;
-- Intentionally no policies: table is written only by SECURITY DEFINER trigger functions below
-- (which bypass RLS, same pattern as existing DEFINER functions in this schema) and read only
-- via the Supabase dashboard / service role. No anon/authenticated role can read or write directly.

create index analytics_events_board_id_idx on public.analytics_events(board_id);
create index analytics_events_event_name_idx on public.analytics_events(event_name);
create index analytics_events_invite_id_idx on public.analytics_events(invite_id);
create index analytics_events_user_id_idx on public.analytics_events(user_id);

-- 3. invite_sent trigger
create or replace function public.log_invite_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_events (event_name, user_id, board_id, invite_id, metadata)
  values ('invite_sent', new.invited_by, new.board_id, new.id, jsonb_build_object('role', new.role));
  return new;
end;
$$;

create trigger trg_log_invite_sent
after insert on public.board_invites
for each row execute function public.log_invite_sent();

-- 4. invite_accepted trigger (fires on accepted_at null -> set)
create or replace function public.log_invite_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.accepted_at is null and new.accepted_at is not null then
    insert into public.analytics_events (event_name, user_id, board_id, invite_id, metadata)
    values ('invite_accepted', new.accepted_by, new.board_id, new.id, jsonb_build_object('role', new.role));
  end if;
  return new;
end;
$$;

create trigger trg_log_invite_accepted
after update on public.board_invites
for each row execute function public.log_invite_accepted();

-- 5. invite_first_active_day: fires once per (user, board) on first task activity or Campfire message,
-- for users who are board members but not the board owner (i.e. joined via collaboration, not the creator)
create or replace function public.log_first_active_day_from_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
  v_owner_id uuid;
begin
  select board_id into v_board_id from public.projects where id = new.project_id;
  if v_board_id is null or new.user_id is null then
    return new;
  end if;

  select owner_id into v_owner_id from public.boards where id = v_board_id;
  if v_owner_id = new.user_id then
    return new;
  end if;

  if exists (select 1 from public.board_members where board_id = v_board_id and user_id = new.user_id)
     and not exists (
       select 1 from public.analytics_events
       where event_name = 'invite_first_active_day'
         and board_id = v_board_id
         and user_id = new.user_id
     )
  then
    insert into public.analytics_events (event_name, user_id, board_id, metadata)
    values ('invite_first_active_day', new.user_id, v_board_id, jsonb_build_object('source', 'task'));
  end if;

  return new;
end;
$$;

create trigger trg_log_first_active_task
after insert or update on public.tasks
for each row execute function public.log_first_active_day_from_task();

create or replace function public.log_first_active_day_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if new.user_id is null or coalesce(new.is_system, false) then
    return new;
  end if;

  select owner_id into v_owner_id from public.boards where id = new.board_id;
  if v_owner_id = new.user_id then
    return new;
  end if;

  if exists (select 1 from public.board_members where board_id = new.board_id and user_id = new.user_id)
     and not exists (
       select 1 from public.analytics_events
       where event_name = 'invite_first_active_day'
         and board_id = new.board_id
         and user_id = new.user_id
     )
  then
    insert into public.analytics_events (event_name, user_id, board_id, metadata)
    values ('invite_first_active_day', new.user_id, new.board_id, jsonb_build_object('source', 'message'));
  end if;

  return new;
end;
$$;

create trigger trg_log_first_active_message
after insert on public.board_messages
for each row execute function public.log_first_active_day_from_message();

-- 6. Funnel view for easy querying (via SQL editor / service role)
create or replace view public.invite_funnel as
select
  bi.id as invite_id,
  bi.board_id,
  b.name as board_name,
  bi.email as invited_email,
  bi.role,
  bi.invited_by,
  bi.created_at as sent_at,
  bi.accepted_at,
  bi.accepted_by,
  fa.created_at as first_active_at,
  case
    when bi.accepted_at is null then 'sent'
    when fa.created_at is null then 'accepted'
    else 'active'
  end as funnel_stage,
  round(extract(epoch from (bi.accepted_at - bi.created_at)) / 3600.0, 1) as hours_to_accept,
  round(extract(epoch from (fa.created_at - bi.accepted_at)) / 3600.0, 1) as hours_to_active
from public.board_invites bi
join public.boards b on b.id = bi.board_id
left join lateral (
  select ae.created_at
  from public.analytics_events ae
  where ae.event_name = 'invite_first_active_day'
    and ae.board_id = bi.board_id
    and ae.user_id = bi.accepted_by
  order by ae.created_at asc
  limit 1
) fa on true;
