-- GSBC — Rodada 30: descarte automático de prospectos por situação
-- cadastral na Receita Federal
--
-- Decisão confirmada com o usuário: ao consultar a Receita Federal
-- (agora disparado automaticamente na importação da planilha, e
-- também na consulta manual "Consultar CNPJ oficial" — mesma regra
-- nos dois lugares, pra nunca dar resultado diferente dependendo de
-- quem/quando dispara), um CNPJ com situação cadastral diferente de
-- ATIVA (baixada, suspensa, inapta, nula) ou não encontrado na
-- Receita Federal é descartado automaticamente — nunca apagado
-- (regra 4 do AGENTS.md: histórico não pode desaparecer), só sai da
-- listagem padrão. Mesmo padrão já usado em `oportunidades.descartada`
-- (Rodada 26): status novo + motivo + data, sem DELETE.

alter table dossies_cadastrais
  drop constraint dossies_cadastrais_status_check;

alter table dossies_cadastrais
  add constraint dossies_cadastrais_status_check check (status in (
    'novo', 'pesquisa_iniciada', 'cadastro_validado', 'conflito_identificado',
    'revisao_cadastral', 'descartado_receita'
  ));

alter table dossies_cadastrais
  add column descartado_em timestamptz,
  add column descartado_motivo text;

comment on column dossies_cadastrais.descartado_em is 'Preenchido só quando status = descartado_receita — sempre por decisão automática do sistema a partir da situação cadastral na Receita Federal, nunca por um humano clicando "descartar" (não existe essa ação manual).';
comment on column dossies_cadastrais.descartado_motivo is 'Texto legível explicando por que foi descartado (ex.: "CNPJ com situação cadastral BAIXADA" ou "CNPJ não localizado na Receita Federal") — auditável, nunca inferido silenciosamente.';
