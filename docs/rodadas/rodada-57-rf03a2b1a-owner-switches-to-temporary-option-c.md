# Rodada 57 - RF-03A.2B.1A: Owner Troca Para Opção C Temporária

Data: 2026-09-17

## Contexto

A Rodada 56 (deep dive de RPO/custo) apresentou uma alternativa
condicional mais barata ao pacote Balanced/PITR já aprovado (Rodadas
54-55): Pro + backup lógico completo criptografado a cada 30 minutos
para storage independente, piso provider ~USD 25/mês, RPO<=1h *apenas*
após benchmark e restore drill isolado passarem — elegível somente numa
fase pré-receita/piloto controlado.

## Decisão

Perguntei diretamente se o GSBC já tem operação financeira real. O owner
confirmou que **o GSBC ainda está pré-receita/piloto controlado**.
Apresentei então a escolha entre manter PITR (~USD 130/mês, já aprovado)
ou trocar para a Opção C temporária (~USD 25/mês, condicional). O owner
**escolheu trocar para a Opção C temporária**.

## Alterações

- `docs/architecture/ADR-RF-016-backup-pitr-recovery.md`: status
  atualizado para `ACCEPTED — TEMPORARY OPTION C FOR PRE-REVENUE PHASE,
  PITR MANDATORY BEFORE LIVE FINANCIAL OPERATION`, com seção "Owner
  Decision" registrando a sequência completa (aprovação inicial do
  Balanced/PITR → reconciliação de custo → confirmação de fase
  pré-receita → troca para Opção C) e o gatilho obrigatório de migração
  para PITR antes de operação financeira real.
- `docs/architecture/ADR-RF-017-recovery-objectives.md`: status
  atualizado refletindo o alvo temporário RPO<=1h (RTO ainda UNKNOWN) e
  reafirmando RPO<=15min/RTO<=4h com PITR como obrigatório, não opcional,
  antes de qualquer operação financeira ao vivo.

## O Que Foi Decidido vs. O Que Falta

Decidido: a arquitetura-alvo imediata é Pro + backup lógico a cada 30
minutos, não PITR, enquanto o GSBC permanecer pré-receita.

Não decidido/não autorizado ainda: nenhuma implementação real (plano Pro,
automação de backup, destino de storage independente, credenciais),
nenhum benchmark ou restore drill foi executado, e o RPO de 1h continua
sendo tratado como alvo condicional, não capacidade comprovada.

## Resultado

- Nenhuma configuração Supabase, plano, backup, storage, código,
  migration ou infraestrutura foi alterada nesta rodada — apenas a
  decisão foi registrada nos ADRs.
- RF-03A.2B continua NO-GO até habilitação real (Opção C ou PITR) +
  benchmark + restore isolado bem-sucedido com RPO/RTO medidos.
- RF-03B: BLOCKED.

## Próximo Passo

Implementar e testar a Opção C (backup logico a cada 30 minutos, storage
independente, benchmark de duração, restore drill) como fase operacional
separada, com autorização explícita antes de qualquer ação paga/real. O
gatilho de migração obrigatória para PITR antes de operação financeira ao
vivo permanece registrado e deve ser monitorado.
