-- Add service and package price display to intake submissions

alter table public.intake_submissions
  add column if not exists service text not null default 'SEO';

alter table public.intake_submissions
  add column if not exists package_price_display text not null default '';
