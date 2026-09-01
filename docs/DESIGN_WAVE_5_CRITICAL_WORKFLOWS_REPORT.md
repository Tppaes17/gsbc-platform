# GSBC Design Wave 5 Critical Workflows Report

## 1. Executive Result
Gate: WAVE 5 PASS WITH CONDITIONS. Fluxos críticos de pagamento manual, notificação externa, negociação e escalonamento passaram a exibir consequência antes da confirmação, sem alteração de banco, domínio, RLS ou Server Actions de negócio.

## 2. Inputs Reviewed
Foram revisados `CODEX_DESIGN_WAVE_5_CRITICAL_WORKFLOWS.md`, `docs/DESIGN_TRANSFORMATION_PLAN.md`, `docs/DESIGN_WAVE_4_ENTITY_WORKSPACES_REPORT.md`, `docs/DESIGN_DEBT_REGISTER.md`, componentes de diálogo e rotas de cobrança, negociação, conciliação e financeiro.

## 3. Critical Workflow Inventory
| Workflow | Entry | Actor | Current state | Mutation | External effect | Financial effect | Legal effect | Reversible? | Audit | Permission | Failure modes | Risk | Target |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Criação/aprovação/ativação de cobrança | `/backoffice/cobrancas/novo`, status action | GSBC | Form/status | Cria ou muda cobrança | Não direto | Sim | Não jurídico | Parcial | `cobranca_eventos`/audit | Staff | validação/status stale | L2 | Futuro |
| Envio/início de cobrança | `NotificacaoAction`, régua | GSBC | Ação na cobrança | Notificação/régua | Sim | Não baixa | Operacional | Não desfaz envio | Notificações/audit | Staff | envio falha/parcial | L2 | Referência |
| Suspensão/retomada | Régua/status | GSBC | Botões de régua | Pausa/retoma | Pausa automação | Não | Não | Sim | Eventos | Staff | reentrância | L2 | Futuro |
| Proposta/contraproposta | Negociação evento | GSBC | Dialog | Evento timeline | Não | Pode afetar valor negociado | Não | Evento posterior | Timeline | Staff | valor ausente | L2 | Referência |
| Aceite/acordo | Negociação evento/desconto | GSBC/Owner | Dialog | Acordo/status | Não | Muda referência de cobrança | Não quita | Evento posterior | Timeline/audit | Owner para desconto | aprovação pendente | L3 | Referência |
| Escalonamento | Cobrança escalonamento | GSBC/Jurídico | Dialogs | Estado escalonamento | Pode enviar | Não baixa | Aparência extrajudicial | Parcial | Eventos/envios | Staff/Jurídico | evidência insuficiente | L3 | Referência |
| Notificação extrajudicial | Escalonamento envio | GSBC/Jurídico | Dialog | Envio | Sim | Não | Externo sensível | Não desfaz envio | Envios/evidência | Staff/Jurídico | falha/sem evidência | L3 | Referência |
| Pagamento | Pagamento manual | GSBC | Dialog | Cria pagamento | Não PSP | Sim | Não quita juridicamente | Evento posterior | Pagamentos/audit | Staff | duplicidade/valor inválido | L3 | Referência |
| Conciliação/reprocessamento | `/backoffice/conciliacao` | GSBC | Form/button | RPC retry | Não | Sim | Não | Idempotente | Audit/divergência | Staff | erro persiste | L3 | Referência |
| Compensação/estorno | Conciliação | GSBC | Form | Evento compensatório | Provider ref | Sim | Não | Novo evento | Audit | Staff | repasse pago/falha | L3 | Referência |
| Portal | `/portal` | Contato | Login/link | Sessão/proposta | Não direto | Pode propor | Não | Sessão revogável | Auth/audit | Contato | enumeração | L2 | Futuro |
| Políticas | `/backoffice/politicas` | Staff | Leitura/runtime | Decisão policy | Não | Pode bloquear | Não | Versionado | Policy audit | Staff | fail-open | L3 | Existente |
| Usuários/permissões | `/backoffice/usuarios` | Owner | Invite | Convite/membership | E-mail | Não | Não | Revogável | Audit/auth | Owner | enumeração | L2 | Futuro |
| Bulk actions | Tabelas | Staff | Parcial | Não consolidado | Variável | Variável | Variável | Variável | Necessário | Staff | efeito em massa | L3 | Futuro |
| Documentos externos | Escalonamento/documentos | Staff/Jurídico | Dialog | Gera/anexa | Pode circular | Não | Sensível | Versionado | Documento/audit | Staff/Jurídico | template/evidência | L3 | Referência |

## 4. Risk Classification
L0: navegação/leitura. L1: edição reversível. L2: ação operacional com comunicação, estado ou permissão relevante. L3: efeito financeiro, externo, jurídico aparente, compensatório ou privilegiado.

## 5. Reference Workflows
Referências implementadas/testadas: notificação de cobrança, pagamento manual, movimento de negociação, decisão de desconto, escalonamento/documento/envio, reprocessamento de conciliação e evento compensatório.

## 6. Workflow Constitution
Foi criado `ActionConsequencePanel` para padronizar contexto de consequência sem mudar as regras de servidor.

## 7. Consequence Preview
Todos os fluxos tocados exibem antes da ação: efeito, não efeito, reversibilidade/falha e auditoria.

## 8. Confirmation
Botões diretos de documento e envio extrajudicial viraram diálogos com confirmação explícita.

## 9. Destructive Actions
Não houve novas ações destrutivas. Cancelamentos existentes permanecem em `ConfirmationDialog`; Wave futura deve migrá-los para o mesmo padrão.

## 10. External Communication
Notificação comum e extrajudicial agora deixam claro que o envio externo não pode ser desfeito e que falha não avança status.

## 11. Cobrança/Escalation
`EscalonamentoSection` passou a separar revisão, aprovação, documento, envio e resultado.

## 12. Suspension/Resume
Régua de cobrança foi inventariada, mas não foi reestruturada nesta onda; risco residual D2.

## 13. Negotiation Proposal
`EventoForm` explicita que proposta/contraproposta entram na timeline e não firmam acordo por si.

## 14. Counterproposal
Contraproposta preserva a distinção entre valor proposto e efeito financeiro final.

## 15. Acceptance/Agreement
Aceite informa que pode depender de aprovação de desconto antes de virar acordo firmado.

## 16. Agreement vs Payment
Decisão de desconto e movimento de negociação agora dizem explicitamente que acordo não é pagamento, baixa, repasse ou quitação.

## 17. Payment/Reconciliation
Pagamento manual mostra que cria evento manual, não confirmação PSP. Conciliação mostra retry/idempotência e evento compensatório posterior.

## 18. Partial Failure
Falhas de envio e reprocessamento preservam estado operacional sem avanço silencioso, com mensagem de falha no preview.

## 19. Retry/Idempotency
`RetryReconciliationButton` agora expõe que retry não deve duplicar pagamento, split ou baixa; E2E de conciliação continua cobrindo o comportamento.

## 20. Pending/Async
Botões usam `isPending`/disabled existentes. Nenhum novo fluxo assíncrono foi criado.

## 21. Success
Toasts e fechamento de diálogo foram preservados; labels de confirmação ficaram mais específicos.

## 22. Error
Mensagens `role="alert"` foram preservadas nos formulários tocados.

## 23. Audit Consequence
Cada painel informa qual evidência entra no histórico: tentativa, evento, decisão, documento, valor ou referência externa.

## 24. Authority/Delegation
Escalonamento evidencia papel Jurídico; desconto reforça decisão humana e ausência de autoridade de IA.

## 25. Step-up/MFA
Runtime de política já testa MFA para ação financeira crítica; UI de step-up não foi implementada nesta onda. Condição de PASS.

## 26. Double Approval
Aprovação jurídica existe no escalonamento; maker-checker genérico não foi implementado. Condição de PASS.

## 27. AI Boundaries
Textos preservam que IA não decide desconto nem executa ato crítico.

## 28. Bulk Actions
Bulk actions continuam fora do escopo implementado; devem entrar em Wave futura antes de qualquer efeito em massa.

## 29. CNPJ-first Assessment
Não houve alteração em dossiê cadastral ou CNPJ-first flows.

## 30. Workflow Primitives
Novo primitivo: `src/components/design-system/action-consequence-panel.tsx`.

## 31. Modal/Drawer/Page Decisions
Foram mantidos dialogs para ações rápidas e críticas contextualizadas; nenhum fluxo virou página nova.

## 32. Workspace Integration
Fluxos continuam dentro dos Entity Workspaces de Cobrança e Negociação, sem perder contexto.

## 33. Central Operational Integration
Sem alteração na Central Operacional; inventário indica integração futura para filas de approval.

## 34. Permissions
Testes confirmam sindicato sem ações críticas privilegiadas na cobrança e sem acesso à conciliação.

## 35. Tenant Isolation
Suíte completa preservou RLS/tenant isolation com `phase0-security` e `rls-visibility`.

## 36. Security UX
A UI agora não oferece botão crítico para ator sem permissão e não apresenta confirmação ambígua em ações L2/L3 tocadas.

## 37. Accessibility
Diálogos mantêm `DialogTitle`, `DialogDescription`, labels de campos e alertas de erro. Visual QA validou viewport.

## 38. Mobile
Diálogos críticos receberam `max-h-[90dvh] overflow-y-auto`; visual QA passou em 375px e 320px.

## 39. Failure Injection
Testes de escalonamento continuam cobrindo falha de envio e bloqueio por evidência obrigatória.

## 40. Stale State
Não foi implementada detecção nova de stale state na UI; mitigação atual vem de Server Actions/RPCs e revalidação.

## 41. Optimistic UI
Nenhum optimistic update foi adicionado.

## 42. Auditability Test
E2E de escalonamento, conciliação, audit e webhook seguem verdes na suíte completa.

## 43. Reversibility Test
Reversibilidade foi explicitada como evento posterior auditável; não houve edição retroativa de histórico.

## 44. Language Test
Linguagem visível separa cobrança, obrigação, acordo, pagamento, baixa, PSP, repasse, quitação, entrega válida e evidência.

## 45. Legal/Financial Semantic Test
Testes de pagamento negociado, conciliação e escalonamento garantem que acordo e pagamento não são tratados como sinônimos.

## 46. Critical Action 20-Second Test
Operador vê consequência, não efeito e botão específico sem precisar entender implementação.

## 47. Wrong-Action Prevention Test
Botões diretos de documento/envio foram convertidos em revisão antes da ação; ações privilegiadas ausentes para sindicato.

## 48. Friction Test
Fricção foi adicionada apenas em L2/L3; leitura e navegação não receberam etapas extras.

## 49. Visual Premium Test
Capturas geradas em `test-results/design-wave-5-critical-workflows/`; 4/4 checks de viewport passaram.

## 50. Technical Changes
Arquivos alterados: novo `ActionConsequencePanel`; diálogos/forms de notificação, pagamento, negociação, escalonamento e conciliação; specs E2E focadas e visuais.

## 51. Tests
`npx tsc --noEmit`: passed. `npm run lint`: passed com 1 warning conhecido em `data-table.tsx`. Focados: 29/29. Visual: 4/4.

## 52. Full E2E
`npm run test:e2e`: 112/112 passed.

## 53. Visual QA
Screenshots: `desktop-payment-review.png`, `mobile-375-notification-review.png`, `mobile-320-negotiation-review.png`, `mobile-375-forbidden-critical-actions.png`.

## 54. Design Debt
Novas dívidas registradas: MFA/step-up UI, maker-checker genérico, bulk critical workflows e stale-state UX.

## 55. Regressions
Nenhuma regressão confirmada após suíte completa. Falhas intermediárias foram corrigidas antes do gate.

## 56. New Findings
Dialog crítico sem `max-h` pode cortar botão em mobile quando adiciona preview; corrigido nos fluxos tocados.

## 57. Remaining Risks
Riscos restantes: MFA UI, double approval genérico, stale-state UX, régua pause/resume ainda em `ConfirmationDialog`, bulk actions sem padrão crítico.

## 58. Wave 6 Readiness
Wave 6 pode iniciar depois de aceitar as condições acima como dívida documentada. Não iniciar automaticamente.

## 59. Gate Assessment
PASS WITH CONDITIONS porque full E2E está verde e 3+ fluxos críticos foram implementados, mas step-up/MFA e maker-checker não foram transformados em experiência completa.

## 60. Final Decision
WAVE 5 PASS WITH CONDITIONS. Produto está mais seguro para ações críticas L2/L3 sem alteração de domínio, migrations ou permissões.
