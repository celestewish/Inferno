alter table public.analytics_events drop constraint analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check
  check (event_name in (
    'invite_sent','invite_accepted','invite_first_active_day',
    'guest_link_created','guest_link_viewed',
    'assignment_nudge_shown','assignment_nudge_clicked_invite',
    'assignment_nudge_clicked_guest_link','assignment_nudge_dismissed_permanently',
    'first_invite_reward_claimed'
  ));

-- One-time dedup flag: has this user (in either role) already claimed the reward
alter table public.profiles
  add column first_invite_reward_claimed_at timestamptz;

-- Idempotent claim check. Eligible if the caller has ever had an invite accepted
-- as either the inviter or the invitee. Safe to call speculatively/repeatedly —
-- returns eligible=false with no side effects once already claimed or not yet eligible.
-- Does NOT write xp/badges to profiles itself: returns the reward to grant so the
-- client can apply it via the existing gamification code path (keeps xp/level math
-- in one place).
create or replace function public.claim_first_invite_reward()
returns table(eligible boolean, xp_awarded integer, badge jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_claimed timestamptz;
  v_is_eligible boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select first_invite_reward_claimed_at into v_already_claimed
  from public.profiles where id = auth.uid();

  if v_already_claimed is not null then
    return query select false, 0, null::jsonb;
    return;
  end if;

  select exists (
    select 1 from public.board_invites
    where accepted_at is not null
      and (accepted_by = auth.uid() or invited_by = auth.uid())
  ) into v_is_eligible;

  if not v_is_eligible then
    return query select false, 0, null::jsonb;
    return;
  end if;

  update public.profiles
  set first_invite_reward_claimed_at = now()
  where id = auth.uid();

  insert into public.analytics_events (event_name, user_id, metadata)
  values ('first_invite_reward_claimed', auth.uid(), jsonb_build_object('xp_awarded', 30));

  return query select true, 30,
    jsonb_build_object(
      'id', 'not_alone_anymore',
      'icon', '🤝',
      'name', 'Not Alone Anymore',
      'rarity', 'uncommon',
      'description', 'Grow a board beyond just you.'
    );
end;
$$;

revoke execute on function public.claim_first_invite_reward() from public;
grant execute on function public.claim_first_invite_reward() to authenticated;
