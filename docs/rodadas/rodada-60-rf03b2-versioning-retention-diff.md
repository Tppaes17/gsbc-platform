# Rodada 60 - RF-03B.2 Versioning, Retention And Diff

## Diagnostico

O modelo atual usa `dataset_version_id`, `PUBLISHED` e `is_current`; nao havia engine de diff nem politica executavel de tres snapshots. RF-03B.1 mediu Empresas, mas Estabelecimentos/Simples e capacity nacional seguem desconhecidos.

## Construido

- State machine local puro para ACTIVE/publish/rollback/retention.
- Diff deterministico, idempotente, reversivel e sem conclusao juridica por ausencia.
- Gates de manifest, quality e anomalia com thresholds externos.
- Double-check de tres competencias e preservacao de CNPJ alfanumerico.
- Onze documentos de arquitetura, capacity, custo, search, pipeline e readiness.

## Decisoes

Modelo A com particionamento futuro por versao; tres full snapshots; RAW-6; diff/provenance long-term; PostgreSQL-first; dedicated RF PostgreSQL/object storage/container worker. QSA bloqueado ate privacy review e, se aprovado, retencao full mais curta.

## Validacao E Pendencias

Sete testes lifecycle, onze RF POC e quatorze source-probe passaram, alem de lint/typecheck. Nenhuma migration, download, banco, producao, billing, cron, commit ou push foi executado.

Gate RF-03B.2: CONDITIONAL. P0=0, P1=2. RF-03B.3 permanece CONDITIONAL e exige decisao do owner.
