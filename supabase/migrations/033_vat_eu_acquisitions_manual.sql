-- Optional manual YTD estimate for EU goods acquisitions (14k EUR monitoring). Not a legal determination.

alter table public.admin_company_tax_settings
  add column if not exists vat_eu_acquisitions_manual_eur numeric;

comment on column public.admin_company_tax_settings.vat_eu_acquisitions_manual_eur is
  'Manual estimate of EU goods acquisitions (EUR) for 14k threshold widget; separate from sales turnover.';
