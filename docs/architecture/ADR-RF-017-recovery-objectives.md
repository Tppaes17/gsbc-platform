# ADR-RF-017 - Recovery Objectives

## Question

Quais RPO/RTO devem governar operational core, governanca e RF?

## Evidence

Dados financeiros, auditoria, decisoes humanas, tenant/auth e evidencias nao sao reconstruiveis. PITR esta desligado, backup fisico nao foi enumerado e nenhum restore produtivo isolado mediu duracao. RF publico e reconstruivel, mas manifests, proveniencia, links e decisoes de publicacao nao sao.

## Decision

Propor por classe: operational transactions e auditoria RPO <=15 min/RTO <=4 h; configuracao RPO <=1 h/RTO <=4 h; RF manifests/proveniencia RPO <=1 h/RTO <=8 h; RF raw/canonical RPO <=24 h/RTO <=24-48 h; derivados sem RPO e RTO <=72 h. Objetivos completos vivem em `docs/rf-03a2b/RPO_RTO_MATRIX.md`.

## Trade-offs

RPO curto requer PITR ou protecao equivalente e aumenta custo. RF reconstruivel aceita RTO maior, desde que raw, manifest, loader e versao anterior estejam preservados.

## Status

PROPOSED — OWNER APPROVAL REQUIRED

Os objetivos nao estao atualmente demonstrados.

