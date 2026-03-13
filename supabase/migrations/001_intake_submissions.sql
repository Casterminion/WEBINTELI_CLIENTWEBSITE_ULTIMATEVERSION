-- Table for intake form submissions (paste into Supabase SQL Editor)
-- Run this once in: Supabase Dashboard → SQL Editor → New query

create table if not exists public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  city text not null,
  industry text not null,
  package_slug text not null,
  created_at timestamptz not null default now()
);

-- Indexes for listing by date or package
create index if not exists idx_intake_submissions_created_at
  on public.intake_submissions (created_at desc);
create index if not exists idx_intake_submissions_package_slug
  on public.intake_submissions (package_slug);

-- RLS
alter table public.intake_submissions enable row level security;

-- Allow anyone to INSERT (anonymous form submit)
create policy "Allow anonymous insert"
  on public.intake_submissions for insert
  to anon
  with check (true);

-- Restrict SELECT: only authenticated users can read (or use service_role for dashboard)
create policy "Allow authenticated read"
  on public.intake_submissions for select
  to authenticated
  using (true);

-- Optional: service_role full access (e.g. server-side scripts)
-- create policy "Service role all"
--   on public.intake_submissions for all
--   to service_role using (true) with check (true);
