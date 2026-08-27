-- GSBC — Rodada 27: Policy Engine (STG-11)
--
-- Centraliza políticas de decisão/automação (docs/roadmap-stagings.md,
-- STG-11). Proibição explícita do roadmap: "não criar linguagem própria
-- complexa". Por isso a lógica de cada política vive em código comum
-- (PL/pgSQL nas funções já existentes, ou TypeScript em
-- src/lib/policies/ e src/lib/operations/sync.ts) — a tabela `policies`
-- é só o registro (nome, versão, descrição, ativa/inativa, parâmetros),
-- nunca um interpretador de regras.
--
-- Escopo confirmado com o usuário (dos 5 exemplos do roadmap): 2 viram
-- políticas de verdade, aplicadas — desconto exige aprovação (nunca
-- implementado até aqui, pendência explícita desde a Rodada 5/7 sob o
-- nome "regra 27") e acordo inadimplente cria item de trabalho (também
-- nunca implementado — `negociacao_parada` cobre estagnação ANTES do
-- acordo, não inadimplência DEPOIS dele). As outras 3 (pagamento pausa
-- cobrança, contestação suspende automação, régua avança por
-- agendamento) já são comportamento real e testado em rodadas
-- anteriores — aqui ganham registro formal + log de decisão auditável,
-- mas o toggle `ativa` delas é só documentação por enquanto: desligá-las
-- de verdade exigiria retocar register_pagamento/eligibility/engine
-- além do escopo seguro desta rodada (ver `enforcement` abaixo).

-- =========================================================================
-- policies — registro central. `enforcement`:
--   'aplicada'  = o toggle `ativa` realmente muda o comportamento.
--   'registrada' = comportamento já hardcoded em rodadas anteriores;
--                  aqui só ganha nome/versão/descrição e log de decisão.
-- =========================================================================
create table policies (
  id text primary key,
  nome text not null,
  descricao text not null,
  categoria text not null check (categoria in ('negociacao', 'cobranca', 'automacao')),
  enforcement text not null check (enforcement in ('aplicada', 'registrada')),
  versao integer not null default 1,
  ativa boolean not null default true,
  parametros jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table policies is 'Registro central de políticas de decisão/automação (STG-11) — a lógica de cada uma vive em código (SQL ou TypeScript), esta tabela só documenta e permite ativar/desativar as que suportam isso de verdade (enforcement=''aplicada'').';

create trigger set_updated_at before update on policies
  for each row execute function public.set_updated_at();

insert into policies (id, nome, descricao, categoria, enforcement, parametros) values
  (
    'desconto_requer_aprovacao',
    'Desconto exige aprovação',
    'Uma negociação aceita com valor abaixo do valor original da cobrança fica pendente de aprovação do Owner antes de virar acordo firmado — pendência explícita desde a Rodada 5/7 ("regra 27": não travar isso antes de existir uma arquitetura parametrizável). limite_percentual=0 significa que qualquer desconto, por menor que seja, exige aprovação.',
    'negociacao',
    'aplicada',
    '{"limite_percentual": 0}'::jsonb
  ),
  (
    'acordo_inadimplente_work_item',
    'Acordo inadimplente cria item de trabalho',
    'Um acordo firmado (negociação aceita) sem quitação total do valor da cobrança após dias_limite dias gera um item de trabalho na Central Operacional.',
    'negociacao',
    'aplicada',
    '{"dias_limite": 15}'::jsonb
  ),
  (
    'pagamento_pausa_regua',
    'Pagamento identificado pausa cobrança',
    'Quando o total pago cobre o valor da cobrança, o status muda para paga e a régua de cobrança automática para — já implementado em register_pagamento() (Rodada 8); aqui só registrado/logado, toggle ainda não aplicado de verdade.',
    'cobranca',
    'registrada',
    '{}'::jsonb
  ),
  (
    'contestacao_suspende_regua',
    'Contestação suspende automação',
    'Abrir uma contestação pausa a régua de cobrança automática enquanto estiver em aberto — já implementado via STATUS_PAUSAM_REGUA (Rodada 21); aqui só registrado/logado, toggle ainda não aplicado de verdade.',
    'automacao',
    'registrada',
    '{}'::jsonb
  ),
  (
    'regua_avanca_por_agendamento',
    'Régua avança por agendamento',
    'Cada step da régua de cobrança dispara no dia agendado desde a inscrição, se a cobrança continuar elegível — já implementado no motor da régua (Rodada 19); aqui só registrado/logado, toggle ainda não aplicado de verdade.',
    'automacao',
    'registrada',
    '{}'::jsonb
  );

-- =========================================================================
-- policy_decisoes — log imutável de decisão (spec literal do roadmap:
-- policy_id, version, inputs, result, reason, timestamp).
-- =========================================================================
create table policy_decisoes (
  id uuid primary key default gen_random_uuid(),
  policy_id text not null references policies(id),
  policy_versao integer not null,
  tenant_id uuid references tenants(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  inputs jsonb not null default '{}'::jsonb,
  resultado text not null,
  motivo text not null,
  created_at timestamptz not null default now()
);

comment on table policy_decisoes is 'Log imutável de toda decisão de política — inputs/resultado/motivo, pareado com a versão da política no momento (regra 33-style: nunca perder o histórico mesmo que a política mude depois).';

create index policy_decisoes_policy_id_idx on policy_decisoes (policy_id, created_at);
create index policy_decisoes_entity_idx on policy_decisoes (entity_type, entity_id);

-- =========================================================================
-- RLS — staff apenas (ferramenta de governança operacional, mesmo nível
-- de acesso de Central Operacional/STG-03 — não é transparência pro
-- sindicato como Auditoria).
-- =========================================================================
alter table policies enable row level security;
alter table policy_decisoes enable row level security;

create policy policies_select on policies for select
  using (public.is_platform_staff(auth.uid()));

create policy policy_decisoes_select on policy_decisoes for select
  using (public.is_platform_staff(auth.uid()));

-- Insert de policy_decisoes: staff pode (cobre o caminho de
-- register_pagamento, que continua security invoker) — as funções
-- security definer (abrir_contestacao, register_negociacao_evento,
-- decidir_aprovacao_desconto) já bypassam RLS de qualquer forma.
create policy policy_decisoes_insert on policy_decisoes for insert
  with check (public.is_platform_staff(auth.uid()));

grant select on public.policies to authenticated;
grant select, insert on public.policy_decisoes to authenticated;

-- Sem policy de update em policies: alternar ativa/inativa passa
-- exclusivamente por alternar_policy_ativa() (Owner apenas) — nenhuma
-- outra coluna (versao, descricao, parametros) é editável via app nesta
-- rodada.
create or replace function public.alternar_policy_ativa(
  p_policy_id text,
  p_ativa boolean,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao integer;
  v_ativa_atual boolean;
begin
  if not public.is_owner(auth.uid()) then
    raise exception 'Apenas o Owner pode ativar/desativar uma política.';
  end if;

  select versao, ativa into v_versao, v_ativa_atual from policies where id = p_policy_id;

  if v_versao is null then
    raise exception 'Política não encontrada.';
  end if;

  if v_ativa_atual = p_ativa then
    return;
  end if;

  update policies set ativa = p_ativa where id = p_policy_id;

  insert into policy_decisoes (policy_id, policy_versao, entity_type, entity_id, inputs, resultado, motivo)
  values (
    p_policy_id, v_versao, 'policy', gen_random_uuid(),
    jsonb_build_object('ativa_anterior', v_ativa_atual, 'ativa_nova', p_ativa),
    case when p_ativa then 'ativada' else 'desativada' end,
    p_motivo
  );
end;
$$;

comment on function public.alternar_policy_ativa is 'Único caminho pra ligar/desligar uma política — Owner apenas, sempre com motivo, sempre logado em policy_decisoes (uma política sobre a própria política).';

grant execute on function public.alternar_policy_ativa(text, boolean, text) to authenticated;

-- =========================================================================
-- Política 1: "Desconto exige aprovação" — retrofit de
-- register_negociacao_evento (Rodada 7). Convertida para SECURITY
-- DEFINER pelo mesmo motivo já documentado na Rodada 25
-- (Escalonamentos): a aprovação de desconto exige um papel MAIS
-- ESTREITO (Owner) do que a policy de RLS geral de negociacoes
-- (is_platform_staff, ou is_empresa_contato pro portal) — sem
-- SECURITY DEFINER, qualquer staff (ou o próprio contato do portal)
-- continuaria conseguindo forçar negociacoes.status='aceita' direto via
-- update na tabela, contornando a aprovação. Por isso as policies de
-- UPDATE em negociacoes e INSERT em negociacao_eventos (staff e portal)
-- são derrubadas logo abaixo — toda escrita passa a exigir esta função
-- ou decidir_aprovacao_desconto().
-- =========================================================================
alter table negociacoes drop constraint negociacoes_status_check;
alter table negociacoes add constraint negociacoes_status_check check (status in (
  'aberta', 'em_negociacao', 'aceita', 'aguardando_aprovacao', 'recusada', 'encerrada'
));

create or replace function public.register_negociacao_evento(
  p_negociacao_id uuid,
  p_tipo text,
  p_valor numeric default null,
  p_condicoes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_new_status text;
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_cobranca_id uuid;
  v_status_atual text;
  v_is_staff boolean;
  v_is_portal boolean;
  v_valor_principal numeric;
  v_policy_versao integer;
  v_policy_ativa boolean;
  v_limite_percentual numeric;
  v_percentual_desconto numeric;
  v_precisa_aprovacao boolean := false;
begin
  select tenant_id, empresa_id, cobranca_id, status
    into v_tenant_id, v_empresa_id, v_cobranca_id, v_status_atual
    from negociacoes where id = p_negociacao_id;

  if v_tenant_id is null then
    raise exception 'Negociação não encontrada.';
  end if;

  v_is_staff := public.is_platform_staff(auth.uid());
  v_is_portal := public.is_empresa_contato(v_empresa_id);

  if not (v_is_staff or v_is_portal) then
    raise exception 'Sem permissão para registrar movimento nesta negociação.';
  end if;

  if v_is_portal and not v_is_staff and p_tipo not in ('contraproposta_empresa', 'aceite') then
    raise exception 'Contato da empresa só pode registrar contraproposta ou aceite.';
  end if;

  if v_status_atual = 'aguardando_aprovacao' then
    raise exception 'Negociação aguardando aprovação de desconto — decida via aprovação antes de novos movimentos.';
  end if;

  v_new_status := case p_tipo
    when 'aceite' then 'aceita'
    when 'recusa' then 'recusada'
    when 'observacao' then null
    else 'em_negociacao'
  end;

  if p_tipo = 'aceite' and p_valor is not null then
    select valor_cobranca into v_valor_principal from cobrancas where id = v_cobranca_id;

    select ativa, versao, coalesce((parametros->>'limite_percentual')::numeric, 0)
      into v_policy_ativa, v_policy_versao, v_limite_percentual
      from policies where id = 'desconto_requer_aprovacao';

    if v_policy_ativa and v_valor_principal is not null and v_valor_principal > 0 and p_valor < v_valor_principal then
      v_percentual_desconto := round((1 - (p_valor / v_valor_principal)) * 100, 2);

      if v_percentual_desconto > v_limite_percentual then
        v_precisa_aprovacao := true;
        v_new_status := 'aguardando_aprovacao';
      end if;

      insert into policy_decisoes (policy_id, policy_versao, tenant_id, entity_type, entity_id, inputs, resultado, motivo)
      values (
        'desconto_requer_aprovacao', v_policy_versao, v_tenant_id, 'negociacao', p_negociacao_id,
        jsonb_build_object(
          'valor_principal', v_valor_principal, 'valor_proposto', p_valor,
          'percentual_desconto', v_percentual_desconto, 'limite_percentual', v_limite_percentual
        ),
        case when v_precisa_aprovacao then 'aprovacao_necessaria' else 'sem_acao' end,
        case when v_precisa_aprovacao
          then format('Desconto de %s%% acima do limite de %s%% — aguardando aprovação do Owner.', v_percentual_desconto, v_limite_percentual)
          else format('Desconto de %s%% dentro do limite de %s%% — sem aprovação extra necessária.', v_percentual_desconto, v_limite_percentual)
        end
      );
    end if;
  end if;

  insert into negociacao_eventos (negociacao_id, tipo, valor, condicoes, user_id)
  values (p_negociacao_id, p_tipo, p_valor, p_condicoes, auth.uid())
  returning id into v_event_id;

  update negociacoes
  set
    valor_atual = coalesce(p_valor, valor_atual),
    status = coalesce(v_new_status, status),
    updated_at = now()
  where id = p_negociacao_id;

  -- Cascata pra cobrança só quando de fato virou 'aceita' (não quando
  -- ficou 'aguardando_aprovacao') e só quando quem chamou é staff —
  -- aceite via portal nunca muda status de cobrança sozinho (mesmo
  -- princípio já documentado na Rodada 22: estado consequente da
  -- cobrança fica sempre com humano da GSBC).
  if v_new_status = 'aceita' and v_is_staff then
    perform public.change_cobranca_status(v_cobranca_id, 'agreement_reached', 'Acordo firmado na negociação.');
  end if;

  return v_event_id;
end;
$$;

-- =========================================================================
-- decidir_aprovacao_desconto — Owner decide um desconto que estourou o
-- limite. Aprovado: negociação vira 'aceita' e a cobrança cascata pra
-- 'agreement_reached' (mesmo caminho que aconteceria sem a política).
-- Rejeitado: volta pra 'em_negociacao' — renegociar, não um beco sem
-- saída.
-- =========================================================================
create or replace function public.decidir_aprovacao_desconto(
  p_negociacao_id uuid,
  p_aprovado boolean,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_cobranca_id uuid;
  v_tenant_id uuid;
  v_policy_versao integer;
begin
  if not public.is_owner(auth.uid()) then
    raise exception 'Apenas o Owner pode aprovar ou rejeitar um desconto.';
  end if;

  select status, cobranca_id, tenant_id into v_status, v_cobranca_id, v_tenant_id
  from negociacoes where id = p_negociacao_id;

  if v_status is null then
    raise exception 'Negociação não encontrada.';
  end if;

  if v_status <> 'aguardando_aprovacao' then
    raise exception 'Só é possível decidir a partir de "aguardando aprovação".';
  end if;

  update negociacoes
  set status = case when p_aprovado then 'aceita' else 'em_negociacao' end, updated_at = now()
  where id = p_negociacao_id;

  insert into negociacao_eventos (negociacao_id, tipo, condicoes, user_id)
  values (
    p_negociacao_id, 'observacao',
    case when p_aprovado then 'Desconto aprovado pelo Owner: ' || p_motivo else 'Desconto rejeitado pelo Owner: ' || p_motivo end,
    auth.uid()
  );

  select versao into v_policy_versao from policies where id = 'desconto_requer_aprovacao';

  insert into policy_decisoes (policy_id, policy_versao, tenant_id, entity_type, entity_id, inputs, resultado, motivo)
  values (
    'desconto_requer_aprovacao', v_policy_versao, v_tenant_id, 'negociacao', p_negociacao_id,
    jsonb_build_object('aprovado', p_aprovado),
    case when p_aprovado then 'aprovado' else 'rejeitado' end,
    p_motivo
  );

  if p_aprovado then
    perform public.change_cobranca_status(v_cobranca_id, 'agreement_reached', 'Acordo com desconto aprovado pelo Owner.');
  end if;
end;
$$;

grant execute on function public.register_negociacao_evento(uuid, text, numeric, text) to authenticated;
grant execute on function public.decidir_aprovacao_desconto(uuid, boolean, text) to authenticated;

-- Derruba as policies que só existiam pra viabilizar o UPDATE/INSERT
-- direto de uma função SECURITY INVOKER (ver nota acima) — agora que
-- register_negociacao_evento/decidir_aprovacao_desconto são SECURITY
-- DEFINER, elas bypassam RLS internamente; manter essas policies vivas
-- seria só uma porta de bypass da aprovação de desconto.
drop policy if exists negociacoes_update on negociacoes;
drop policy if exists negociacoes_update_portal on negociacoes;
drop policy if exists negociacao_eventos_insert on negociacao_eventos;
drop policy if exists negociacao_eventos_insert_portal on negociacao_eventos;

-- negociacoes_write (insert, staff) continua — criar o cabeçalho vazio
-- (status 'aberta', sem valor) não carrega risco de desconto.

-- =========================================================================
-- Política 2: "Acordo inadimplente cria item de trabalho" — nova, sem
-- retrofit de função existente (negociacao_parada, Rodada 19, cobre
-- estagnação ANTES do acordo — semânticas diferentes, não reaproveitar).
-- work_items.tipo ganha o valor novo; a detecção em si vive em
-- src/lib/operations/sync.ts (mesmo padrão das outras varreduras
-- "state-derived" já existentes).
-- =========================================================================
alter table work_items drop constraint work_items_tipo_check;
alter table work_items add constraint work_items_tipo_check check (tipo in (
  'tarefa_regua_cobranca', 'falha_automacao', 'escalonamento',
  'pagamento_vencido', 'negociacao_parada', 'contestacao_pendente',
  'acordo_inadimplente'
));

-- =========================================================================
-- Políticas 3-5 (registradas, não aplicadas nesta rodada): apenas
-- adiciona o log de decisão nos pontos onde o comportamento já
-- acontece — nenhuma mudança de comportamento.
-- =========================================================================

-- register_pagamento (Rodada 8) — loga 'pagamento_pausa_regua' toda vez
-- que o pagamento de fato muda o status da cobrança.
create or replace function public.register_pagamento(
  p_cobranca_id uuid,
  p_valor numeric,
  p_data_pagamento date,
  p_forma_pagamento text,
  p_observacao text default null
) returns uuid language plpgsql security invoker as $$
declare
  v_pagamento_id uuid;
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_valor_cobranca numeric;
  v_status_atual text;
  v_total_pago numeric;
  v_novo_status text;
  v_policy_versao integer;
begin
  select tenant_id, empresa_id, valor_cobranca, status
    into v_tenant_id, v_empresa_id, v_valor_cobranca, v_status_atual
    from cobrancas where id = p_cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  insert into pagamentos (tenant_id, empresa_id, cobranca_id, valor, data_pagamento, forma_pagamento, observacao, registrado_por)
  values (v_tenant_id, v_empresa_id, p_cobranca_id, p_valor, p_data_pagamento, p_forma_pagamento, p_observacao, auth.uid())
  returning id into v_pagamento_id;

  select coalesce(sum(valor), 0) into v_total_pago from pagamentos where cobranca_id = p_cobranca_id;

  v_novo_status := case
    when v_total_pago >= v_valor_cobranca then 'paid'
    else 'partially_paid'
  end;

  if v_novo_status <> v_status_atual then
    perform public.change_cobranca_status(
      p_cobranca_id,
      v_novo_status,
      'Pagamento de ' || to_char(p_valor, 'FM999999990.00') || ' registrado.'
    );

    select versao into v_policy_versao from policies where id = 'pagamento_pausa_regua';
    if v_policy_versao is not null then
      insert into policy_decisoes (policy_id, policy_versao, tenant_id, entity_type, entity_id, inputs, resultado, motivo)
      values (
        'pagamento_pausa_regua', v_policy_versao, v_tenant_id, 'cobranca', p_cobranca_id,
        jsonb_build_object('valor_pago', p_valor, 'total_pago', v_total_pago, 'valor_cobranca', v_valor_cobranca, 'novo_status', v_novo_status),
        v_novo_status,
        case when v_novo_status = 'paid'
          then 'Total pago cobre o valor da cobrança — régua de cobrança encerrada.'
          else 'Pagamento parcial registrado — cobrança segue elegível pro saldo restante.'
        end
      );
    end if;
  end if;

  return v_pagamento_id;
end;
$$;

-- abrir_contestacao (Rodada 21/22) — loga 'contestacao_suspende_regua'
-- no momento em que a cobrança é pausada pela abertura da contestação.
-- Corpo idêntico ao já vigente (0023_portal_empresarial.sql), só com o
-- insert de policy_decisoes adicionado no fim.
create or replace function public.abrir_contestacao(
  p_cobranca_id uuid,
  p_tipo text,
  p_motivo text,
  p_valor_alegado numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_contestacao_id uuid;
  v_existente uuid;
  v_policy_versao integer;
begin
  select tenant_id, empresa_id into v_tenant_id, v_empresa_id
  from cobrancas where id = p_cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  if not (public.is_platform_staff(auth.uid()) or public.is_empresa_contato(v_empresa_id)) then
    raise exception 'Sem permissão para abrir contestação para esta cobrança.';
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

  select versao into v_policy_versao from policies where id = 'contestacao_suspende_regua';
  if v_policy_versao is not null then
    insert into policy_decisoes (policy_id, policy_versao, tenant_id, entity_type, entity_id, inputs, resultado, motivo)
    values (
      'contestacao_suspende_regua', v_policy_versao, v_tenant_id, 'cobranca', p_cobranca_id,
      jsonb_build_object('contestacao_id', v_contestacao_id, 'tipo', p_tipo),
      'pausada',
      'Contestação aberta — régua de cobrança automática suspensa enquanto estiver em aberto.'
    );
  end if;

  return v_contestacao_id;
end;
$$;
