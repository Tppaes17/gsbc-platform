# ADR-RF-016 - Backup, PITR And Recovery

## Question

Como recuperar o banco operacional GSBC, o canonical RF e os dados derivados nao reconstruiveis?

## Evidence

O projeto Supabase vinculado informou `walg_enabled=true`, `pitr_enabled=false`, `backups=null` e nenhum dado de backup fisico. O backup logico atual cobre o fluxo operacional existente, mas nao comprova restore dos schemas RF. Nenhum restore isolado com RPO/RTO medido foi executado.

## Alternatives

Backup logico agendado; backups diarios gerenciados; PITR; rebuild do canonical a partir de raw versionado; combinacao de PITR para dados nao reconstruiveis e rebuild para canonical.

## Decision

Exigir PITR ou protecao equivalente e restore testado para o banco operacional GSBC e para qualquer banco RF que contenha dados nao reconstruiveis. Preservar raw, manifest, checksums e versao do loader para permitir rebuild do canonical. Staging/extracted permanecem descartaveis. Proposta de engenharia: RPO/RTO GSBC <= 15 min / <= 4 h; RF canonical <= 24 h / <= 24 h, sujeitos a aprovacao do proprietario.

## Trade-offs

PITR e retencao elevam custo, mas reduzem perda de decisoes, links e eventos. Rebuild reduz custo de backup canonical, mas aumenta RTO e depende da preservacao dos objetos e do codigo.

## Status

BLOCKED — INSUFFICIENT EVIDENCE

O ADR pode ser aceito somente apos aprovacao de RPO/RTO/retencao, habilitacao da protecao e restore isolado bem-sucedido.
