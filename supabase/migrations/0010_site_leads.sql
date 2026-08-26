-- GSBC — Rodada 6 (site institucional): captura de leads
--
-- O site público (regra 82-84) precisa de um formulário de diagnóstico e de
-- contato que funcione de verdade — não um formulário decorativo. Como o
-- visitante ainda não é um usuário autenticado (não existe tenant/membership
-- antes da parceria começar), esta tabela vive fora do modelo de
-- multi-tenancy: é pré-venda, não dado operacional de um sindicato cliente.

create table site_leads (
  id uuid primary key default gen_random_uuid(),
  origem text not null check (origem in ('diagnostico', 'contato')),
  nome text not null,
  sindicato_nome text,
  cargo text,
  email text not null,
  telefone text,
  mensagem text,
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'convertido', 'descartado')),
  created_at timestamptz not null default now()
);

comment on table site_leads is 'Leads capturados no site institucional (diagnóstico gratuito / contato) — pré-venda, fora do modelo multi-tenant.';

alter table site_leads enable row level security;

-- Qualquer visitante (autenticado ou não) pode enviar o formulário.
create policy site_leads_insert on site_leads for insert
  to anon, authenticated
  with check (true);

-- Só a equipe GSBC (tenant platform) acompanha os leads recebidos.
create policy site_leads_select on site_leads for select
  to authenticated
  using (public.is_platform_staff(auth.uid()));

create policy site_leads_update on site_leads for update
  to authenticated
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

grant usage on schema public to anon;
grant insert on public.site_leads to anon, authenticated;
grant select, update on public.site_leads to authenticated;
