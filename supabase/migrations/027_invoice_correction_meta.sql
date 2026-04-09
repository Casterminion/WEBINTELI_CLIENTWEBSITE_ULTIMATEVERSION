-- Metadata for invoice correction documents (credit / debit notes linked to an original invoice).

alter table public.admin_invoices
  add column if not exists correction_reason text,
  add column if not exists correction_amount numeric,
  add column if not exists correction_original_total_snapshot numeric;

comment on column public.admin_invoices.correction_reason is 'Korekcijos priežastis (susieta su kred./deb. dokumentu)';
comment on column public.admin_invoices.correction_amount is 'Korekcijos dydis (teigiama suma dokumente)';
comment on column public.admin_invoices.correction_original_total_snapshot is 'Pradinė originalios sąskaitos bendra suma kūrimo metu';
