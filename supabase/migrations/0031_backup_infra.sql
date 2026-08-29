-- GSBC — Rodada 32: Backup periódico (stopgap sem PITR)
--
-- Plano Free do Supabase não tem PITR nem backup automático nenhum
-- (confirmado ao vivo: `supabase backups list` retorna `pitr_enabled:
-- false, backups: []`). Decisão confirmada com o usuário: backup
-- lógico periódico via cron, sem custo extra, até decidir sobre
-- upgrade pra Pro.
--
-- Bucket privado, sem policy nenhuma de storage.objects — só o
-- service_role (que já contorna RLS) precisa tocar nele; sem policy
-- permissiva, authenticated/anon ficam automaticamente bloqueados
-- (mesmo modelo "deny by default" de todo o resto do schema).
insert into storage.buckets (id, name, public, file_size_limit)
values ('db-backups', 'db-backups', false, 524288000)
on conflict (id) do nothing;

-- Enumera as tabelas do schema public dinamicamente — o motor de
-- backup (src/lib/backup/engine.ts) nunca mantém uma lista hardcoded
-- de tabelas, que ficaria desatualizada a cada nova migration.
-- security definer pra poder ler information_schema mesmo chamado
-- via RPC; restrito a service_role (nunca exposto a authenticated/anon
-- — não é dado sensível em si, mas não há motivo pra expor).
create or replace function public.backup_list_tables()
returns table (table_name text)
language sql
security definer
set search_path = public
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
$$;

revoke all on function public.backup_list_tables() from public;
grant execute on function public.backup_list_tables() to service_role;
