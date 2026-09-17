# RF-03A Controlled POC

Ferramenta local e descartavel para validar manifest, download, integridade,
extracao, parser streaming e carga transacional do RF-CNPJ. Nao e pipeline de
producao, nao publica dataset, nao cria cron e nao escreve no Supabase remoto.

O executor exige reconhecimento explicito quando a amostra nao veio diretamente
da origem oficial:

```bash
node scripts/rf-poc/run.mjs \
  --url https://example.invalid/Cnaes.zip \
  --dataset-version 2026-04 \
  --output docs/rf-03a/POC_METRICS.json \
  --allow-unverified-source
```

O benchmark usa o Postgres local do Supabase, executa duas cargas na mesma
transacao e termina em `ROLLBACK`. Depois confirma em uma nova sessao que nenhum
dataset, staging ou registro canonical do POC permaneceu.
