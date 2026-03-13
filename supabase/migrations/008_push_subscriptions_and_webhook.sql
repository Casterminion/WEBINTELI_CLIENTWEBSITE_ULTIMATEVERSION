-- Push subscriptions storage for admin devices
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is 'Web push subscriptions for admin lead alerts';

-- NOTE: Supabase database webhooks / Edge Functions cannot be fully configured via SQL alone.
-- In the Supabase dashboard, create a database webhook or edge function trigger on:
--   INSERT on public.intake_submissions
-- filtered by NEW.assigned_to IS NULL if you add that column,
-- and point it to your deployed notify-new-lead API endpoint, e.g.:
--   https://your-site.netlify.app/api/push/notify-new-lead
-- Include a header:
--   x-webinteli-signature: <value of PUSH_WEBHOOK_SECRET env var>


