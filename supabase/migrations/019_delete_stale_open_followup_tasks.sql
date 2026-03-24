-- Drop incomplete follow-ups whose due date is already in the past (UTC calendar day)
delete from public.tasks
where task_type = 'follow_up'
  and completed_at is null
  and due_date < ((now() at time zone 'utc')::date);
