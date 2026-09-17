# ADR-RF-016 - Backup, PITR And Recovery

## Question

Como recuperar o banco operacional GSBC, o canonical RF e os dados derivados nao reconstruiveis?

## Evidence

Em 2026-09-17, o projeto Supabase vinculado informou `walg_enabled=true`, `pitr_enabled=false`, `backups=null`, regiao `eu-west-1` e nenhum backup fisico enumerado. O backup logico atual e uma exportacao JSON nao transacional do schema `public` e de usuarios Auth para bucket no mesmo provider. O smoke local valida leitura do JSON, nao restaura banco, schemas, constraints, indexes, RLS, grants, functions, triggers ou Storage. Nenhum restore isolado de backup produtivo com RPO/RTO medido foi executado.

## Alternatives

Backup logico agendado; backups diarios gerenciados; PITR; rebuild do canonical a partir de raw versionado; combinacao de PITR para dados nao reconstruiveis e rebuild para canonical.

## Decision

Proposta para decisao do owner: adotar o pacote Balanced para o operational core, com PITR de 7 dias, backup logico completo periodico criptografado fora do failure domain principal, monitoramento da janela/lag, restore isolado obrigatorio e objetivos RPO <=15 min / RTO <=4 h. O RTO permanece objetivo nao demonstrado ate o drill. Retencao independente diaria/semanal/mensal e frequencia de drill dependem de aprovacao e medicao de custo/crescimento.

Para qualquer futuro banco RF que contenha dados nao reconstruiveis, exigir protecao e restore testado equivalentes aos objetivos aprovados. Preservar raw, manifest, metadados de integridade e versao do loader para rebuild do canonical; staging/extracted permanecem descartaveis. A arquitetura RF dedicada continua fora do escopo desta decisao.

## Trade-offs

PITR e retencao elevam custo, mas reduzem perda de decisoes, links e eventos. Backup independente reduz falha comum de projeto/conta, mas adiciona chaves, lifecycle, automacao e um segundo caminho de restore. Rebuild reduz custo de backup canonical, mas aumenta RTO e depende da preservacao dos objetos e do codigo.

## Status

ACCEPTED — OWNER APPROVED PACKAGE, IMPLEMENTATION PENDING

O pacote e a politica detalhada estao em `docs/rf-03a2b1/RECOVERY_ARCHITECTURE_OWNER_DECISION.md`.

## Owner Decision (2026-09-17)

O owner aprovou o pacote Balanced completo (Decisoes 1-5 do decision pack): RPO <=15 min, RTO <=4 h, PITR de 7 dias, backup logico independente criptografado fora do failure domain principal, e autorizou a fase seguinte (restore drill) sujeita a um preflight de custo/escopo separado antes da execucao.

Isso autoriza a arquitetura e a implementacao de PITR/backup independente. Isso NAO autoriza ainda: (1) o restore drill em si, que exige preflight de custo/escopo proprio antes de qualquer clone/restore pago ser criado; (2) qualquer escolha de provedor/conta especifica para o backup independente ainda nao decidida.

Enablement de PITR e upgrade de plano Supabase sao acoes de billing feitas via dashboard (Supabase Studio), fora do alcance do CLI (`supabase backups` so lista/restaura PITR ja habilitado, nao o habilita). Essa etapa depende de acesso direto do owner ao dashboard ou de execucao assistida por navegador com a sessao do owner.

O gate de readiness (RF-03A.2B) so pode fechar apos habilitacao real, evidencia de recovery point, backup independente configurado e restore isolado bem-sucedido com RPO/RTO medidos — nao apenas esta aprovacao arquitetural.
