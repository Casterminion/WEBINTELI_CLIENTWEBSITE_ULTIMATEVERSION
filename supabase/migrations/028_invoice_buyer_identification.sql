-- B2B buyer identification: country, company vs natural person, LT company code, foreign reg no, VAT (separate).

alter table public.admin_invoices
  add column if not exists buyer_country text not null default 'LT',
  add column if not exists buyer_type text not null default 'company'
    check (buyer_type in ('company', 'natural_person')),
  add column if not exists buyer_company_code text,
  add column if not exists buyer_registration_number text,
  add column if not exists buyer_vat_number text;

comment on column public.admin_invoices.buyer_country is 'ISO 3166-1 alpha-2 (default LT)';
comment on column public.admin_invoices.buyer_type is 'company | natural_person';
comment on column public.admin_invoices.buyer_company_code is 'Lithuanian company code (Įmonės kodas) when buyer_country = LT';
comment on column public.admin_invoices.buyer_registration_number is 'Foreign company registration number when buyer_country <> LT';
comment on column public.admin_invoices.buyer_vat_number is 'VAT / PVM payer code (optional, separate from company code)';

update public.admin_invoices
set buyer_company_code = nullif(trim(buyer_code), '')
where buyer_company_code is null
  and buyer_code is not null
  and trim(buyer_code) <> '';
