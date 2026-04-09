-- Extend admin_company_tax_settings with company/seller profile, bank, invoice defaults, optional number prefixes.
-- Existing rows get defaults via ADD COLUMN ... DEFAULT; issued invoices unchanged (columns on settings only).

alter table public.admin_company_tax_settings
  add column if not exists company_name text not null default 'Webinteli MB',
  add column if not exists company_code text not null default '307617594',
  add column if not exists company_vat_code text,
  add column if not exists company_address text not null default 'Europos pr. 34, LT-46370 Kaunas',
  add column if not exists company_email text not null default 'arijus@webinteli.lt',
  add column if not exists company_phone text not null default '+370 648 83116',
  add column if not exists company_website text,
  add column if not exists company_country text not null default 'LT',
  add column if not exists bank_name text,
  add column if not exists bank_account text not null default 'LT08 7044 0901 1631 9200',
  add column if not exists bank_swift text,
  add column if not exists default_currency text not null default 'EUR',
  add column if not exists default_payment_term_days int not null default 7
    check (default_payment_term_days >= 0 and default_payment_term_days <= 365),
  add column if not exists default_invoice_notes text not null default $note$
Apmokėjimas bankiniu pavedimu pagal sutartį.
Pardavėjas nėra PVM mokėtojas.$note$,
  add column if not exists seller_not_vat_payer_note text not null default 'Pardavėjas nėra PVM mokėtojas.',
  add column if not exists invoice_number_prefix_sales text,
  add column if not exists invoice_number_prefix_proforma text,
  add column if not exists invoice_number_prefix_credit text,
  add column if not exists invoice_number_prefix_debit text,
  add column if not exists invoice_number_prefix_vat text;

comment on column public.admin_company_tax_settings.default_vat_footer_note is
  'Primary non-VAT footer line for invoices/PDF (e.g. PVM neskaičiuojamas.).';
comment on column public.admin_company_tax_settings.seller_not_vat_payer_note is
  'Secondary non-VAT seller status line; combined with default_vat_footer_note for vat_summary_line.';
