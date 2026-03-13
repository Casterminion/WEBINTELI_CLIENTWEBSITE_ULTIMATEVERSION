-- Lead assignment and status on intake_submissions
alter table public.intake_submissions
  add column if not exists assigned_to uuid references auth.users (id) on delete set null;

alter table public.intake_submissions
  add column if not exists status text not null default 'new'
  check (status in ('new', 'called', 'emailed', 'lost'));

alter table public.intake_submissions
  add column if not exists loom_url text;

alter table public.intake_submissions
  add column if not exists claimed_at timestamptz;

create index if not exists idx_intake_submissions_assigned_to
  on public.intake_submissions (assigned_to);
create index if not exists idx_intake_submissions_status
  on public.intake_submissions (status);

-- Allow authenticated users to update (for claiming and marking lost)
create policy "Allow authenticated update intake_submissions"
  on public.intake_submissions for update
  to authenticated
  using (true)
  with check (true);

-- Tasks table for follow-ups
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.intake_submissions (id) on delete cascade,
  assigned_to uuid not null references auth.users (id) on delete cascade,
  due_date date not null,
  task_type text not null default 'follow_up',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_lead_id on public.tasks (lead_id);
create index if not exists idx_tasks_assigned_to on public.tasks (assigned_to);
create index if not exists idx_tasks_due_date on public.tasks (due_date);

alter table public.tasks enable row level security;

create policy "Allow authenticated select tasks"
  on public.tasks for select to authenticated using (true);

create policy "Allow authenticated insert tasks"
  on public.tasks for insert to authenticated with check (true);

create policy "Allow authenticated update tasks"
  on public.tasks for update to authenticated using (true) with check (true);
