-- Invoice lifecycle: document types, status, payments, per-type sequences, company tax settings.
-- Extends admin_invoices; backfills legacy rows safely.

-- ---------------------------------------------------------------------------
-- Company tax / VAT monitoring (one row per admin user; app may insert on first load)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_company_tax_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tax_profile_type text not null default 'non_vat'
    check (tax_profile_type in ('non_vat', 'vat', 'vat_svs')),
  default_vat_footer_note text not null default 'PVM neskaičiuojamas.',
  vat_turnover_manual_eur numeric,
  purchases_services_from_foreign boolean not null default false,
  provides_b2b_services_to_eu boolean not null default false,
  enable_vat_invoices boolean not null default false,
  require_buyer_company_code boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.admin_company_tax_settings enable row level security;

create policy "admin_company_tax_settings_select_own"
  on public.admin_company_tax_settings for select to authenticated
  using (user_id = auth.uid());

create policy "admin_company_tax_settings_insert_own"
  on public.admin_company_tax_settings for insert to authenticated
  with check (user_id = auth.uid());

create policy "admin_company_tax_settings_update_own"
  on public.admin_company_tax_settings for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin_company_tax_settings_delete_own"
  on public.admin_company_tax_settings for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Per-(user, document_type) sequential counter for invoice numbers
-- ---------------------------------------------------------------------------
create table if not exists public.admin_invoice_sequences (
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null
    check (document_type in (
      'proforma_invoice', 'sales_invoice', 'credit_note', 'debit_note', 'vat_invoice'
    )),
  last_sequence int not null default 0 check (last_sequence >= 0),
  primary key (user_id, document_type)
);

alter table public.admin_invoice_sequences enable row level security;

create policy "admin_invoice_sequences_select_own"
  on public.admin_invoice_sequences for select to authenticated
  using (user_id = auth.uid());

create policy "admin_invoice_sequences_insert_own"
  on public.admin_invoice_sequences for insert to authenticated
  with check (user_id = auth.uid());

create policy "admin_invoice_sequences_update_own"
  on public.admin_invoice_sequences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin_invoice_sequences_delete_own"
  on public.admin_invoice_sequences for delete to authenticated
  using (user_id = auth.uid());

-- Atomic next sequence for the current user (SECURITY DEFINER; checks auth.uid())
create or replace function public.admin_next_invoice_sequence(p_document_type text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_next int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_document_type not in (
    'proforma_invoice', 'sales_invoice', 'credit_note', 'debit_note', 'vat_invoice'
  ) then
    raise exception 'invalid document_type';
  end if;

  insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
  values (v_uid, p_document_type, 1)
  on conflict (user_id, document_type)
  do update set last_sequence = public.admin_invoice_sequences.last_sequence + 1
  returning last_sequence into v_next;

  return v_next;
end;
$$;

revoke all on function public.admin_next_invoice_sequence(text) from public;
grant execute on function public.admin_next_invoice_sequence(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Payments (separate from invoice issuance)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.admin_invoices (id) on delete cascade,
  payment_date date not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  method text not null default 'bank_transfer',
  reference text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_invoice_payments_invoice
  on public.admin_invoice_payments (invoice_id);

alter table public.admin_invoice_payments enable row level security;

create policy "admin_invoice_payments_select_own"
  on public.admin_invoice_payments for select to authenticated
  using (user_id = auth.uid());

create policy "admin_invoice_payments_insert_own"
  on public.admin_invoice_payments for insert to authenticated
  with check (user_id = auth.uid());

create policy "admin_invoice_payments_update_own"
  on public.admin_invoice_payments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin_invoice_payments_delete_own"
  on public.admin_invoice_payments for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Extend admin_invoices
-- ---------------------------------------------------------------------------
alter table public.admin_invoices
  add column if not exists document_type text
    check (document_type is null or document_type in (
      'proforma_invoice', 'sales_invoice', 'credit_note', 'debit_note', 'vat_invoice'
    )),
  add column if not exists status text
    check (status is null or status in (
      'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'
    )),
  add column if not exists service_date date,
  add column if not exists subtotal numeric,
  add column if not exists total numeric,
  add column if not exists tax_profile_snapshot jsonb default '{"type":"non_vat"}'::jsonb,
  add column if not exists related_invoice_id uuid references public.admin_invoices (id) on delete set null,
  add column if not exists issued_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists seller_snapshot_json jsonb,
  add column if not exists buyer_snapshot_json jsonb;

-- Backfill totals from line_items (jsonb array with line_total)
update public.admin_invoices i
set
  subtotal = coalesce((
    select round(sum((e.elem->>'line_total')::numeric), 2)
    from jsonb_array_elements(i.line_items) as e(elem)
    where (e.elem->>'line_total') is not null
      and (e.elem->>'line_total')::text ~ '^-?[0-9]+\.?[0-9]*$'
  ), 0),
  total = coalesce((
    select round(sum((e.elem->>'line_total')::numeric), 2)
    from jsonb_array_elements(i.line_items) as e(elem)
    where (e.elem->>'line_total') is not null
      and (e.elem->>'line_total')::text ~ '^-?[0-9]+\.?[0-9]*$'
  ), 0)
where i.subtotal is null or i.total is null;

-- Default totals if still null
update public.admin_invoices
set subtotal = 0, total = 0
where subtotal is null or total is null;

-- Heuristic document_type from legacy free-text fields
update public.admin_invoices
set document_type = case
  when lower(coalesce(invoice_type, '') || ' ' || coalesce(document_title, '')) ~ '(avans|išankstin|isankstin)' then 'proforma_invoice'
  else 'sales_invoice'
end
where document_type is null;

-- Status + issued_at: historical rows with PDF were effectively issued
update public.admin_invoices
set
  status = case
    when pdf_storage_path is not null and trim(pdf_storage_path) <> '' then 'issued'
    else 'draft'
  end,
  issued_at = case
    when pdf_storage_path is not null and trim(pdf_storage_path) <> '' then created_at
    else null
  end
where status is null;

-- Service date: unknown for legacy — use issue_date (TODO: user may correct on new edits if draft)
update public.admin_invoices
set service_date = issue_date
where service_date is null;

-- Snapshots for already-issued legacy: copy current party fields so locking has a baseline
update public.admin_invoices
set
  seller_snapshot_json = jsonb_build_object(
    'seller_name', seller_name,
    'seller_code', seller_code,
    'seller_address', seller_address,
    'seller_contact_line', seller_contact_line,
    'seller_bank_account', seller_bank_account
  ),
  buyer_snapshot_json = jsonb_build_object(
    'buyer_name', buyer_name,
    'buyer_code', buyer_code,
    'buyer_address', buyer_address,
    'buyer_contact', buyer_contact
  )
where issued_at is not null
  and seller_snapshot_json is null;

alter table public.admin_invoices
  alter column document_type set default 'sales_invoice',
  alter column status set default 'draft';

-- Enforce NOT NULL on new columns after backfill
alter table public.admin_invoices
  alter column document_type set not null,
  alter column status set not null,
  alter column subtotal set not null,
  alter column total set not null;

alter table public.admin_invoices
  alter column tax_profile_snapshot set default '{"type":"non_vat"}'::jsonb;

update public.admin_invoices
set tax_profile_snapshot = '{"type":"non_vat"}'::jsonb
where tax_profile_snapshot is null;

alter table public.admin_invoices
  alter column tax_profile_snapshot set not null;

-- Seed per-type sequence counters from legacy PREFIX-NNN numbers (avoid reusing numbers)
insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'sales_invoice', coalesce(max((regexp_match(invoice_number, '^[Ss][Ff]-(\d+)$'))[1]::int), 0)
from public.admin_invoices
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Ss][Ff]-(\d+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update
set last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'proforma_invoice', coalesce(max((regexp_match(invoice_number, '^[Ii][Ss][Kk]-(\d+)$'))[1]::int), 0)
from public.admin_invoices
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Ii][Ss][Kk]-(\d+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update
set last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'credit_note', coalesce(max((regexp_match(invoice_number, '^[Kk][Ss]-(\d+)$'))[1]::int), 0)
from public.admin_invoices
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Kk][Ss]-(\d+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update
set last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'debit_note', coalesce(max((regexp_match(invoice_number, '^[Dd][Ss]-(\d+)$'))[1]::int), 0)
from public.admin_invoices
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Dd][Ss]-(\d+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update
set last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'vat_invoice', coalesce(max((regexp_match(invoice_number, '^[Pp][Vv][Mm]-(\d+)$'))[1]::int), 0)
from public.admin_invoices
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Pp][Vv][Mm]-(\d+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update
set last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

-- Optional: service_date remains nullable for edge cases; app will set on create
