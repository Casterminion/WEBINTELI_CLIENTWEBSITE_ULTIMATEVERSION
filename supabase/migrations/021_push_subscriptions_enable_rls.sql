-- Fix Supabase linter 0013_rls_disabled_in_public on public.push_subscriptions.
-- All app access uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Anon/authenticated
-- have no policies → no PostgREST access for those roles.
alter table public.push_subscriptions enable row level security;
