-- GSBC — Rodada 16: Prospectos (upload de pesquisa já realizada)
--
-- Complementa a Fase 1/2 do agente (consulta oficial + enriquecimento
-- web) com um caminho manual: o Owner já tem uma planilha de empresas
-- pesquisadas (ex.: exportação de um provedor de dados B2B, filtrada por
-- CNAE/segmento) e quer carregá-la de uma vez, antes de decidir formalmente
-- perseguir a cobrança sob um sindicato específico.
--
-- Um "prospecto" é um dossiê SEM empresa/tenant vinculado ainda — pesquisa
-- de mercado, não uma empresa sob gestão de cobrança. Reaproveita a
-- estrutura de dossies_cadastrais/dossie_evidencias já existente (mesmo
-- score, mesma trilha de evidências), só relaxando a obrigatoriedade de
-- empresa_id/tenant_id.

alter table dossies_cadastrais
  alter column empresa_id drop not null;

alter table dossies_cadastrais
  alter column tenant_id drop not null;

alter table dossies_cadastrais
  add column razao_social text;

alter table dossies_cadastrais
  add column origem text not null default 'consulta_api'
    check (origem in ('consulta_api', 'importacao_planilha'));

comment on column dossies_cadastrais.razao_social is 'Só preenchido em prospectos (empresa_id nulo) — quando há empresa vinculada, a razão social vem de empresas.razao_social.';
comment on column dossies_cadastrais.origem is 'consulta_api = criado via "Consultar CNPJ oficial"; importacao_planilha = criado via upload de planilha de pesquisa já realizada.';

-- Um CNPJ só pode aparecer uma vez como prospecto (reimportar atualiza,
-- não duplica) — não se aplica a dossiês já vinculados a uma empresa
-- (esses continuam únicos por empresa_id, como antes).
create unique index dossies_cadastrais_prospecto_cnpj_idx
  on dossies_cadastrais (cnpj_consultado)
  where empresa_id is null;

-- Log de cada upload — regra 34 do prompt-mestre (timeline imutável):
-- quem importou, quando, quantas linhas, quantas deram erro.
create table dossie_importacoes (
  id uuid primary key default gen_random_uuid(),
  nome_arquivo text not null,
  total_linhas integer not null,
  linhas_importadas integer not null,
  linhas_atualizadas integer not null,
  linhas_com_erro integer not null,
  erros jsonb,
  importado_por uuid references users(id),
  created_at timestamptz not null default now()
);

comment on table dossie_importacoes is 'Auditoria de cada upload de planilha de prospectos — regra 34 do prompt-mestre.';

alter table dossie_importacoes enable row level security;

create policy dossie_importacoes_select on dossie_importacoes for select
  using (public.is_owner(auth.uid()));

create policy dossie_importacoes_insert on dossie_importacoes for insert
  with check (public.is_owner(auth.uid()));

grant select, insert on public.dossie_importacoes to authenticated;
