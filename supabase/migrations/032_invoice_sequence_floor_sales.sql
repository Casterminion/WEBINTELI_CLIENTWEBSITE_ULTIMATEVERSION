-- Optional floor for SF series when invoices were issued outside the app (manual numbering).
-- next preview / issue use max(DB last_sequence, floor) before allocating the next number.

alter table public.admin_company_tax_settings
  add column if not exists invoice_sequence_floor_sales int
  check (invoice_sequence_floor_sales is null or invoice_sequence_floor_sales >= 0);

comment on column public.admin_company_tax_settings.invoice_sequence_floor_sales is
  'Minimum consumed SF sequence count for this user (e.g. 1 if SF-001 was already used manually). Next app issue uses max(DB sequence, this floor) + 1.';
 