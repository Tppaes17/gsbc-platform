-- GSBC — Rodada 21: Contestações (STG-04 — Dispute Management)
--
-- Trata contestação como entidade própria, não um campo de status na
-- cobrança (docs/roadmap-stagings.md, STG-04). Mesmo padrão cabeçalho +
-- eventos já validado em cobrancas (Rodada 5) e negociacoes (Rodada 7):
-- uma linha de estado atual + uma tabela de eventos imutável.
--
-- Reaproveitamento deliberado em vez de infraestrutura paralela:
--   - Evidências do tipo "documento" usam a tabela `documentos` (Rodada 10)
--     já existente — só ganha a categoria 'contestacao'.
--   - "Gerar evento: charge.adjusted_due_to_dispute" (regra do roadmap) é
--     satisfeito reaproveitando `change_cobranca_status()` (Rodada 5, já
--     grava em cobranca_eventos) — sem duplicar log de eventos.

-- =========================================================================
-- cobrancas: novo status 'contestada' — pausa a régua de cobrança (ver
-- STATUS_PAUSAM_REGUA em src/lib/collection/eligibility.ts).
-- =========================================================================
alter table cobrancas
  drop constraint cobrancas_status_check;

alter table cobrancas
  add constraint cobrancas_status_check check (status in (
    'draft', 'pending_validation', 'approved', 'notified', 'contacted',
    'negotiating', 'agreement_reached', 'partially_paid', 'paid',
    'overdue', 'suspended', 'cancelled', 'legal_escalation', 'closed',
    'contestada'
  ));

-- =========================================================================
-- documentos: nova categoria 'contestacao' — evidência do tipo documento
-- anexada a uma contestação usa o mesmo bucket/tabela de sempre.
-- =========================================================================
alter table documentos
  drop constraint documentos_categoria_check;

alter table documentos
  add constraint documentos_categoria_check check (categoria in (
    'instrumento', 'notificacao', 'acordo', 'comprovante', 'contestacao', 'outro'
  ));

-- =========================================================================
-- work_items: novo tipo 'contestacao_pendente' — destrava o bloco
-- "Contestações pendentes" da Central Operacional (Rodada 20, pendência
-- registrada por falta desta entidade).
-- =========================================================================
alter table work_items
  drop constraint work_items_tipo_check;

alter table work_items
  add constraint work_items_tipo_check check (tipo in (
    'tarefa_regua_cobranca', 'falha_automacao', 'escalonamento',
    'pagamento_vencido', 'negociacao_parada', 'contestacao_pendente'
  ));

-- =========================================================================
-- contestacoes (cabeçalho)
-- =========================================================================
create table contestacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cobranca_id uuid not null references cobrancas(id) on delete cascade,
  tipo text not null check (tipo in (
    'enquadramento', 'aplicabilidade', 'pagamento_ja_realizado',
    'base_calculo', 'quantidade_empregados', 'valor', 'periodo',
    'dados_cadastrais', 'outros'
  )),
  status text not null default 'aberta' check (status in (
    'aberta', 'em_analise', 'procedente', 'parcialmente_procedente',
    'improcedente', 'inconclusiva'
  )),
  motivo text not null,
  valor_alegado numeric(14, 2),
  aberta_por uuid references users(id) on delete set null,
  aberta_em timestamptz not null default now(),
  resolvida_em timestamptz,
  resolvida_por uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table contestacoes is
  'Contestação de uma cobrança (STG-04). Status não é histórico — toda '
  'mudança gera um contestacao_eventos, mesmo padrão de cobrancas/negociacoes.';
comment on column contestacoes.motivo is 'Descrição da contestação no momento da abertura — imutável (não é a mesma coisa que uma evidência adicionada depois).';

-- Só uma contestação em aberto por cobrança por vez — mesma lógica do
-- índice único parcial de collection_enrollments (Rodada 19).
create unique index contestacoes_cobranca_aberta_idx on contestacoes (cobranca_id)
  where status in ('aberta', 'em_analise');

create index contestacoes_tenant_id_idx on contestacoes (tenant_id);
create index contestacoes_cobranca_id_idx on contestacoes (cobranca_id);

create trigger set_updated_at before update on contestacoes
  for each row execute function public.set_updated_at();

-- Integridade: tenant_id/empresa_id da contestação têm que bater com os
-- da cobrança de origem — mesma defesa em profundidade de sempre.
create or replace function public.enforce_contestacao_matches_cobranca()
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
    raise exception 'tenant_id/empresa_id da contestação devem bater com os da cobrança de origem.';
  end if;

  return new;
end;
$$;

create trigger contestacoes_enforce_match
  before insert or update on contestacoes
  for each row execute function public.enforce_contestacao_matches_cobranca();

-- =========================================================================
-- contestacao_evidencias — documento, comentário, valor alegado,
-- fundamento, usuário, data (spec literal do roadmap).
-- =========================================================================
create table contestacao_evidencias (
  id uuid primary key default gen_random_uuid(),
  contestacao_id uuid not null references contestacoes(id) on delete cascade,
  tipo text not null check (tipo in ('documento', 'comentario')),
  -- on delete cascade (não set null): contestacao_evidencias_conteudo_check
  -- exige documento_id preenchido quando tipo='documento' — set null
  -- deixaria a linha violando a própria constraint no exato momento em que
  -- o documento fosse removido.
  documento_id uuid references documentos(id) on delete cascade,
  comentario text,
  valor_alegado numeric(14, 2),
  fundamento text,
  user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contestacao_evidencias_conteudo_check check (
    (tipo = 'documento' and documento_id is not null)
    or (tipo = 'comentario' and comentario is not null)
  )
);

comment on table contestacao_evidencias is 'Evidências anexadas a uma contestação — documento reaproveita a tabela documentos (Rodada 10), comentário é texto livre.';

create index contestacao_evidencias_contestacao_id_idx on contestacao_evidencias (contestacao_id, created_at);

-- =========================================================================
-- contestacao_eventos — histórico imutável de status (abertura, análise,
-- resultado, observação), mesmo padrão de negociacao_eventos.
-- =========================================================================
create table contestacao_eventos (
  id uuid primary key default gen_random_uuid(),
  contestacao_id uuid not null references contestacoes(id) on delete cascade,
  tipo text not null check (tipo in (
    'abertura', 'em_analise', 'procedente', 'parcialmente_procedente',
    'improcedente', 'inconclusiva', 'observacao'
  )),
  descricao text,
  valor numeric(14, 2),
  user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table contestacao_eventos is 'Histórico imutável de mudanças de status da contestação — sem policy de update/delete, mesmo padrão de negociacao_eventos/cobranca_eventos.';

create index contestacao_eventos_contestacao_id_idx on contestacao_eventos (contestacao_id, created_at);

-- =========================================================================
-- abrir_contestacao: único caminho para abrir uma contestação — cria o
-- cabeçalho, registra o evento de abertura e transiciona a cobrança para
-- 'contestada' (via change_cobranca_status, que já grava cobranca_eventos)
-- na mesma transação. Nunca modifica a cobrança silenciosamente (regra
-- crítica do roadmap).
-- =========================================================================
create or replace function public.abrir_contestacao(
  p_cobranca_id uuid,
  p_tipo text,
  p_motivo text,
  p_valor_alegado numeric default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_contestacao_id uuid;
  v_existente uuid;
begin
  select tenant_id, empresa_id into v_tenant_id, v_empresa_id
  from cobrancas where id = p_cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  select id into v_existente from contestacoes
  where cobranca_id = p_cobranca_id and status in ('aberta', 'em_analise');

  if v_existente is not null then
    raise exception 'Já existe uma contestação em aberto para esta cobrança.';
  end if;

  insert into contestacoes (tenant_id, empresa_id, cobranca_id, tipo, motivo, valor_alegado, aberta_por)
  values (v_tenant_id, v_empresa_id, p_cobranca_id, p_tipo, p_motivo, p_valor_alegado, auth.uid())
  returning id into v_contestacao_id;

  insert into contestacao_eventos (contestacao_id, tipo, descricao, valor, user_id)
  values (v_contestacao_id, 'abertura', p_motivo, p_valor_alegado, auth.uid());

  perform public.change_cobranca_status(
    p_cobranca_id,
    'contestada',
    'Contestação aberta: ' || p_tipo
  );

  return v_contestacao_id;
end;
$$;

-- =========================================================================
-- register_contestacao_evento: propostas subsequentes (mudança para
-- análise, resultado, observação) — mesmo formato de
-- register_negociacao_evento (Rodada 7). Resultado NUNCA muda o status da
-- cobrança automaticamente — "procedente" não implica uma única transição
-- correta (cancelar? reduzir e retomar?); fica com o humano via "Mudar
-- status" já existente.
-- =========================================================================
create or replace function public.register_contestacao_evento(
  p_contestacao_id uuid,
  p_tipo text,
  p_descricao text default null,
  p_valor numeric default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_event_id uuid;
  v_new_status text;
begin
  v_new_status := case p_tipo
    when 'em_analise' then 'em_analise'
    when 'procedente' then 'procedente'
    when 'parcialmente_procedente' then 'parcialmente_procedente'
    when 'improcedente' then 'improcedente'
    when 'inconclusiva' then 'inconclusiva'
    else null
  end;

  insert into contestacao_eventos (contestacao_id, tipo, descricao, valor, user_id)
  values (p_contestacao_id, p_tipo, p_descricao, p_valor, auth.uid())
  returning id into v_event_id;

  update contestacoes
  set
    status = coalesce(v_new_status, status),
    resolvida_em = case
      when v_new_status in ('procedente', 'parcialmente_procedente', 'improcedente', 'inconclusiva')
      then now() else resolvida_em
    end,
    resolvida_por = case
      when v_new_status in ('procedente', 'parcialmente_procedente', 'improcedente', 'inconclusiva')
      then auth.uid() else resolvida_por
    end,
    updated_at = now()
  where id = p_contestacao_id;

  return v_event_id;
end;
$$;

grant execute on function public.abrir_contestacao(uuid, text, text, numeric) to authenticated;
grant execute on function public.register_contestacao_evento(uuid, text, text, numeric) to authenticated;

-- =========================================================================
-- RLS — mesmo padrão de negociacoes: leitura staff GSBC + membros do
-- tenant (transparência, regra 6); escrita exclusiva de staff GSBC.
-- =========================================================================
alter table contestacoes enable row level security;
alter table contestacao_evidencias enable row level security;
alter table contestacao_eventos enable row level security;

create policy contestacoes_select on contestacoes for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy contestacoes_insert on contestacoes for insert
  with check (public.is_platform_staff(auth.uid()));

create policy contestacoes_update on contestacoes for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy contestacao_evidencias_select on contestacao_evidencias for select
  using (
    exists (
      select 1 from contestacoes c
      where c.id = contestacao_evidencias.contestacao_id
        and (public.is_platform_staff(auth.uid()) or c.tenant_id in (select public.user_tenant_ids(auth.uid())))
    )
  );

create policy contestacao_evidencias_insert on contestacao_evidencias for insert
  with check (public.is_platform_staff(auth.uid()));

create policy contestacao_eventos_select on contestacao_eventos for select
  using (
    exists (
      select 1 from contestacoes c
      where c.id = contestacao_eventos.contestacao_id
        and (public.is_platform_staff(auth.uid()) or c.tenant_id in (select public.user_tenant_ids(auth.uid())))
    )
  );

create policy contestacao_eventos_insert on contestacao_eventos for insert
  with check (public.is_platform_staff(auth.uid()));

-- Sem policy de update/delete em contestacao_eventos: histórico imutável.

grant select, insert, update on public.contestacoes to authenticated;
grant select, insert on public.contestacao_evidencias to authenticated;
grant select, insert on public.contestacao_eventos to authenticated;
