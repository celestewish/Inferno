-- Fix: analytics_events_invite_id_fkey had no ON DELETE action (defaulted to
-- NO ACTION). trg_log_invite_sent inserts an analytics_events row on every
-- board_invites insert, so every invite ever created has a permanent
-- analytics_events row anchored to it, and Postgres refused to delete any
-- invite (foreign-key violation). SET NULL preserves the analytics/funnel
-- history while letting the invite itself be deleted.
alter table public.analytics_events
  drop constraint analytics_events_invite_id_fkey,
  add constraint analytics_events_invite_id_fkey
    foreign key (invite_id) references public.board_invites(id)
    on delete set null;
