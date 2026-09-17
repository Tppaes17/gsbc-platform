# ADR-RF-017 - Recovery Objectives

## Question

Quais RPO/RTO devem governar operational core, governanca e RF?

## Evidence

Dados financeiros, auditoria, decisoes humanas, tenant/auth e evidencias nao sao reconstruiveis. PITR esta desligado, backup fisico nao foi enumerado e nenhum restore produtivo isolado mediu duracao. RF publico e reconstruivel, mas manifests, proveniencia, links e decisoes de publicacao nao sao.

## Decision

Para decisao do owner, recomendar ao operational core RPO <=15 min e RTO <=4 h. A recomendacao resulta da comparacao explicita entre RPO de 5 min/15 min/1 h/24 h e RTO de 1 h/4 h/8 h/24 h em `docs/rf-03a2b1/RECOVERY_ARCHITECTURE_OWNER_DECISION.md`. O RPO exige PITR ou protecao equivalente; o RTO e PROJECTED e nao pode ser tratado como SLA ate um restore drill completo.

Objetivos de RF permanecem fora desta microfase e conservam a proposta anterior para avaliacao futura: manifests/proveniencia RPO <=1 h/RTO <=8 h; RF raw/canonical RPO <=24 h/RTO <=24-48 h; derivados sem RPO e RTO <=72 h. A matriz existente continua referencia, nao evidencia de capacidade atual.

## Trade-offs

RPO curto requer PITR ou protecao equivalente e aumenta custo. RTO de 4 h exige deteccao, decisao, restore, configuracao, validacao, reconciliacao e cutover ensaiados; tempo de banco isolado nao basta. RF reconstruivel aceita RTO maior, desde que raw, manifest, loader e versao anterior estejam preservados.

## Status

PROPOSED — OWNER APPROVAL REQUIRED

Os objetivos aguardam escolha explicita do owner e nao estao atualmente demonstrados. Aprovacao define o target; somente implementacao e teste podem provar readiness.
