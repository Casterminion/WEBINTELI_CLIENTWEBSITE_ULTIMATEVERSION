-- Optional note on follow-up tasks (scheduled day + reminder text)
alter table public.tasks
  add column if not exists notes text;
