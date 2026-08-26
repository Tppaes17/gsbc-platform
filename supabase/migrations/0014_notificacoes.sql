-- GSBC — Rodada 11: Notificações por e-mail
--
-- Pendência registrada desde a Rodada 5 ("notificação automática ao
-- mudar status para Notificada — hoje é só uma mudança de status manual,
-- sem disparo real de comunicação"). Desbloqueada pela mesma descoberta
-- da Rodada 10 (analytics/vector eram o único bloqueio de memória, não o
-- stack inteiro) — o Inbucket (SMTP local) já sobe junto com o Storage.
--
-- `notificacoes` é um log imutável de tentativas de envio — inclusive as
-- que falharam (regra 6: a plataforma registra, mesmo quando o envio não
-- funciona). Não é uma fila de reenvio automático; disparo é uma ação
-- explícita da equipe GSBC (regra 10 — sem automação implícita amarrada
-- a transição de status).

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cobranca_id uuid references cobrancas(id) on delete set null,
  destinatario_email text not null,
  assunto text not null,
  status text not null check (status in ('enviada', 'falha')),
  erro text,
  enviado_por uuid references users(id),
  created_at timestamptz not null default now()
);

comment on table notificacoes is 'Log imutável de e-mails de notificação enviados (ou tentados) para empresas — inclui falhas de envio.';

create or replace function public.enforce_notificacao_matches_empresa()
returns trigger language plpgsql as $$
declare
  v_tenant_id uuid;
  v_cobranca_empresa_id uuid;
begin
  select tenant_id into v_tenant_id from empresas where id = new.empresa_id;

  if v_tenant_id is null then
    raise exception 'Empresa não encontrada.';
  end if;

  if new.tenant_id <> v_tenant_id then
    raise exception 'tenant_id da notificação deve bater com o da empresa.';
  end if;

  if new.cobranca_id is not null then
    select empresa_id into v_cobranca_empresa_id from cobrancas where id = new.cobranca_id;
    if v_cobranca_empresa_id is null or v_cobranca_empresa_id <> new.empresa_id then
      raise exception 'cobranca_id da notificação deve pertencer à mesma empresa.';
    end if;
  end if;

  return new;
end;
$$;

create trigger notificacoes_enforce_match
  before insert on notificacoes
  for each row execute function public.enforce_notificacao_matches_empresa();

alter table notificacoes enable row level security;

create policy notificacoes_select on notificacoes for select
  using (public.user_can_access_empresa(empresa_id));

create policy notificacoes_insert on notificacoes for insert
  with check (public.is_platform_staff(auth.uid()));

grant select, insert on public.notificacoes to authenticated;
