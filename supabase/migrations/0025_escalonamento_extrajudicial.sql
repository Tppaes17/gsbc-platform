-- GSBC — Rodada 25: Escalonamento e Notificação Extrajudicial (STG-09)
--
-- Trata escalonamento como entidade própria (cabeçalho + eventos), mesmo
-- padrão de cobrancas/negociacoes/contestacoes — nunca um campo solto na
-- cobrança. Fluxo literal do roadmap: Cobrança → Critérios → Revisão →
-- Aprovação → Documento → Envio → Evidência → Resultado.
--
-- Entrada: a régua de cobrança (STG-03, Rodada 19) já para em
-- collection_enrollments.status='escalated' e cria um work_item
-- tipo='escalonamento' apontando pra cobrança quando os steps automáticos
-- se esgotam — esta rodada consome esse ponto de entrada, não inventa um
-- novo. 'legal_escalation' já existe como status de cobrança desde a
-- Rodada 5 (0008_cobrancas.sql), sempre não utilizado até agora.
--
-- Decisão arquitetural central: diferente de contestacoes (onde qualquer
-- staff pode escrever, sem papel mais restrito que isso), a etapa de
-- Aprovação aqui exige um papel MAIS ESTREITO que "staff qualquer"
-- (Jurídico/Super Admin) — uma policy de UPDATE genérica pra
-- is_platform_staff() permitiria que qualquer analista se autoaprovasse
-- direto na tabela, contornando a checagem de papel se ela vivesse só no
-- app. Por isso nenhuma das 4 tabelas abaixo recebe grant de
-- insert/update/delete pra `authenticated` — toda escrita passa
-- exclusivamente pelas funções SECURITY DEFINER abaixo, cada uma com sua
-- própria checagem de autorização no corpo (mesmo racional já usado em
-- log_audit_event/audit_logs, e em abrir_contestacao security definer da
-- Rodada 22 pro caso do portal). auth.uid() dentro de uma security
-- definer continua refletindo quem chamou de verdade (lê do JWT da
-- requisição, não do role Postgres efetivo) — já verificado ao vivo na
-- Rodada 22.

-- =========================================================================
-- is_escalation_approver: papel Jurídico (ou Super Admin) — mais estreito
-- que is_platform_staff. Decisão confirmada com o usuário antes de
-- implementar (papel Jurídico já existia no seed, nunca checado em
-- código nenhum até aqui).
-- =========================================================================
create or replace function public.is_escalation_approver(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    join tenants t on t.id = m.tenant_id
    join roles r on r.id = m.role_id
    where m.user_id = p_user_id
      and m.status = 'active'
      and t.type = 'platform'
      and r.code in ('gsbc_juridico', 'gsbc_super_admin')
  );
$$;

comment on function public.is_escalation_approver is 'True se o usuário pode aprovar/rejeitar o envio de uma notificação extrajudicial (STG-09) — papel Jurídico ou Super Admin, mais restrito que is_platform_staff.';

grant execute on function public.is_escalation_approver(uuid) to authenticated;

-- =========================================================================
-- escalonamentos (cabeçalho)
-- =========================================================================
create table escalonamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cobranca_id uuid not null references cobrancas(id) on delete cascade,
  status text not null default 'em_revisao' check (status in (
    'em_revisao', 'aguardando_aprovacao', 'rejeitada', 'aprovada',
    'documento_emitido', 'enviada', 'concluida'
  )),
  motivo text not null,
  iniciado_por uuid references users(id) on delete set null,
  iniciado_em timestamptz not null default now(),
  aprovado_por uuid references users(id) on delete set null,
  aprovado_em timestamptz,
  motivo_decisao text,
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table escalonamentos is 'Escalonamento pra notificação extrajudicial (STG-09). Status não é histórico — toda mudança gera um escalonamento_eventos, mesmo padrão de contestacoes/negociacoes/cobrancas.';
comment on column escalonamentos.motivo is 'Justificativa no momento da abertura (Critérios de escalonamento) — imutável.';
comment on column escalonamentos.motivo_decisao is 'Justificativa da aprovação ou rejeição pelo Jurídico.';

-- Só um escalonamento em andamento por cobrança por vez — mesma lógica de
-- contestacoes_cobranca_aberta_idx (Rodada 21).
create unique index escalonamentos_cobranca_ativo_idx on escalonamentos (cobranca_id)
  where status not in ('rejeitada', 'concluida');

create index escalonamentos_tenant_id_idx on escalonamentos (tenant_id);
create index escalonamentos_cobranca_id_idx on escalonamentos (cobranca_id);

create trigger set_updated_at before update on escalonamentos
  for each row execute function public.set_updated_at();

-- Integridade: tenant_id/empresa_id do escalonamento têm que bater com os
-- da cobrança de origem — mesma defesa em profundidade de sempre.
create or replace function public.enforce_escalonamento_matches_cobranca()
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
    raise exception 'tenant_id/empresa_id do escalonamento devem bater com os da cobrança de origem.';
  end if;

  return new;
end;
$$;

create trigger escalonamentos_enforce_match
  before insert or update on escalonamentos
  for each row execute function public.enforce_escalonamento_matches_cobranca();

-- =========================================================================
-- escalonamento_eventos — histórico imutável, mesmo padrão de
-- contestacao_eventos/negociacao_eventos/cobranca_eventos.
-- =========================================================================
create table escalonamento_eventos (
  id uuid primary key default gen_random_uuid(),
  escalonamento_id uuid not null references escalonamentos(id) on delete cascade,
  tipo text not null check (tipo in (
    'criacao', 'submissao_aprovacao', 'aprovacao', 'rejeicao',
    'documento_emitido', 'envio', 'resultado', 'observacao'
  )),
  descricao text,
  user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table escalonamento_eventos is 'Histórico imutável de mudanças do escalonamento — sem policy de update/delete.';

create index escalonamento_eventos_escalonamento_id_idx on escalonamento_eventos (escalonamento_id, created_at);

-- =========================================================================
-- escalonamento_documentos — "Documento: template versionado. Registrar:
-- versão, dados, emissor, aprovação, timestamp" (spec literal do
-- roadmap). O PDF em si vive em storage.objects/documentos-empresas via a
-- linha `documentos` referenciada (categoria='notificacao', já existente
-- desde a Rodada 10) — reaproveitamento deliberado da mesma infra de
-- storage/RLS já usada por evidências de contestação, sem bucket novo.
-- =========================================================================
create table escalonamento_documentos (
  id uuid primary key default gen_random_uuid(),
  escalonamento_id uuid not null references escalonamentos(id) on delete cascade,
  documento_id uuid not null references documentos(id) on delete restrict,
  template_versao integer not null,
  dados_geracao jsonb not null,
  emitido_por uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table escalonamento_documentos is 'Instância versionada do documento de notificação extrajudicial emitido. dados_geracao é o snapshot das variáveis usadas (razão social, CNPJ, valor, vencimento...) no momento da emissão — reprodutível mesmo que o cadastro da empresa mude depois (regra 5: nunca inventar/perder dado histórico). on delete restrict em documento_id: um documento já emitido nunca pode ser apagado silenciosamente (regra 4).';

create index escalonamento_documentos_escalonamento_id_idx on escalonamento_documentos (escalonamento_id, created_at);

-- =========================================================================
-- escalonamento_envios — "Evidência: canal, destinatário, timestamp,
-- delivery, erro" (spec literal do roadmap). E-mail é enviado pelo
-- próprio sistema (delivery_status resolvido na hora, reaproveitando
-- sendEmail já existente); canal físico (correio com AR, cartório) é
-- sempre evidência manual — comprovante anexado via `documentos`
-- (categoria='comprovante', já existente).
-- =========================================================================
create table escalonamento_envios (
  id uuid primary key default gen_random_uuid(),
  escalonamento_id uuid not null references escalonamentos(id) on delete cascade,
  canal text not null check (canal in ('email', 'correio_ar', 'cartorio', 'outro')),
  destinatario text not null,
  delivery_status text not null default 'pendente' check (delivery_status in (
    'pendente', 'entregue', 'falha', 'desconhecido'
  )),
  erro text,
  comprovante_documento_id uuid references documentos(id) on delete restrict,
  registrado_por uuid references users(id) on delete set null,
  enviado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table escalonamento_envios is 'Evidência de envio da notificação extrajudicial. Um escalonamento pode ter mais de um envio (ex.: e-mail falhou, staff registra reenvio por cartório) — todos ficam, nenhum sobrescreve o anterior.';

create index escalonamento_envios_escalonamento_id_idx on escalonamento_envios (escalonamento_id, created_at);

-- =========================================================================
-- RLS — leitura staff GSBC + membros do tenant (transparência, regra 6);
-- ZERO grant de insert/update/delete pra `authenticated` em qualquer das
-- 4 tabelas — toda escrita é exclusiva das funções SECURITY DEFINER
-- abaixo (ver nota arquitetural no topo do arquivo).
-- =========================================================================
alter table escalonamentos enable row level security;
alter table escalonamento_eventos enable row level security;
alter table escalonamento_documentos enable row level security;
alter table escalonamento_envios enable row level security;

create policy escalonamentos_select on escalonamentos for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy escalonamento_eventos_select on escalonamento_eventos for select
  using (
    exists (
      select 1 from escalonamentos e
      where e.id = escalonamento_eventos.escalonamento_id
        and (public.is_platform_staff(auth.uid()) or e.tenant_id in (select public.user_tenant_ids(auth.uid())))
    )
  );

create policy escalonamento_documentos_select on escalonamento_documentos for select
  using (
    exists (
      select 1 from escalonamentos e
      where e.id = escalonamento_documentos.escalonamento_id
        and (public.is_platform_staff(auth.uid()) or e.tenant_id in (select public.user_tenant_ids(auth.uid())))
    )
  );

create policy escalonamento_envios_select on escalonamento_envios for select
  using (
    exists (
      select 1 from escalonamentos e
      where e.id = escalonamento_envios.escalonamento_id
        and (public.is_platform_staff(auth.uid()) or e.tenant_id in (select public.user_tenant_ids(auth.uid())))
    )
  );

grant select on public.escalonamentos to authenticated;
grant select on public.escalonamento_eventos to authenticated;
grant select on public.escalonamento_documentos to authenticated;
grant select on public.escalonamento_envios to authenticated;

-- =========================================================================
-- iniciar_escalonamento — único caminho para abrir um escalonamento
-- (Critérios + Revisão). Bloqueia cobrança já paga/cancelada/encerrada/
-- contestada/já escalonada — "Critérios de escalonamento" vira um gate de
-- verdade, não só convenção de UI.
-- =========================================================================
create or replace function public.iniciar_escalonamento(
  p_cobranca_id uuid,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_cobranca_status text;
  v_escalonamento_id uuid;
  v_existente uuid;
begin
  if not public.is_platform_staff(auth.uid()) then
    raise exception 'Apenas a equipe GSBC pode iniciar um escalonamento.';
  end if;

  select tenant_id, empresa_id, status into v_tenant_id, v_empresa_id, v_cobranca_status
  from cobrancas where id = p_cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  if v_cobranca_status in ('paid', 'cancelled', 'closed', 'legal_escalation', 'contestada') then
    raise exception 'Cobrança em status "%" não é elegível para escalonamento.', v_cobranca_status;
  end if;

  select id into v_existente from escalonamentos
  where cobranca_id = p_cobranca_id and status not in ('rejeitada', 'concluida');

  if v_existente is not null then
    raise exception 'Já existe um escalonamento em andamento para esta cobrança.';
  end if;

  insert into escalonamentos (tenant_id, empresa_id, cobranca_id, motivo, iniciado_por)
  values (v_tenant_id, v_empresa_id, p_cobranca_id, p_motivo, auth.uid())
  returning id into v_escalonamento_id;

  insert into escalonamento_eventos (escalonamento_id, tipo, descricao, user_id)
  values (v_escalonamento_id, 'criacao', p_motivo, auth.uid());

  return v_escalonamento_id;
end;
$$;

grant execute on function public.iniciar_escalonamento(uuid, text) to authenticated;

-- =========================================================================
-- submeter_para_aprovacao — fecha a Revisão, abre a Aprovação.
-- =========================================================================
create or replace function public.submeter_para_aprovacao(
  p_escalonamento_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_platform_staff(auth.uid()) then
    raise exception 'Apenas a equipe GSBC pode submeter um escalonamento para aprovação.';
  end if;

  select status into v_status from escalonamentos where id = p_escalonamento_id;

  if v_status is null then
    raise exception 'Escalonamento não encontrado.';
  end if;

  if v_status <> 'em_revisao' then
    raise exception 'Só é possível submeter para aprovação a partir de "em revisão".';
  end if;

  update escalonamentos set status = 'aguardando_aprovacao' where id = p_escalonamento_id;

  insert into escalonamento_eventos (escalonamento_id, tipo, user_id)
  values (p_escalonamento_id, 'submissao_aprovacao', auth.uid());
end;
$$;

grant execute on function public.submeter_para_aprovacao(uuid) to authenticated;

-- =========================================================================
-- decidir_aprovacao — o gate mais sensível do fluxo. Checa
-- is_escalation_approver (Jurídico/Super Admin), não is_platform_staff —
-- por isso security definer é obrigatório aqui (ver nota no topo do
-- arquivo): sem uma policy de update ampla na tabela, a única forma de
-- mudar o status pra 'aprovada'/'rejeitada' é passar por esta checagem.
-- =========================================================================
create or replace function public.decidir_aprovacao(
  p_escalonamento_id uuid,
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
begin
  if not public.is_escalation_approver(auth.uid()) then
    raise exception 'Apenas o papel Jurídico pode aprovar ou rejeitar um escalonamento.';
  end if;

  select status into v_status from escalonamentos where id = p_escalonamento_id;

  if v_status is null then
    raise exception 'Escalonamento não encontrado.';
  end if;

  if v_status <> 'aguardando_aprovacao' then
    raise exception 'Só é possível decidir a aprovação a partir de "aguardando aprovação".';
  end if;

  update escalonamentos set
    status = case when p_aprovado then 'aprovada' else 'rejeitada' end,
    aprovado_por = case when p_aprovado then auth.uid() else aprovado_por end,
    aprovado_em = case when p_aprovado then now() else aprovado_em end,
    motivo_decisao = p_motivo
  where id = p_escalonamento_id;

  insert into escalonamento_eventos (escalonamento_id, tipo, descricao, user_id)
  values (
    p_escalonamento_id,
    case when p_aprovado then 'aprovacao' else 'rejeicao' end,
    p_motivo,
    auth.uid()
  );
end;
$$;

grant execute on function public.decidir_aprovacao(uuid, boolean, text) to authenticated;

-- =========================================================================
-- registrar_documento_emitido — Documento. p_documento_id referencia uma
-- linha `documentos` já inserida pelo app (upload do PDF gerado no bucket
-- documentos-empresas, categoria='notificacao') — esta função só linka +
-- transiciona o estado, não faz upload (sem acesso a Storage aqui).
-- =========================================================================
create or replace function public.registrar_documento_emitido(
  p_escalonamento_id uuid,
  p_documento_id uuid,
  p_template_versao integer,
  p_dados_geracao jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_id uuid;
begin
  if not public.is_platform_staff(auth.uid()) then
    raise exception 'Apenas a equipe GSBC pode registrar o documento emitido.';
  end if;

  select status into v_status from escalonamentos where id = p_escalonamento_id;

  if v_status is null then
    raise exception 'Escalonamento não encontrado.';
  end if;

  if v_status <> 'aprovada' then
    raise exception 'Só é possível gerar o documento depois da aprovação.';
  end if;

  insert into escalonamento_documentos (escalonamento_id, documento_id, template_versao, dados_geracao, emitido_por)
  values (p_escalonamento_id, p_documento_id, p_template_versao, p_dados_geracao, auth.uid())
  returning id into v_id;

  update escalonamentos set status = 'documento_emitido' where id = p_escalonamento_id;

  insert into escalonamento_eventos (escalonamento_id, tipo, user_id)
  values (p_escalonamento_id, 'documento_emitido', auth.uid());

  return v_id;
end;
$$;

grant execute on function public.registrar_documento_emitido(uuid, uuid, integer, jsonb) to authenticated;

-- =========================================================================
-- registrar_envio — Envio + Evidência. No primeiro envio bem-sucedido
-- registrado (documento_emitido -> enviada), transiciona a cobrança pra
-- 'legal_escalation' via change_cobranca_status (já grava
-- cobranca_eventos, já para a régua — 'legal_escalation' está em
-- STATUS_ENCERRAM_REGUA desde sempre). É deliberado que a transição da
-- cobrança aconteça aqui, no Envio, não na Aprovação: até o documento sair
-- de fato, o processo ainda é interno — só o envio de verdade é o ato
-- irreversível que deve aparecer no histórico da cobrança.
-- =========================================================================
create or replace function public.registrar_envio(
  p_escalonamento_id uuid,
  p_canal text,
  p_destinatario text,
  p_delivery_status text,
  p_erro text default null,
  p_comprovante_documento_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_cobranca_id uuid;
  v_id uuid;
  v_primeiro_envio boolean;
begin
  if not public.is_platform_staff(auth.uid()) then
    raise exception 'Apenas a equipe GSBC pode registrar um envio.';
  end if;

  select status, cobranca_id into v_status, v_cobranca_id
  from escalonamentos where id = p_escalonamento_id;

  if v_status is null then
    raise exception 'Escalonamento não encontrado.';
  end if;

  if v_status not in ('documento_emitido', 'enviada') then
    raise exception 'Só é possível registrar envio depois do documento emitido.';
  end if;

  v_primeiro_envio := v_status = 'documento_emitido';

  insert into escalonamento_envios (
    escalonamento_id, canal, destinatario, delivery_status, erro, comprovante_documento_id, registrado_por
  )
  values (
    p_escalonamento_id, p_canal, p_destinatario, p_delivery_status, p_erro, p_comprovante_documento_id, auth.uid()
  )
  returning id into v_id;

  update escalonamentos set status = 'enviada' where id = p_escalonamento_id and status <> 'enviada';

  insert into escalonamento_eventos (escalonamento_id, tipo, descricao, user_id)
  values (p_escalonamento_id, 'envio', p_canal || ' → ' || p_destinatario, auth.uid());

  if v_primeiro_envio then
    perform public.change_cobranca_status(
      v_cobranca_id,
      'legal_escalation',
      'Notificação extrajudicial enviada (escalonamento ' || p_escalonamento_id || ')'
    );
  end if;

  return v_id;
end;
$$;

grant execute on function public.registrar_envio(uuid, text, text, text, text, uuid) to authenticated;

-- =========================================================================
-- registrar_resultado — Resultado. Nunca muda o status da cobrança
-- automaticamente (mesmo racional de register_contestacao_evento,
-- Rodada 21: "procedente"/"sem resposta"/etc. não implica uma única
-- transição correta) — fica com "Mudar status", já existente na ficha.
-- =========================================================================
create or replace function public.registrar_resultado(
  p_escalonamento_id uuid,
  p_descricao text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_platform_staff(auth.uid()) then
    raise exception 'Apenas a equipe GSBC pode registrar o resultado.';
  end if;

  select status into v_status from escalonamentos where id = p_escalonamento_id;

  if v_status is null then
    raise exception 'Escalonamento não encontrado.';
  end if;

  if v_status <> 'enviada' then
    raise exception 'Só é possível registrar o resultado depois do envio.';
  end if;

  update escalonamentos set status = 'concluida', concluido_em = now() where id = p_escalonamento_id;

  insert into escalonamento_eventos (escalonamento_id, tipo, descricao, user_id)
  values (p_escalonamento_id, 'resultado', p_descricao, auth.uid());
end;
$$;

grant execute on function public.registrar_resultado(uuid, text) to authenticated;
