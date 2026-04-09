-- Harden invoice numbering: drafts must not hold final series numbers; resync sequence counters from issued documents.

-- ---------------------------------------------------------------------------
-- 1) Drafts that still look like formal series numbers (legacy early assignment)
--    become internal placeholders DRAFT-{uuid}. Final numbers are assigned on issue only.
-- ---------------------------------------------------------------------------
update public.admin_invoices
set
  invoice_number = 'DRAFT-' || id::text,
  updated_at = now()
where status = 'draft'
  and invoice_number ~* '^(SF|ISK|KS|DS|PVM)-[0-9]+$';

-- ---------------------------------------------------------------------------
-- 2) Recompute admin_invoice_sequences from non-draft rows with formal numbers
--    so counters match the highest issued (incl. cancelled) number per type.
-- ---------------------------------------------------------------------------
insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'sales_invoice', coalesce(max((regexp_match(invoice_number, '^[Ss][Ff]-([0-9]+)$'))[1]::int), 0)
from public.admin_invoices
where status <> 'draft'
  and document_type = 'sales_invoice'
  and invoice_number ~ '^[Ss][Ff]-[0-9]+$'
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Ss][Ff]-([0-9]+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update set
  last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'proforma_invoice', coalesce(max((regexp_match(invoice_number, '^[Ii][Ss][Kk]-([0-9]+)$'))[1]::int), 0)
from public.admin_invoices
where status <> 'draft'
  and document_type = 'proforma_invoice'
  and invoice_number ~ '^[Ii][Ss][Kk]-[0-9]+$'
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Ii][Ss][Kk]-([0-9]+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update set
  last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'credit_note', coalesce(max((regexp_match(invoice_number, '^[Kk][Ss]-([0-9]+)$'))[1]::int), 0)
from public.admin_invoices
where status <> 'draft'
  and document_type = 'credit_note'
  and invoice_number ~ '^[Kk][Ss]-[0-9]+$'
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Kk][Ss]-([0-9]+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update set
  last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'debit_note', coalesce(max((regexp_match(invoice_number, '^[Dd][Ss]-([0-9]+)$'))[1]::int), 0)
from public.admin_invoices
where status <> 'draft'
  and document_type = 'debit_note'
  and invoice_number ~ '^[Dd][Ss]-[0-9]+$'
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Dd][Ss]-([0-9]+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update set
  last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);

insert into public.admin_invoice_sequences (user_id, document_type, last_sequence)
select user_id, 'vat_invoice', coalesce(max((regexp_match(invoice_number, '^[Pp][Vv][Mm]-([0-9]+)$'))[1]::int), 0)
from public.admin_invoices
where status <> 'draft'
  and document_type = 'vat_invoice'
  and invoice_number ~ '^[Pp][Vv][Mm]-[0-9]+$'
group by user_id
having coalesce(max((regexp_match(invoice_number, '^[Pp][Vv][Mm]-([0-9]+)$'))[1]::int), 0) > 0
on conflict (user_id, document_type) do update set
  last_sequence = greatest(public.admin_invoice_sequences.last_sequence, excluded.last_sequence);
