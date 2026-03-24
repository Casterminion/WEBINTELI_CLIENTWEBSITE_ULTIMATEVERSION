-- Distinguish user-scheduled follow-ups vs pipeline auto-created ones
alter table public.tasks
  add column if not exists creation_source text not null default 'auto';

alter table public.tasks
  drop constraint if exists tasks_creation_source_check;

alter table public.tasks
  add constraint tasks_creation_source_check
  check (creation_source in ('manual', 'auto'));

comment on column public.tasks.creation_source is 'manual = user picked date on lead; auto = ensureNextOpenFollowUpTask';
