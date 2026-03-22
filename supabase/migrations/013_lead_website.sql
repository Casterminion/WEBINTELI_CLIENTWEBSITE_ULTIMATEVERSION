-- Prospect / business website (CRM)
alter table public.intake_submissions
  add column if not exists website text;
