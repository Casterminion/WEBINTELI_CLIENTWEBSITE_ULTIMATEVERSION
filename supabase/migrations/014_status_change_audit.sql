-- Who first moved the lead out of "new" (audit + display)
alter table public.intake_submissions
  add column if not exists status_changed_by_email text,
  add column if not exists status_changed_at timestamptz;

comment on column public.intake_submissions.status_changed_by_email is 'Email of admin who changed status from new to another state';
