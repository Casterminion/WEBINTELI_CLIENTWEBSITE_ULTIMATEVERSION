-- Link final sales invoices (Sąskaita faktūra) to source proforma (Išankstinė sąskaita).
-- Separate from related_invoice_id (used for credit/debit corrections).

alter table public.admin_invoices
  add column if not exists source_proforma_id uuid references public.admin_invoices (id) on delete set null;

comment on column public.admin_invoices.source_proforma_id is 'Proforma (IŠANKSTINĖ) from which this sales_invoice was created';

-- At most one non-cancelled sales invoice per proforma (draft or issued counts as “active”).
create unique index if not exists admin_invoices_one_active_sf_per_proforma
  on public.admin_invoices (source_proforma_id)
  where source_proforma_id is not null
    and document_type = 'sales_invoice'
    and status is distinct from 'cancelled';
