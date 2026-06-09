-- Enable Row-Level Security on all public tables.
-- Data access is exclusively via Prisma (privileged role bypasses RLS),
-- so enabling RLS with no policies = default-deny for the anon/PostgREST API
-- without affecting the app. Fixes Supabase advisor: rls_disabled_in_public.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;
