-- GSBC — Rodada 18 (STG-01): Promoção de Prospecto para Empresa
--
-- Elimina o recadastro manual entre prospecto validado e empresa
-- operacional. Reaproveita a modelagem já existente: quando um
-- prospecto vira empresa, o MESMO dossiê (dossies_cadastrais) passa a
-- ser o dossiê da empresa — basta preencher empresa_id/tenant_id, que
-- já eram nullable desde a Rodada 16. Nenhuma tabela nova.
--
-- `promoted_at`/`promoted_by` registram quando e quem confirmou a
-- promoção — útil mesmo no caminho comum (via `empresa_id` preenchido)
-- porque `empresa_id` sozinho não distingue "veio de consulta direta na
-- empresa" (Rodada 14) de "veio de um prospecto promovido".
--
-- `promoted_empresa_id` cobre o caminho de duplicidade (regra do
-- STG-01: nunca duplicar empresa silenciosamente). Quando o CNPJ do
-- prospecto já é uma empresa existente, o dossiê do prospecto NÃO pode
-- assumir esse `empresa_id` (já é o dossiê canônico de outra linha,
-- índice único). Em vez disso as evidências do prospecto são copiadas
-- (append-only — nunca reparentadas, ver comentário em dossie_evidencias)
-- para o dossiê já existente daquela empresa, e o prospecto fica
-- marcado como promovido via `promoted_empresa_id`, preservando de onde
-- veio sem violar a unicidade nem o histórico imutável de evidências.

alter table dossies_cadastrais
  add column promoted_at timestamptz,
  add column promoted_by uuid references users(id),
  add column promoted_empresa_id uuid references empresas(id);

comment on column dossies_cadastrais.promoted_at is 'Quando este prospecto foi promovido a empresa (novo cadastro ou associado a um existente). Nulo enquanto for só prospecto.';
comment on column dossies_cadastrais.promoted_by is 'Owner que confirmou a promoção.';
comment on column dossies_cadastrais.promoted_empresa_id is 'Empresa resultante da promoção. No caminho comum é igual a empresa_id; no caminho de CNPJ duplicado, aponta para a empresa já existente (empresa_id deste dossiê permanece nulo, pois o dossiê canônico dela é outro).';
