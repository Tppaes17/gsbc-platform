-- GSBC — Rodada 1: privilégios de tabela para o papel `authenticated`
--
-- RLS por si só não concede acesso: o Postgres exige GRANT de privilégio na
-- tabela ANTES de as policies serem avaliadas. Sem os grants abaixo, toda
-- query autenticada falha com "permission denied for table X" (42501),
-- independentemente das policies de RLS estarem corretas.
--
-- Encontrado ao testar o fluxo de login ponta a ponta nesta rodada
-- (supabase/seed.sql + login real): auth.getUser() funcionava, mas a
-- consulta a public.users falhava com 42501 até este grant ser aplicado.

grant usage on schema public to authenticated;

-- Leitura: RLS decide quais linhas cada usuário efetivamente vê.
grant select on public.tenants to authenticated;
grant select on public.sindicatos to authenticated;
grant select on public.sindicato_contatos to authenticated;
grant select on public.users to authenticated;
grant select on public.roles to authenticated;
grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.memberships to authenticated;
grant select on public.audit_logs to authenticated;

-- Escrita: apenas onde 0002_rls_policies.sql define policies de insert/update/delete.
grant insert, update, delete on public.tenants to authenticated;
grant insert, update, delete on public.sindicatos to authenticated;
grant insert, update, delete on public.sindicato_contatos to authenticated;
grant update on public.users to authenticated;
grant insert, update, delete on public.memberships to authenticated;

-- roles, permissions, role_permissions: sem grant de escrita — catálogo
-- system-managed em P0 (só service_role altera).
-- audit_logs: sem grant de escrita direta — inserção exclusiva via
-- public.log_audit_event (SECURITY DEFINER), reforçando a imutabilidade
-- do log mesmo se uma policy de insert for adicionada por engano no futuro.

grant execute on function public.is_platform_staff(uuid) to authenticated;
grant execute on function public.user_tenant_ids(uuid) to authenticated;
