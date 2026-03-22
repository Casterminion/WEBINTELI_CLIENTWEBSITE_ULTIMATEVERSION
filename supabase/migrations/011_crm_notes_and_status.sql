-- Add notes column for CRM
alter table public.intake_submissions
  add column if not exists notes text;

-- Migrate existing status values to new schema before changing constraint
update public.intake_submissions
  set status = 'contacted'
  where status in ('called', 'emailed', 'loom_sent');

update public.intake_submissions
  set status = 'current_client'
  where status = 'sold';

-- Drop old constraint and add new status values
alter table public.intake_submissions
  drop constraint if exists intake_submissions_status_check;

alter table public.intake_submissions
  add constraint intake_submissions_status_check
  check (status in ('new', 'contacted', 'replies', 'meeting_agreed', 'agreed_to_pay', 'lost', 'sent_agreement', 'current_client'));
