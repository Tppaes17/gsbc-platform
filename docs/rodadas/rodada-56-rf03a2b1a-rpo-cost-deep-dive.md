# Rodada 56 - RF-03A.2B.1A RPO Cost Deep Dive

## Diagnostico

A reconciliacao inicial provou o piso de USD 130/mes do Balanced/PITR, mas nao separava suficientemente as alternativas de RPO 15 min, 30 min e 1 h. Dumps logicos, replicacao e WAL externo nao podem ser tratados como PITR sem verificar suporte e semantica de recovery.

## Executado

- Verificacao documental de native backup, PITR, `supabase db dump`, logical replication, read replicas, Pipelines e limites WAL.
- Confirmacao de que WAL fisico externo customer-managed nao possui suporte documentado no Supabase gerenciado.
- Analise de frequencia/duracao necessaria para dumps atingirem 15 min, 30 min e 1 h.
- Comparacao de object storage independente com formulas e exemplos de custo.
- Avaliacao de Neon e AWS RDS; ambos excluidos como comparacao end-to-end sem TCO/migracao medidos.
- Definicao de arquitetura recomendada por RPO e estrategia temporaria pre-revenue.

## Alteracoes De Produto E Dados

Somente documentacao local foi atualizada/criada. Nenhum plano, PITR, backup, storage, replica, WAL, banco, billing, codigo, migration, restore, deploy, ingestao ou RF-03B foi alterado/executado. Nenhum commit ou push foi realizado.

## Resultado

- RPO <=15 min: Supabase PITR 7d recomendado.
- RPO <=30 min: Supabase PITR 7d recomendado.
- RPO <=1 h: Pro + backup logico completo criptografado a cada 30 min, somente apos benchmark e restore PASS.
- Melhor relacao para fase atual controlada: candidato de 1 h, piso provider USD 25/mes + custos custom desconhecidos.
- Gate financeiro antes de operacao relevante/em escala: PITR 7d obrigatorio.
- Cost decision: READY; recovery ready: NO.
- RF-03A.2B: NO-GO; RF-03B: BLOCKED.

## Proximo Passo

O owner deve escolher entre implementar e testar a arquitetura temporaria de 1 h ou seguir diretamente para PITR. Qualquer escolha exige fase operacional e autorizacao separadas.
