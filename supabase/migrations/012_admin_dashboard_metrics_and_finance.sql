-- Daily milestone counters per admin user (manual entry per calendar day)
create table if not exists public.admin_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  sent_emails integer not null default 0,
  calls_made integer not null default 0,
  emails_opened integer not null default 0,
  replies integer not null default 0,
  positive_replies integer not null default 0,
  looms_sent integer not null default 0,
  payment_links_sent integer not null default 0,
  meetings_got integer not null default 0,
  clients_got integer not null default 0,
  upsells integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_admin_daily_metrics_user_date
  on public.admin_daily_metrics (user_id, date desc);

alter table public.admin_daily_metrics enable row level security;

create policy "admin_daily_metrics_select_own"
  on public.admin_daily_metrics for select to authenticated
  using (user_id = auth.uid());

create policy "admin_daily_metrics_insert_own"
  on public.admin_daily_metrics for insert to authenticated
  with check (user_id = auth.uid());

create policy "admin_daily_metrics_update_own"
  on public.admin_daily_metrics for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin_daily_metrics_delete_own"
  on public.admin_daily_metrics for delete to authenticated
  using (user_id = auth.uid());

-- Income / expense ledger
create table if not exists public.admin_finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  entry_type text not null check (entry_type in ('income', 'expense')),
  amount_eur numeric(12, 2) not null check (amount_eur >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_finance_entries_user_occurred
  on public.admin_finance_entries (user_id, occurred_on desc);

alter table public.admin_finance_entries enable row level security;

create policy "admin_finance_entries_select_own"
  on public.admin_finance_entries for select to authenticated
  using (user_id = auth.uid());

create policy "admin_finance_entries_insert_own"
  on public.admin_finance_entries for insert to authenticated
  with check (user_id = auth.uid());

create policy "admin_finance_entries_update_own"
  on public.admin_finance_entries for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin_finance_entries_delete_own"
  on public.admin_finance_entries for delete to authenticated
  using (user_id = auth.uid());
