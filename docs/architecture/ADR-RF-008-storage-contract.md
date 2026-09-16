# ADR-RF-008 — Storage Contract

## Question

Como organizar artefatos de arquivo RF sem criar bucket/ingestao nesta fase?

## Evidence

- RF-02 proibe ingestao real.
- O Master Spec exige raw storage, manifest, logs e reconstruibilidade.
- Raw/extracted/canonical sao reconstruiveis; links, decisoes e auditoria GSBC nao sao.

## Alternatives

- Criar bucket fisico agora.
- Documentar contrato e adiar bucket para RF-03.
- Usar filesystem temporario sem contrato.

## Decision

Formalizar contrato sem criar bucket fisico:

```text
rfb-cnpj/{dataset_version}/raw/
rfb-cnpj/{dataset_version}/extracted/
rfb-cnpj/{dataset_version}/manifest/
rfb-cnpj/{dataset_version}/logs/
```

Bucket futuro deve ser privado, com writers restritos a worker/RPC autorizado e leitores apenas operacionais. Retencao e lifecycle dependem de sizing/POC.

## Trade-offs

- Evita recurso ocioso antes do downloader.
- RF-03 deve validar bucket, permissao, lifecycle e backup.

## Status

Accepted as contract in RF-02; physical bucket deferred.
