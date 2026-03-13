-- Allow 'sold' status for leads
alter table public.intake_submissions
  drop constraint if exists intake_submissions_status_check;

alter table public.intake_submissions
  add constraint intake_submissions_status_check
  check (status in ('new', 'called', 'emailed', 'loom_sent', 'lost', 'sold'));
