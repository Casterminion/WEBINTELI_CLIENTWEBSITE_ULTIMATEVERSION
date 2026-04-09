-- Atskiri pardavėjo el. pašto ir telefono laukai; seller_contact_line lieka (suderinamumas / PDF).

alter table public.admin_invoices
  add column if not exists seller_email text,
  add column if not exists seller_phone text;

update public.admin_invoices
set
  seller_email = case
    when seller_contact_line like '%@%' and strpos(seller_contact_line, ' · ') > 0
      then trim(split_part(seller_contact_line, ' · ', 1))
    when seller_contact_line like '%@%' then trim(seller_contact_line)
    else null
  end,
  seller_phone = case
    when strpos(seller_contact_line, ' · ') > 0 and seller_contact_line like '%@%'
      then trim(substring(seller_contact_line from strpos(seller_contact_line, ' · ') + 3))
    when seller_contact_line not like '%@%' then trim(seller_contact_line)
    else null
  end
where coalesce(trim(seller_email), '') = ''
  and coalesce(trim(seller_phone), '') = '';
