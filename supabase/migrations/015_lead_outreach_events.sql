-- Outreach log per lead (call, email, live, SMS)
create table if not exists public.lead_outreach_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.intake_submissions (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_by_email text,
  channel text not null
    check (channel in ('call', 'email', 'live', 'sms')),
  summary text not null,
  email_body_html text,
  audio_storage_path text,
  live_reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_outreach_events_lead_created
  on public.lead_outreach_events (lead_id, created_at desc);

alter table public.lead_outreach_events enable row level security;

create policy "Allow authenticated select lead_outreach_events"
  on public.lead_outreach_events for select
  to authenticated
  using (true);

create policy "Allow authenticated insert lead_outreach_events"
  on public.lead_outreach_events for insert
  to authenticated
  with check (true);
