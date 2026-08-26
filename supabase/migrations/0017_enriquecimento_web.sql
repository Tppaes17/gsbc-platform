-- GSBC — Rodada 15: Inteligência Cadastral, Fase 2 (Enriquecimento Web)
--
-- Complementa a Fase 1 (Rodada 14, só Receita Federal) com dados de
-- enriquecimento web via LeadCNPJ (site oficial, e-mails institucionais,
-- telefone, redes sociais, decisores) — fonte nível 2 da hierarquia do
-- prompt-mestre. Nunca substitui a Receita Federal como fonte de
-- identidade/situação cadastral; só adiciona canais de contato.

alter table dossies_cadastrais
  add column dados_enriquecimento jsonb;

comment on column dossies_cadastrais.dados_enriquecimento is 'Snapshot da última consulta de enriquecimento web (LeadCNPJ) — site, e-mails, telefone, redes sociais, decisores. Nulo até a Fase 2 rodar pela primeira vez para esta empresa.';

alter table dossie_evidencias
  drop constraint dossie_evidencias_tipo_check;

alter table dossie_evidencias
  add constraint dossie_evidencias_tipo_check check (tipo in (
    'cnpj', 'razao_social', 'situacao_cadastral', 'endereco', 'cnae', 'qsa',
    'site', 'email', 'telefone', 'redes_sociais', 'decisor', 'outro'
  ));
