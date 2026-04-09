-- Payment evidence (optional) + reminder state for issued unpaid invoices.

alter table public.admin_invoice_payments
  add column if not exists attachment_storage_path text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.admin_invoice_payment_reminders (
  invoice_id uuid primary key references public.admin_invoices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  snoozed_until date not null default '1970-01-01',
  last_prompt_date date,
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_invoice_payment_reminders_user
  on public.admin_invoice_payment_reminders (user_id);

alter table public.admin_invoice_payment_reminders enable row level security;

create policy "admin_invoice_payment_reminders_select_own"
  on public.admin_invoice_payment_reminders for select to authenticated
  using (user_id = auth.uid());

create policy "admin_invoice_payment_reminders_insert_own"
  on public.admin_invoice_payment_reminders for insert to authenticated
  with check (user_id = auth.uid());

create policy "admin_invoice_payment_reminders_update_own"
  on public.admin_invoice_payment_reminders for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin_invoice_payment_reminders_delete_own"
  on public.admin_invoice_payment_reminders for delete to authenticated
  using (user_id = auth.uid());

-- Private bucket: {user_id}/{payment_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-payment-attachments',
  'admin-payment-attachments',
  false,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admin_payment_attachments_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'admin-payment-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admin_payment_attachments_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'admin-payment-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admin_payment_attachments_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'admin-payment-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'admin-payment-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admin_payment_attachments_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'admin-payment-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
