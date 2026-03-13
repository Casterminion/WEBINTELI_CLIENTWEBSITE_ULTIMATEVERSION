-- For DBs that already ran 001 with phone: add email, then drop phone.
-- Existing rows get empty string for email so NOT NULL is satisfied.

alter table public.intake_submissions add column if not exists email text not null default '';
alter table public.intake_submissions drop column if exists phone;
alter table public.intake_submissions alter column email drop default;
