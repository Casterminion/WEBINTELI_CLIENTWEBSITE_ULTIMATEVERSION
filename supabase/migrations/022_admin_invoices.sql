-- Invoices (sąskaitos faktūros) for admin Buhalterija; PDFs in Storage bucket admin-invoices

create table if not exists public.admin_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  document_title text not null,
  invoice_type text not null,
  seller_name text not null,
  seller_code text not null,
  seller_address text not null,
  seller_contact_line text not null,
  seller_bank_account text not null,
  buyer_name text not null,
  buyer_code text,
  buyer_address text,
  buyer_contact text,
  currency text not null default 'EUR',
  line_items jsonb not null default '[]'::jsonb,
  notes text,
  vat_summary_line text not null default 'Neskaičiuojamas',
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_invoices_user_issue
  on public.admin_invoices (user_id, issue_date desc);

alter table public.admin_invoices enable row level security;

create policy "admin_invoices_select_own"
  on public.admin_invoices for select to authenticated
  using (user_id = auth.uid());

create policy "admin_invoices_insert_own"
  on public.admin_invoices for insert to authenticated
  with check (user_id = auth.uid());

create policy "admin_invoices_update_own"
  on public.admin_invoices for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin_invoices_delete_own"
  on public.admin_invoices for delete to authenticated
  using (user_id = auth.uid());

-- Private bucket: object path {user_id}/{invoice_id}.pdf
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-invoices',
  'admin-invoices',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admin_invoices_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'admin-invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admin_invoices_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'admin-invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admin_invoices_storage_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'admin-invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'admin-invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admin_invoices_storage_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'admin-invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
