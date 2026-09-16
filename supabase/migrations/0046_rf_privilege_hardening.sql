-- RF-02B - least-privilege hardening for RF objects.
--
-- Existing Supabase defaults for objects created by postgres in public grant
-- broad privileges to anon/authenticated. RF objects use explicit grants so
-- their effective access does not depend on those project defaults.

-- Tenant links: authenticated identities need CRUD at the role layer so RLS
-- can distinguish ordinary tenant users from platform staff.
revoke all privileges on table public.rf_company_links from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.rf_company_links to authenticated;
grant select, insert, update, delete on table public.rf_company_links to service_role;

-- Verification helpers have no application consumer.
revoke all privileges on function public.rf02_verify_cnpj_roundtrip(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.rf02_get_current_dataset_count()
  from public, anon, authenticated, service_role;
grant execute on function public.rf02_verify_cnpj_roundtrip(text) to service_role;
grant execute on function public.rf02_get_current_dataset_count() to service_role;

-- The future RF pipeline uses service_role. Grant explicit access instead of
-- relying on RLS bypass alone.
grant usage on schema rf_raw, rf_canonical to service_role;
grant all privileges on all tables in schema rf_raw to service_role;
grant all privileges on all tables in schema rf_canonical to service_role;

-- Repository migrations create public objects as postgres. Existing objects
-- are unchanged; future user-facing access must be granted explicitly.
-- Function EXECUTE has a PostgreSQL global PUBLIC default; a schema-level
-- revoke cannot negate it, so remove that global default first. Existing
-- functions and explicit per-schema grants are unaffected.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- RF schemas default private. Future pipeline objects are available only to
-- service_role until a migration explicitly grants user-facing access.
alter default privileges for role postgres in schema rf_raw
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema rf_raw
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema rf_raw
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema rf_raw
  grant all privileges on tables to service_role;
alter default privileges for role postgres in schema rf_raw
  grant all privileges on sequences to service_role;
alter default privileges for role postgres in schema rf_raw
  grant execute on functions to service_role;

alter default privileges for role postgres in schema rf_canonical
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema rf_canonical
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema rf_canonical
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema rf_canonical
  grant all privileges on tables to service_role;
alter default privileges for role postgres in schema rf_canonical
  grant all privileges on sequences to service_role;
alter default privileges for role postgres in schema rf_canonical
  grant execute on functions to service_role;
