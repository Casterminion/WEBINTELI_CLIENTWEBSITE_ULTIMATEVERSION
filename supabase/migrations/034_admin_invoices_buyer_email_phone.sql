-- Separate buyer e-mail and phone for PDF labels (legacy buyer_contact remains for compatibility).
alter table public.admin_invoices
  add column if not exists buyer_email text,
  add column if not exists buyer_phone text;

comment on column public.admin_invoices.buyer_email is 'Buyer e-mail (PDF El. paštas:).';
comment on column public.admin_invoices.buyer_phone is 'Buyer phone (PDF Tel.:).';
