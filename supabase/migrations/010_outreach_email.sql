-- Store which admin email was used to send the cold email (for manual leads)
alter table public.intake_submissions
  add column if not exists outreach_email text;
