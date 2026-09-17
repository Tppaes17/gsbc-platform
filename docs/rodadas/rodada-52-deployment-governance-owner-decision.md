# Rodada 52 - Deployment Governance: Decisão do Owner

Data: 2026-09-17

## Contexto

A Rodada 51 (RF-03A.2A/deployment governance audit) confirmou que `main` é a
Production Branch da Vercel com `autoAssignCustomDomains=true` e que o
GitHub `main` não tem branch protection — todo push em `main`, incluindo
commits só de documentação, promove automaticamente para produção e move o
alias público, sem uma ação humana de release separada (`ADR-REL-001`).

O relatório propôs Model B (desabilitar auto-assign de domínio produtivo,
depois proteger `main` no GitHub) como remediação, classificada como
`OWNER APPROVAL REQUIRED` — nenhuma configuração havia sido alterada.

## Decisão

Apresentei três opções ao owner (autorizar Model B completo, autorizar
apenas a parte de desabilitar auto-assign de domínio, ou não autorizar
nada agora). O owner escolheu explicitamente **manter o estado atual**:
push em `main` continua promovendo automaticamente para produção, sem
branch protection no GitHub. O owner pediu que essa decisão fosse
registrada como dele.

## Alterações

Nenhuma configuração do GitHub ou da Vercel foi alterada. Apenas
`docs/architecture/ADR-REL-001-production-deployment-governance.md` foi
atualizado: status mudou de `PROPOSED — OWNER APPROVAL REQUIRED` para
`DECLINED BY OWNER — CURRENT STATE RETAINED`, com uma seção "Owner
Decision" registrando a escolha, a data e que os findings P1/P2 do
relatório de governança permanecem factualmente abertos (risco aceito, não
remediado).

## Resultado

- Nenhum código de aplicação, migration, configuração Vercel/GitHub, alias,
  domínio, branch protection ou secret foi alterado.
- `docs/DEPLOYMENT_GOVERNANCE_HARDENING_REPORT.md` e `docs/release/*`
  permanecem como referência válida caso o owner reconsidere no futuro.
- Phase 2 (aplicar Model B) não está agendada.

## Próximo Passo

Nenhum — a governança de deploy permanece como está por decisão explícita
do owner. Retomar apenas se o owner pedir revisão.
