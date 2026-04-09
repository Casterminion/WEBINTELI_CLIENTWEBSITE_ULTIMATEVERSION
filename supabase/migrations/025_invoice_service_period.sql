-- Service delivery: optional period (from–to) vs single service_date (mutually exclusive in app).

alter table public.admin_invoices
  add column if not exists service_period_from date,
  add column if not exists service_period_to date;

comment on column public.admin_invoices.service_date is 'Single service/delivery date when not using a period.';
comment on column public.admin_invoices.service_period_from is 'Start of service period; use with service_period_to; service_date should be null.';
comment on column public.admin_invoices.service_period_to is 'End of service period; must be >= service_period_from.';
