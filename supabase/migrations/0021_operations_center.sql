-- GSBC — Rodada 20 (STG-03): Operations Center + Next Best Action
--
-- Transforma a plataforma de "system of record" em "system of action"
-- (docs/roadmap-stagings.md, STG-03): uma fila única do que a equipe
-- GSBC precisa fazer hoje, em vez de informação espalhada em cada ficha
-- de cobrança/negociação individual.
--
-- Escopo desta rodada (decisão de implementação, não de negócio — ver
-- rodada-20 pra justificativa completa): 5 dos 8 blocos do roadmap têm
-- dado real por trás hoje — tarefa humana da régua de cobrança (Rodada
-- 19), falha de automação, escalonamento, pagamento vencido e
-- negociação parada. "Contestações pendentes" fica de fora — a entidade
-- não existe ainda (STG-04). "Aguardando resposta"/"Follow-ups
-- vencidos" ficam de fora por não terem um sinal distinto dos outros 5
-- no schema atual — não inventado pra preencher a lista.
--
-- work_items é só um ponteiro + estado de workflow pra uma entidade já
-- existente (regra do roadmap: "WorkItem referencia entidades reais.
-- Não duplica domínio") — nunca copia dado de cobranca/negociacao, só
-- aponta pra ela.

create table work_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  tipo text not null check (tipo in (
    'tarefa_regua_cobranca',
    'falha_automacao',
    'escalonamento',
    'pagamento_vencido',
    'negociacao_parada'
  )),
  entity_type text not null check (entity_type in ('cobranca', 'negociacao', 'collection_enrollment')),
  entity_id uuid not null,
  titulo text not null,
  descricao text,
  prioridade text not null default 'medium' check (prioridade in ('low', 'medium', 'high')),
  due_at timestamptz,
  status text not null default 'aberto' check (status in ('aberto', 'concluido', 'adiado', 'cancelado')),
  assigned_to uuid references users(id),
  motivo text,
  metadata jsonb,
  resolved_at timestamptz,
  resolved_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table work_items is 'Fila operacional da equipe GSBC (STG-03) — cada linha aponta pra uma entidade real (cobranca/negociacao/collection_enrollment), nunca duplica o dado dela.';

-- No máximo 1 item ABERTO (aberto ou adiado — "adiado" ainda conta como
-- pendente, só não deve ser recriado) por combinação tipo+entidade —
-- ressincronizar não duplica; um item concluído/cancelado pode gerar um
-- novo depois, se a condição voltar a ser verdadeira.
create unique index work_items_open_unique
  on work_items (tipo, entity_type, entity_id)
  where status in ('aberto', 'adiado');

create index work_items_status_due_idx on work_items (status, due_at);
create index work_items_tenant_id_idx on work_items (tenant_id);

create trigger set_updated_at before update on work_items
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS — fila interna da equipe GSBC (regra 6: "a GSBC executa"). Não é
-- visível ao sindicato — diferente de cobranca_eventos/notificacoes, que
-- são sobre transparência do que já aconteceu; work_items é sobre o que
-- a GSBC ainda vai fazer, uma ferramenta de operação interna.
-- =========================================================================
alter table work_items enable row level security;

create policy work_items_select on work_items for select
  using (public.is_platform_staff(auth.uid()));

create policy work_items_insert on work_items for insert
  with check (public.is_platform_staff(auth.uid()));

create policy work_items_update on work_items for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

grant select, insert, update on public.work_items to authenticated;
