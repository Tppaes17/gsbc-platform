-- GSBC — Rodada 23: Payment Provider Integration (STG-06)
--
-- Decisão confirmada com o usuário: sem provider real contratado ainda
-- — constrói-se a abstração (PaymentProvider/Adapter, webhooks,
-- mapeamento de status, idempotência) com um adapter de simulação
-- ('mock') claramente identificado como tal (regra 9 do AGENTS.md:
-- nunca fingir que é funcionalidade pronta). Nenhuma cobrança real é
-- gerada por este staging — a UI mostra "Simulação" em todo lugar
-- relevante. Trocar por um provider real depois é só adicionar um novo
-- adapter que implemente a mesma interface.
--
-- "Charge" (intenção de cobrança — QR Pix, boleto) é conceitualmente
-- diferente de `pagamentos` (Rodada 8, ledger imutável do que já foi
-- efetivamente recebido): uma charge pode expirar/ser cancelada sem
-- nunca virar um pagamento. register_pagamento() (Rodada 8) continua
-- sendo o único caminho para lançar um pagamento — reaproveitado aqui
-- via cliente admin quando o webhook confirma "pago", em vez de
-- duplicar a lógica de cascata de status da cobrança.

-- =========================================================================
-- payment_charges — intenção de cobrança enviada ao provider (Pix/boleto).
-- =========================================================================
create table payment_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cobranca_id uuid not null references cobrancas(id) on delete cascade,
  provider text not null check (provider in ('mock')),
  tipo text not null check (tipo in ('pix', 'boleto')),
  valor numeric(14, 2) not null check (valor > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'cancelled', 'refunded', 'failed')),
  external_id text,
  external_status text,
  qr_code text,
  linha_digitavel text,
  boleto_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  pagamento_id uuid references pagamentos(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table payment_charges is
  '"internal_id" é payment_charges.id; "external_id" é o identificador '
  'do provider — nunca usar um no lugar do outro (regra explícita do '
  'roadmap STG-06). Uma charge não é um pagamento: vira pagamentos só '
  'quando o webhook confirma status=paid.';

create unique index payment_charges_external_id_idx on payment_charges (provider, external_id)
  where external_id is not null;
create index payment_charges_cobranca_id_idx on payment_charges (cobranca_id);

create trigger set_updated_at before update on payment_charges
  for each row execute function public.set_updated_at();

create or replace function public.enforce_payment_charge_matches_cobranca()
returns trigger language plpgsql as $$
declare
  v_tenant_id uuid;
  v_empresa_id uuid;
begin
  select tenant_id, empresa_id into v_tenant_id, v_empresa_id
  from cobrancas where id = new.cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança de origem não encontrada.';
  end if;

  if new.tenant_id <> v_tenant_id or new.empresa_id <> v_empresa_id then
    raise exception 'tenant_id/empresa_id da charge devem bater com os da cobrança de origem.';
  end if;

  return new;
end;
$$;

create trigger payment_charges_enforce_match
  before insert or update of cobranca_id, tenant_id, empresa_id on payment_charges
  for each row execute function public.enforce_payment_charge_matches_cobranca();

-- =========================================================================
-- payment_webhook_events — persistência bruta antes de qualquer
-- processamento (regra explícita do roadmap), com idempotência por
-- (provider, external_event_id): uma entrega duplicada do provider
-- nunca reprocessa.
-- =========================================================================
create table payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  charge_external_id text,
  payload jsonb not null,
  signature_valid boolean not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'ignored', 'error', 'manual_review')),
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_webhook_events_idempotency unique (provider, external_event_id)
);

comment on table payment_webhook_events is
  'Log bruto e imutável de todo evento recebido de um provider de '
  'pagamento — inserido ANTES de qualquer processamento, mesmo quando a '
  'assinatura falha ou o processamento dá erro (auditoria e revisão '
  'manual precisam do evento independente do resultado).';

create index payment_webhook_events_charge_idx on payment_webhook_events (charge_external_id);

alter table payment_charges enable row level security;
alter table payment_webhook_events enable row level security;

-- payment_charges: mesmo padrão de transparência de sempre — staff GSBC
-- gerencia, sindicato só acompanha (regra 6).
create policy payment_charges_select on payment_charges for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy payment_charges_insert on payment_charges for insert
  with check (public.is_platform_staff(auth.uid()));

create policy payment_charges_update on payment_charges for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

-- payment_webhook_events: nunca escrito pelo cliente autenticado — só o
-- endpoint de webhook, via service role (mesma justificativa já
-- documentada em src/lib/supabase/admin.ts pro cron do motor de
-- cobrança: não existe auth.uid() pra RLS avaliar numa chamada HTTP de
-- fora, o service role contorna RLS por completo). Só leitura pra staff,
-- pra debug/auditoria.
create policy payment_webhook_events_select on payment_webhook_events for select
  using (public.is_platform_staff(auth.uid()));

grant select, insert, update on public.payment_charges to authenticated;
grant select on public.payment_webhook_events to authenticated;
