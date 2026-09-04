ALTER TABLE public.tasks ADD COLUMN due_date timestamptz;
ALTER TABLE public.tasks ADD COLUMN assignee_user_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN digest_unsubscribed_at timestamptz;

WITH due_parsed AS (
  SELECT
    id,
    due,
    created_at,
    CASE
      WHEN due ~ '^\d{4}-\d{2}-\d{2}$' THEN due::date
      WHEN due ~ '^[A-Za-z]{3} \d{1,2}$' THEN to_date(due || ' ' || extract(year from created_at)::int, 'Mon DD YYYY')
      ELSE NULL
    END AS candidate_date
  FROM public.tasks
)
UPDATE public.tasks t
SET due_date = dp.candidate_date::timestamptz
FROM due_parsed dp
WHERE t.id = dp.id
  AND dp.candidate_date IS NOT NULL
  AND dp.candidate_date >= dp.created_at::date;

UPDATE public.tasks t
SET assignee_user_id = p.id
FROM public.profiles p
WHERE (t.assignee = p.display_name OR t.assignee = p.gamer_tag)
  AND (
    SELECT count(*) FROM public.profiles p2
    WHERE t.assignee = p2.display_name OR t.assignee = p2.gamer_tag
  ) = 1;
