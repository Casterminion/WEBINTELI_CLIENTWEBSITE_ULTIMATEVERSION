-- CRM fields and authenticated insert for intake_submissions
alter table public.intake_submissions
  add column if not exists phone text;

alter table public.intake_submissions
  add column if not exists business_owner_name text;

create policy "Allow authenticated insert intake_submissions"
  on public.intake_submissions for insert
  to authenticated
  with check (true);
