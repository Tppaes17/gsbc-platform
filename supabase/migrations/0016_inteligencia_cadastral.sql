-- GSBC — Rodada 14: Inteligência Cadastral (Fase 1 do Agente Autônomo)
--
-- Implementa a Fase 1 do prompt-mestre de "Agente Autônomo de
-- Inteligência Cadastral, Localização Empresarial e Cobrança": consulta
-- oficial de CNPJ (nível 1 da hierarquia de fontes — Receita Federal via
-- BrasilAPI/Minha Receita, gratuita e sem credencial), dossiê com
-- evidências estruturadas (regra 33 do prompt) e score de confiabilidade
-- calculado só com os sinais que esta fase realmente verifica.
--
-- Escopo desta rodada (decisão do usuário): SEM envio automático de
-- cobrança, SEM recobrança, SEM notificação extrajudicial, SEM
-- enriquecimento web (site/LinkedIn/contatos — exigiria uma API de busca
-- paga que ainda não temos). Restrito a "Owners", mapeados ao papel
-- gsbc_super_admin já existente no RBAC (decisão do usuário — sem papel
-- novo nesta rodada).

create or replace function public.is_owner(p_user_id uuid)
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
      and r.code = 'gsbc_super_admin'
  );
$$;

comment on function public.is_owner is 'True se o usuário tem membership ativa com papel gsbc_super_admin no tenant platform — mapeamento de "Owner" decidido para a Rodada 14 (Inteligência Cadastral).';

-- Um dossiê por empresa — reconsultas atualizam o mesmo registro; o
-- histórico de cada consulta fica nas evidências (append-only), nunca
-- sobrescrito.
create table dossies_cadastrais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null unique references empresas(id) on delete cascade,
  status text not null default 'novo' check (status in (
    'novo', 'pesquisa_iniciada', 'cadastro_validado', 'conflito_identificado', 'revisao_cadastral'
  )),
  cnpj_consultado text,
  dados_oficiais jsonb,
  qsa jsonb,
  score_confiabilidade integer check (score_confiabilidade between 0 and 100),
  score_classificacao text check (score_classificacao in ('excelente', 'alta', 'media', 'baixa', 'insuficiente')),
  ultima_consulta_em timestamptz,
  criado_por uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table dossies_cadastrais is 'Dossiê de inteligência cadastral por empresa (Fase 1 — só validação oficial de CNPJ). Owners apenas.';
comment on column dossies_cadastrais.score_confiabilidade is 'Score 0-100 calculado só com os sinais desta fase (situação ativa, razão social, endereço, CNAE, QSA) — não é o score completo de 90+ pontos do prompt-mestre, que depende de sinais web ainda não implementados.';

-- Evidência estruturada por campo consultado — regra 33 do prompt-mestre.
-- Também serve como fonte da timeline do dossiê (mesmo padrão de reuso
-- de cobranca_eventos/negociacao_eventos: um evento imutável por achado).
create table dossie_evidencias (
  id uuid primary key default gen_random_uuid(),
  dossie_id uuid not null references dossies_cadastrais(id) on delete cascade,
  tipo text not null check (tipo in ('cnpj', 'razao_social', 'situacao_cadastral', 'endereco', 'cnae', 'qsa', 'outro')),
  campo text,
  valor text,
  fonte text not null,
  url text,
  nivel_confianca text not null check (nivel_confianca in ('confirmado', 'provavel', 'nao_confirmado', 'conflitante', 'desatualizado')),
  observacao text,
  consultado_em timestamptz not null default now(),
  consultado_por uuid references users(id)
);

comment on table dossie_evidencias is 'Log imutável de evidências por campo pesquisado (regra 33 do prompt-mestre) — nunca editado, uma reconsulta gera novas linhas.';

create index dossie_evidencias_dossie_id_idx on dossie_evidencias (dossie_id);

alter table dossies_cadastrais enable row level security;
alter table dossie_evidencias enable row level security;

-- Restrito a Owners — nem o resto da equipe GSBC, nem sindicatos, têm
-- acesso a este módulo (decisão explícita do usuário).
create policy dossies_cadastrais_select on dossies_cadastrais for select
  using (public.is_owner(auth.uid()));

create policy dossies_cadastrais_insert on dossies_cadastrais for insert
  with check (public.is_owner(auth.uid()));

create policy dossies_cadastrais_update on dossies_cadastrais for update
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

create policy dossie_evidencias_select on dossie_evidencias for select
  using (
    exists (
      select 1 from dossies_cadastrais d
      where d.id = dossie_evidencias.dossie_id and public.is_owner(auth.uid())
    )
  );

create policy dossie_evidencias_insert on dossie_evidencias for insert
  with check (public.is_owner(auth.uid()));

grant select, insert, update on public.dossies_cadastrais to authenticated;
grant select, insert on public.dossie_evidencias to authenticated;
