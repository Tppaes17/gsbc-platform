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

ACCEPTED — TEMPORARY OPTION C FOR PRE-REVENUE PHASE, PITR MANDATORY BEFORE LIVE FINANCIAL OPERATION

O pacote e a politica detalhada estao em `docs/rf-03a2b1/RECOVERY_ARCHITECTURE_OWNER_DECISION.md` (pacote Balanced/PITR original) e `docs/rf-03a2b1a/RECOVERY_COST_RECONCILIATION.md` (reconciliacao de custo e opcoes por RPO).

## Owner Decision (2026-09-17)

O owner aprovou inicialmente o pacote Balanced completo (Decisoes 1-5 do decision pack RF-03A.2B.1): RPO <=15 min, RTO <=4 h, PITR de 7 dias, backup logico independente criptografado fora do failure domain principal.

Apos a reconciliacao de custo (RF-03A.2B.1A) apresentar uma alternativa tecnica condicional mais barata para fase pre-receita — Pro + backup logico completo criptografado a cada 30 minutos, piso provider ~USD 25/mes, RPO<=1h somente apos benchmark e restore drill isolado passarem — perguntei diretamente se o GSBC ja tem operacao financeira real. **O owner confirmou que o GSBC ainda esta pre-receita/piloto controlado** e, dado isso, **escolheu trocar para a Opcao C temporaria** em vez do PITR ja aprovado.

Isso substitui a decisao anterior: a arquitetura-alvo imediata passa a ser Pro + backup logico completo a cada 30 minutos para storage independente, monitorado, com RPO<=1h condicional (nao um resultado ja provado). Isso NAO autoriza ainda: (1) implementacao/enablement real de nada — plano Pro, automacao de backup, destino de storage independente e credenciais continuam por fazer; (2) confiar no RPO de 1h antes do benchmark de dump+encrypt+upload<=30min e de um restore isolado passarem; (3) o restore drill em si.

**Gatilho obrigatorio, nao um alvo de calendario:** antes de qualquer operacao financeira ao vivo (cobranca/pagamento real, conciliacao autoritativa) ou armazenamento de evidencia legal/auditoria irreconstruivel, o GSBC DEVE migrar para PITR de 7 dias (~USD 130/mes) e passar por um restore drill isolado antes de operar. Esta migracao nao e opcional quando a condicao de gatilho for atingida.

O gate de readiness (RF-03A.2B) so pode fechar apos habilitacao real (Opcao C ou PITR), evidencia de recovery point, backup independente configurado e restore isolado bem-sucedido com RPO/RTO medidos — nao apenas esta aprovacao arquitetural.
