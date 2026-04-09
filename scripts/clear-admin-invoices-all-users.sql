-- =============================================================================
-- ONE-OFF: wipe ALL Buhalterija invoices (every user). Irreversible.
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor, connected as postgres (or any role
-- that bypasses RLS). Do NOT add this file as a migration — it would re-run on deploy.
--
-- What it does:
--   • Deletes all objects in Storage bucket `admin-invoices` (PDFs)
--   • Optionally clears `admin-payment-attachments` (uncomment if you only had test data)
--   • NULLs self-FKs on invoices, then deletes every row in `admin_invoices`
--     (CASCADE removes `admin_invoice_payments` and `admin_invoice_payment_reminders`)
--   • Deletes all rows in `admin_invoice_sequences` so the next issued SF/ISK/etc.
--     starts numbering from 1 again for each user/document_type
--
-- Not touched: `admin_company_tax_settings` (company profile, VAT notes, sequence floors).
-- =============================================================================

begin;

-- Invoice PDFs (paths like {user_id}/{invoice_id}.pdf)
delete from storage.objects
where bucket_id = 'admin-invoices';

-- Uncomment if test payment attachments should go too (orphans files after payment rows cascade):
-- delete from storage.objects
-- where bucket_id = 'admin-payment-attachments';

update public.admin_invoices
set
  related_invoice_id = null,
  source_proforma_id = null;

delete from public.admin_invoices;

delete from public.admin_invoice_sequences;

commit;

-- Verify (optional):
-- select count(*) from public.admin_invoices;
-- select count(*) from public.admin_invoice_payments;
-- select count(*) from public.admin_invoice_sequences;
-- select count(*) from storage.objects where bucket_id = 'admin-invoices';

-- -----------------------------------------------------------------------------
-- Single user only: replace the global deletes above with, e.g.:
--   delete from storage.objects
--   where bucket_id = 'admin-invoices' and name like '<USER_UUID>/%';
--   update public.admin_invoices set related_invoice_id = null, source_proforma_id = null
--   where user_id = '<USER_UUID>';
--   delete from public.admin_invoices where user_id = '<USER_UUID>';
--   delete from public.admin_invoice_sequences where user_id = '<USER_UUID>';
-- -----------------------------------------------------------------------------
