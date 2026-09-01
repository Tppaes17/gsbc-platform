# GSBC Design Wave 4 — Entity Workspaces Report

## 1. Executive Result
Wave 4 executada. Empresa deixou de ser apenas dossiê vertical e passou a usar `Entity Workspace` com header, overview, relações, navegação local, summary strip, seções ancoradas e timeline contextual. Cobrança foi migrada como segunda entidade de referência. Gate: `WAVE 4 PASS`.

## 2. Gate History Correction
Registrado sem apagar histórico: Wave 2.1 Human Visual Gate `APPROVED`; Wave 3 Technical Gate `PASS`; Wave 3 Operational Gate `PASS`; Wave 3 Visual Gate `APPROVED`; Wave 3 Final Gate `WAVE 3 PASS`; `D0-001` permanece `RESOLVED`; Wave 4 ficou `UNBLOCKED`.

## 3. Inputs Reviewed
Foram revisados o artefato Wave 4, `AGENTS.md`, relatórios Design Waves 0–3, `DESIGN_PREMIUM_AUDIT.md`, `DESIGN_TRANSFORMATION_PLAN.md`, `DESIGN_DEBT_REGISTER.md`, `PRODUCT.md`, `DOMAIN_RULES.md`, `ARCHITECTURE.md`, `SECURITY.md`, `MULTITENANCY.md`, `STG_10_INVARIANTS.md`, páginas atuais de Empresa/Cobrança/Instrumento/Negociação/Operação e E2E relacionados.

## 4. Detail Page Inventory
Inventário: Empresa, Cobrança, Instrumento, Negociação, Sindicato, Prospecto e portal de cobrança usam rotas `[id]`. Empresa era a página mais conectada e foi escolhida como referência; Cobrança foi escolhida como segunda entidade por cobrir obrigação, valor, pagamento, negociação, contestação e escalonamento.

## 5. Relationship Map
Modelo preservado: Empresa → Instrumento → Obrigação → Cobrança → Negociação → Pagamento. O workspace evita sugerir que oportunidade é cobertura, obrigação é dívida, cobrança é dívida confirmada, negociação é pagamento ou valor identificado é recebido.

## 6. Workspace Constitution
Constituição adotada: identidade persistente no header, overview primeiro, navegação local por âncoras, blocos relacionais compactos, seções por domínio e ações próximas do contexto. Não houve alteração de rota, schema, RLS ou domínio.

## 7. Navigation Decision
Escolha: navegação local híbrida por âncoras, não tabs. Justificativa: mantém URL atual, suporta deep link/hash, browser back/forward, refresh, mobile wrap e evita esconder informação crítica em abas horizontais impraticáveis.

## 8. Empresa Before
Antes, `src/app/backoffice/empresas/[id]/page.tsx` empilhava `DetailHeader`, formulário, inteligência cadastral, contatos, obrigações, cobranças, negociações, financeiro, documentos e timeline. O usuário precisava rolar por várias telas sem uma visão contextual de relações.

## 9. Empresa Workspace Architecture
Empresa agora usa `EntityWorkspace`, `EntityWorkspaceNav`, `EntityWorkspaceSection`, `EntitySummaryStrip` e `EntityRelationshipSection`. A página abre com contexto da empresa, sindicato, segmento, CNPJ, relação operacional, atenção pendente e indicadores compactos.

## 10. Workspace Header
O header responde quem é a empresa, razão social, sindicato, status e CNPJ. Ações e edição ficam separadas das informações de leitura.

## 11. Overview
Overview mostra relação operacional, contexto sindical, segmento, CNPJ, atenção real quando houver cobrança vencida com saldo, obrigações, cobranças, pago e exposição. Não foi criado mini Command Center.

## 12. Compliance
Compliance agrupa inteligência cadastral e obrigações. A distinção Instrumento/Obrigação foi preservada; nenhuma obrigação virou cobrança implicitamente.

## 13. Receita
Receita agrupa cobranças e negociações. O nome da empresa deixa de ser repetido como contexto principal dentro da própria empresa; a obrigação passa a ser o eixo informacional.

## 14. Financeiro
Financeiro exibe total cobrado, total pago, saldo em aberto e vencidas apenas a partir dos dados já existentes. O cálculo do saldo permanece contra valor de referência negociado quando aplicável.

## 15. Contatos
Contatos mantém nome, cargo, e-mail, telefone, status de portal e ação autorizada. O layout foi ajustado para não cortar botão em 768/375/320.

## 16. Documentos
Documentos permanece como seção autorizada e sem DMS novo. Empty state foi validado por screenshot.

## 17. Histórico
Histórico preserva timeline consolidada, mas com labels mais contextuais: `Cobrança: status`, `Pagamento registrado`, `Obrigação cadastrada` e negociação com valor/obrigação em descrição.

## 18. Context-Aware Presentation
Dentro de Empresa, eventos não repetem a empresa em toda linha. Em Cobrança, overview destaca empresa, obrigação de origem, sindicato e valor de referência sem tratar cobrança como dívida confirmada além do status.

## 19. Timeline Refinement
Timeline de Empresa foi refinada para business labels, objeto relacionado na descrição, ator quando existe, valor quando existe e data/hora já preservada pelo componente `Timeline`.

## 20. Edit/View Separation
Cadastro foi movido para seção própria. Usuários sem permissão continuam com leitura/estado `readOnly`; ações de escrita seguem restritas por permissões existentes.

## 21. Intelligence Empty State
`W4-ENT-001` resolvido: `EmptyState` ganhou `density="compact"` e Inteligência Cadastral deixou de ocupar uma grande parte da viewport quando não há consulta/evidência.

## 22. Infrastructure Language Cleanup
`W4-ENT-002` tratado nas áreas tocadas: removidos `LEADCNPJ_API_KEY`, `Fase 2`, `STG-*`, `cron`, `Policy Engine` e rótulos de provider da UI operacional. Onde a integração não existe, a tela diz que o recurso ainda não está disponível ou está em ambiente de teste.

## 23. Central Operacional Limited Refinement
`W4-OPS-001` resolvido: três KPI cards equivalentes viraram status strip compacto; empty state foi reduzido; `cron`/`STG-03` saiu da descrição; linhas priorizam prioridade, tipo, ação, prazo e responsável.

## 24. Entity Workspace Primitives
Primitives criados: `EntityWorkspace`, `EntityWorkspaceNav`, `EntitySummaryStrip`, `EntityWorkspaceSection`, `EntityRelationshipSection`, `EntityEmptyState`. `DetailHeader`, `StatusBadge`, `Timeline`, `EmptyState` e componentes existentes foram mantidos.

## 25. Second Reference Entity
Cobrança foi a segunda entidade. Ela agora possui overview, relação operacional, próxima ação, summary financeiro, navegação local e seções ancoradas para cadastro, financeiro, cobrança digital, régua, contestação, escalonamento, notificações, copilot e histórico.

## 26. Action Hierarchy
Ações foram organizadas por contexto: mudança de status no header, negociação/notificação no overview, pagamento em Financeiro, cobrança digital em seção própria, régua/escalonamento/contestação em suas áreas. Sem redesign de ações críticas da Wave 5.

## 27. Permissions
Permissões preservadas. Staff vê ações operacionais; sindicato não vê status action, registro de pagamento, cobrança digital, régua ou copilot. Inteligência cadastral permanece Owner-only.

## 28. Tenant Isolation
Nenhuma query ou policy foi relaxada. `e2e/rls-visibility.spec.ts` e `e2e/phase0-security.spec.ts` passaram dentro da suíte completa.

## 29. Performance
Não foi adicionada dependência pesada. A fundação usa server components, componentes leves e as queries já existentes. Risco residual: Empresa ainda busca várias relações em paralelo no carregamento inicial.

## 30. Progressive Loading
Não foi implementado lazy/progressive loading real nesta onda para evitar mudança estrutural de data fetching. A ordem visual prioriza contexto crítico mesmo com as mesmas queries.

## 31. Accessibility
Navegação local tem `nav aria-label`, anchors focáveis, headings por seção, links/botões reais, disclosures nativos existentes e status com texto. Gate automatizado de acessibilidade ainda é dívida.

## 32. Responsive
Validado em 1920, 1440, 1024, 768, 375 e 320. A navegação local deixou de rolar horizontalmente e passa a quebrar linha em mobile.

## 33. 320px Validation
Empresa e Cobrança foram validadas em 320px com `mainOverflow: 0`, `clippedElements: 0` e 0 erros de console no manifesto visual final.

## 34. Realistic Stress Test
Testados: nome real de empresa, contato com ação de portal, obrigações, cobranças, negociação, pagamentos, documentos vazios, timeline longa, role parcial e seções sem dados.

## 35. Context 15-Second Test
Passou tecnicamente: em 15s a primeira dobra da Empresa responde identidade, status, CNPJ, sindicato, cobrança/exposição e atenção pendente.

## 36. Navigation Test
Passou tecnicamente: Empresa → Financeiro → Histórico → Compliance → Overview via hash sem perder identidade, sem mudar routing e sem tabs horizontais.

## 37. Mobile Workspace Test
Passou tecnicamente: em 375px e 320px a entidade, status, contexto crítico, navegação local, financeiro e histórico são acessíveis sem zoom/overflow.

## 38. Information Reduction Test
Scroll full-page ainda existe por volume real, mas a informação útil por viewport aumentou: overview, summary strip e navegação local reduzem ida e volta e repetição de contexto.

## 39. Workspace Premium Test
Passou tecnicamente: a Empresa se comporta como entidade operacional com relações e contexto, não apenas formulário seguido de seções. O julgamento visual final continua humano.

## 40. Technical Changes
Arquivos principais alterados/criados: `src/components/design-system/entity-workspace.tsx`, `src/components/design-system/empty-state.tsx`, Empresa detail, Cobrança detail, Central Operacional, contatos, dossiê cadastral, cobrança digital, régua, contestação/escalonamento, conciliação, contratos, negociação, prospectos e E2E.

## 41. Tests
Executados: `npx tsc --noEmit`, `npm run lint`, suíte focada de 24 testes, `npx playwright test e2e/entity-workspaces.spec.ts`, reexecução das falhas isoladas e `npm run test:e2e`.

## 42. Full E2E
Resultado final: `104 passed`. Antes do verde final houve falhas por locators/microcopy e massa acumulada em listas; foram corrigidas e reexecutadas.

## 43. Visual QA
Evidência em `test-results/design-wave-4-entity-workspaces`. Foram geradas 19 capturas: Empresa overview/compliance/receita/financeiro/histórico/mobile/partial access/empty state, Cobrança desktop/mobile e Central Operacional desktop/mobile. Manifesto final: 19/19 válidas.

## 44. Design Debt
Atualizado `docs/DESIGN_DEBT_REGISTER.md`: `W4-ENT-001` resolvido, `W4-OPS-001` resolvido, `W4-ENT-002` parcial por haver linguagem técnica residual fora das superfícies tocadas, `W4-ENT-003` parcial porque nem todas as detail pages foram migradas.

## 45. Regressions
Nenhuma regressão crítica confirmada. Financeiro, provider, contratos, conciliação, promoção de prospecto, RLS, service role, audit, webhook e portal passaram na suíte completa.

## 46. New Findings
Novos achados: Empresa ainda carrega muitas relações de uma vez; algumas entidades detail continuam no padrão antigo; conciliação/contratos ainda podem receber vocabulário mais orientado ao usuário; screenshots full-page revelam páginas longas apesar da navegação local.

## 47. Remaining Risks
Riscos restantes: propagação incompleta para Instrumento/Negociação/Sindicato/Prospecto; ausência de a11y automatizado; progressive loading real ainda não implementado; linguagem técnica residual em áreas não tocadas e comentários/testes.

## 48. Wave 5 Readiness
Foundation está estável; Empresa passou; Cobrança provou generalização; mobile passou; permissions/RLS passaram; ações críticas foram identificadas. Wave 5 deve tratar confirmação, impacto, destructive/privileged actions e falhas parciais em negociação, pagamento, régua, escalonamento e portal. Não há D0 estrutural aberto.

## 49. Gate Assessment
Critérios PASS cumpridos: Empresa não é mais apenas dossier vertical, contexto persistente existe, local nav funciona, overview responde questões suportadas, relações não confundem estados, timeline ficou mais contextual, linguagem técnica foi removida das superfícies operacionais tocadas, mobile 375/320 passou, permissões/RLS preservadas, segunda entidade implementada, Central Operacional refinada, E2E completo verde e Wave 5 não precisa reabrir a fundação.

## 50. Final Decision
`WAVE 4 PASS`

Não houve commit, push, merge, deploy, migration ou alteração de banco. Wave 5 não foi iniciada.
