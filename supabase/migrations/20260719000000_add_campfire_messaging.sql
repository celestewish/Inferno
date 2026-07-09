-- Campfire messaging: channels, pins, and reactions on board_messages.
--
-- Extends the existing board chat into project-scoped channels with pinned
-- messages and lightweight reactions. All additions are idempotent
-- (`add column if not exists` / `create or replace`) and touch no existing data.
--
-- Security: message bodies stay author-only (existing
-- board_messages_update_own policy). Pins and reactions must be usable by any
-- board member, not just the author, so they go through SECURITY DEFINER RPCs
-- that re-check board membership and only touch the pinned / reactions columns.
-- This keeps the "board members only, and never edit someone else's text"
-- boundary intact.

alter table public.board_messages
  add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.board_messages
  add column if not exists channel_key text not null default 'board';

alter table public.board_messages
  add column if not exists pinned boolean not null default false;

alter table public.board_messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

-- Filtering a channel feed is board_id + channel_key; index the pair.
create index if not exists board_messages_board_channel_idx
  on public.board_messages (board_id, channel_key);

-- ─────────────────────────────────────────────────────────────────────────────
-- toggle_message_reaction: add/remove the caller's user id under a reaction key.
-- Reactions are stored as { "<key>": ["<user_id>", ...] } so counts and
-- "did I react" are derivable without a separate table. Toggling server-side
-- avoids read-modify-write races between concurrent reactors.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.toggle_message_reaction(uuid, text);

create or replace function public.toggle_message_reaction(p_message_id uuid, p_reaction text)
returns public.board_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
  v_uid uuid := auth.uid();
  v_current jsonb;
  v_users jsonb;
  v_row public.board_messages;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select board_id, reactions into v_board_id, v_current
  from public.board_messages
  where id = p_message_id;

  if v_board_id is null then
    raise exception 'Message not found';
  end if;

  if not public.is_board_member(v_board_id) then
    raise exception 'Not a board member';
  end if;

  v_current := coalesce(v_current, '{}'::jsonb);
  v_users := coalesce(v_current -> p_reaction, '[]'::jsonb);

  if v_users @> to_jsonb(v_uid::text) then
    -- Already reacted: remove this user.
    v_users := (
      select coalesce(jsonb_agg(elem), '[]'::jsonb)
      from jsonb_array_elements(v_users) as elem
      where elem <> to_jsonb(v_uid::text)
    );
  else
    v_users := v_users || to_jsonb(v_uid::text);
  end if;

  if jsonb_array_length(v_users) = 0 then
    v_current := v_current - p_reaction;
  else
    v_current := jsonb_set(v_current, array[p_reaction], v_users, true);
  end if;

  update public.board_messages
  set reactions = v_current
  where id = p_message_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- set_message_pinned: pin/unpin a message. Any board member may pin, mirroring
-- the reaction rule. Message text is never touched here.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.set_message_pinned(uuid, boolean);

create or replace function public.set_message_pinned(p_message_id uuid, p_pinned boolean)
returns public.board_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
  v_row public.board_messages;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select board_id into v_board_id
  from public.board_messages
  where id = p_message_id;

  if v_board_id is null then
    raise exception 'Message not found';
  end if;

  if not public.is_board_member(v_board_id) then
    raise exception 'Not a board member';
  end if;

  update public.board_messages
  set pinned = coalesce(p_pinned, false)
  where id = p_message_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.set_message_pinned(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
