-- Fix: public.testimonials had RLS enabled with board-scoped policies but no
-- table-level privileges, so every insert (even from an authenticated board
-- member) failed with "permission denied for table testimonials". This
-- surfaced in the app as the testimonial popup's submit silently failing.
--
-- Row-level security decides which ROWS a role may touch; table GRANTs are
-- still required for the role to touch the table at all. Only select and
-- insert are needed (no update/delete path exists in the app), and row
-- visibility remains scoped to each user's own submissions plus board
-- membership through the existing testimonials_select_own /
-- testimonials_insert_member policies, so this does not expose testimonials
-- across users or boards.
--
-- `anon` is intentionally NOT granted access: the popup is only shown to
-- signed-in board members, and RLS would deny anon rows anyway (auth.uid()
-- is null).

grant select, insert on table public.testimonials to authenticated;

notify pgrst, 'reload schema';
