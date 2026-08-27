-- GSBC — Rodada 26: Revenue Opportunity Engine (STG-10)
--
-- Pipeline do roadmap: Prospecto → Dados cadastrais → Fit territorial →
-- Fit de atividade → Instrumentos potenciais → Obrigações potenciais →
-- Estimativa econômica → Confiança → Prioridade, terminando num
-- Opportunity Score determinístico e explicável (sem ML — "primeiro
-- acumular dados", regra explícita do roadmap).
--
-- Reaproveitamento deliberado: is_owner() já existe (Rodada 14) e é o
-- mesmo gate de acesso do módulo Prospectos — decisão confirmada com o
-- usuário (sem novo papel nesta rodada, mesmo racional já usado lá).
-- O padrão de escrita também segue Prospectos, não Escalonamentos
-- (Rodada 25): RLS direta com is_owner() nas 3 tabelas abaixo, sem
-- funil de RPCs — porque não há aqui nenhum papel MAIS ESTREITO que
-- precise ser protegido contra um Owner mais amplo (Owner já é o papel
-- mais restrito do sistema); a lição da Rodada 25 (RPC obrigatório
-- quando existe um papel mais estreito que a policy geral) não se
-- aplica aqui.
--
-- Cálculo do score em si vive em TypeScript puro
-- (src/lib/oportunidades/scoring.ts), mesmo padrão de avaliarCnpj()
-- (Rodada 14) — não em SQL: comparação de texto livre (fit
-- territorial/atividade contra sindicatos.base_territorial/categoria,
-- que não têm estrutura pra isso — decisão confirmada com o usuário) e
-- iteração sobre múltiplos tenants são mais naturais em TS do que numa
-- function PL/pgSQL.

-- =========================================================================
-- oportunidades (cabeçalho) — uma linha por prospecto avaliado (reavaliar
-- atualiza a mesma linha; histórico de cada avaliação/decisão fica em
-- oportunidade_eventos, nunca sobrescrito).
-- =========================================================================
create table oportunidades (
  id uuid primary key default gen_random_uuid(),
  dossie_cadastral_id uuid not null unique references dossies_cadastrais(id) on delete cascade,
  tenant_candidato_id uuid references tenants(id) on delete set null,
  status text not null default 'potencial' check (status in (
    'potencial', 'em_analise', 'validada', 'descartada'
  )),
  score integer not null check (score between 0 and 100),
  prioridade text not null check (prioridade in ('alta', 'media', 'baixa')),
  confianca text not null check (confianca in ('alta', 'media', 'baixa')),
  estimativa_valor numeric(14, 2),
  estimativa_metodologia text,
  candidatos_avaliados jsonb,
  instrumentos_potenciais jsonb,
  avaliado_em timestamptz not null default now(),
  avaliado_por uuid references users(id) on delete set null,
  analise_iniciada_em timestamptz,
  validado_em timestamptz,
  validado_por uuid references users(id) on delete set null,
  descartado_em timestamptz,
  descartado_por uuid references users(id) on delete set null,
  motivo_decisao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table oportunidades is 'Avaliação de oportunidade de receita pra um prospecto (STG-10) — inferência, nunca obrigação jurídica confirmada (regra explícita do roadmap). tenant_candidato_id é o sindicato com melhor fit encontrado, não uma atribuição definitiva.';
comment on column oportunidades.candidatos_avaliados is 'Snapshot jsonb de todos os sindicatos avaliados e seus fits (territorial/atividade) nesta rodada de avaliação — transparência de por que tenant_candidato_id foi escolhido sobre os demais.';
comment on column oportunidades.instrumentos_potenciais is 'Snapshot jsonb dos instrumentos vigentes do tenant candidato no momento da avaliação — lista informativa, não vínculo real.';
comment on column oportunidades.estimativa_metodologia is 'Texto explicando como estimativa_valor foi calculado (ou por que está null — regra 5: nunca inventar dado, ausência de histórico fica ausência).';

create index oportunidades_status_idx on oportunidades (status);
create index oportunidades_tenant_candidato_id_idx on oportunidades (tenant_candidato_id);

create trigger set_updated_at before update on oportunidades
  for each row execute function public.set_updated_at();

-- =========================================================================
-- oportunidade_fatores — breakdown ATUAL do score (explicabilidade: "por
-- que esta oportunidade recebeu este score", regra explícita do
-- roadmap). Reavaliação substitui o lote inteiro (delete+insert, feito
-- pela Server Action) — histórico de scores passados fica em
-- oportunidade_eventos.score, não aqui.
-- =========================================================================
create table oportunidade_fatores (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidades(id) on delete cascade,
  dimensao text not null check (dimensao in (
    'fit_territorial', 'fit_atividade', 'qualidade_evidencias', 'completude',
    'potencial_economico', 'recencia', 'qualidade_contato'
  )),
  pontos integer not null,
  peso_maximo integer not null,
  explicacao text not null,
  created_at timestamptz not null default now()
);

comment on table oportunidade_fatores is 'Breakdown do score atual por dimensão — mesmo racional de dossie_evidencias (Rodada 14): cada ponto atribuído vem com uma explicação legível.';

create index oportunidade_fatores_oportunidade_id_idx on oportunidade_fatores (oportunidade_id);

-- =========================================================================
-- oportunidade_eventos — histórico imutável (avaliações + transições de
-- status), mesmo padrão de dossie_evidencias/cobranca_eventos/etc.
-- =========================================================================
create table oportunidade_eventos (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidades(id) on delete cascade,
  tipo text not null check (tipo in (
    'avaliacao', 'em_analise', 'validada', 'descartada', 'observacao'
  )),
  descricao text,
  score integer,
  user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table oportunidade_eventos is 'Histórico imutável de avaliações e decisões — sem policy de update/delete.';

create index oportunidade_eventos_oportunidade_id_idx on oportunidade_eventos (oportunidade_id, created_at);

-- =========================================================================
-- RLS — restrito a Owners, mesmo gate de dossies_cadastrais/Prospectos
-- (Rodada 14). Nem o resto da equipe GSBC, nem sindicatos, têm acesso.
-- =========================================================================
alter table oportunidades enable row level security;
alter table oportunidade_fatores enable row level security;
alter table oportunidade_eventos enable row level security;

create policy oportunidades_select on oportunidades for select
  using (public.is_owner(auth.uid()));

create policy oportunidades_insert on oportunidades for insert
  with check (public.is_owner(auth.uid()));

create policy oportunidades_update on oportunidades for update
  using (public.is_owner(auth.uid()))
  with check (public.is_owner(auth.uid()));

create policy oportunidade_fatores_select on oportunidade_fatores for select
  using (
    exists (
      select 1 from oportunidades o
      where o.id = oportunidade_fatores.oportunidade_id and public.is_owner(auth.uid())
    )
  );

create policy oportunidade_fatores_insert on oportunidade_fatores for insert
  with check (public.is_owner(auth.uid()));

create policy oportunidade_fatores_delete on oportunidade_fatores for delete
  using (public.is_owner(auth.uid()));

create policy oportunidade_eventos_select on oportunidade_eventos for select
  using (
    exists (
      select 1 from oportunidades o
      where o.id = oportunidade_eventos.oportunidade_id and public.is_owner(auth.uid())
    )
  );

create policy oportunidade_eventos_insert on oportunidade_eventos for insert
  with check (public.is_owner(auth.uid()));

-- Sem policy de update/delete em oportunidade_eventos: histórico imutável.

grant select, insert, update on public.oportunidades to authenticated;
grant select, insert, delete on public.oportunidade_fatores to authenticated;
grant select, insert on public.oportunidade_eventos to authenticated;
