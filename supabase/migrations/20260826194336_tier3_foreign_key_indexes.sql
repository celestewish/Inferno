
CREATE INDEX IF NOT EXISTS idx_board_docs_project_id ON public.board_docs(project_id);
CREATE INDEX IF NOT EXISTS idx_board_docs_task_id ON public.board_docs(task_id);
CREATE INDEX IF NOT EXISTS idx_board_docs_user_id ON public.board_docs(user_id);

CREATE INDEX IF NOT EXISTS idx_board_invites_invited_by ON public.board_invites(invited_by);

CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON public.board_members(user_id);

CREATE INDEX IF NOT EXISTS idx_board_messages_project_id ON public.board_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_board_messages_user_id ON public.board_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_board_repositories_project_id ON public.board_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_board_repositories_user_id ON public.board_repositories(user_id);

CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON public.boards(owner_id);

CREATE INDEX IF NOT EXISTS idx_campfire_channels_created_by ON public.campfire_channels(created_by);
CREATE INDEX IF NOT EXISTS idx_campfire_channels_project_id ON public.campfire_channels(project_id);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_created_by ON public.meeting_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_project_id ON public.meeting_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_updated_by ON public.meeting_notes(updated_by);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_board_id ON public.projects(board_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
