# GSBC Design Transformation Plan

Data: 2026-08-31  
Modo: Design Architecture / Implementation Planning  
Base obrigatória: `docs/DESIGN_PREMIUM_AUDIT.md`  
Artefato complementar: `docs/DESIGN_DEBT_REGISTER.md`

Esta rodada não implementa redesign, não altera rotas, componentes, domínio, migrations, RLS, APIs, workflows, dependências ou estilos. O objetivo é converter o audit em plano executável, com gates e dependências claras.

## 1. Executive Summary

O GSBC deve evoluir de backoffice administrativo para plataforma enterprise de comando, decisão e operação. A tese de design é: **Institutional Authority + Financial Intelligence + Enterprise Operations**.

O audit identificou dois riscos D0: mobile operacional inadequado para tabelas críticas e dashboard inicial sem comportamento de cockpit executivo. A sequência recomendada preserva o produto existente e faz a transformação por ondas: primeiro direção e linguagem, depois shell, depois Executive Command Center como referência aprovada. Após Wave 2 há STOP Gate obrigatório.

## 2. Design Thesis

O design premium do GSBC não é decoração. Ele precisa tornar receita, risco, compliance, autoridade, rastreabilidade e próxima decisão mais evidentes.

Princípios:
- Decision before decoration.
- Hierarchy before quantity.
- Cards are not layout.
- Data density is a feature.
- Progressive disclosure.
- Risk must be visible.
- Money needs context.
- Mobile has a different job.
- Accessibility is architecture.
- One product language.

## 3. Current-State Constraints

- Produto é SaaS B2B premium, multi-tenant, tenant-scoped por padrão.
- RLS, autorização server-side e fail-closed são requisitos não negociáveis.
- Empresas não são tenants no escopo inicial; são objetos de enquadramento, cobrança e relacionamento.
- UI não pode vazar dados por busca, autocomplete, counts, labels, tooltips ou estados visuais.
- IA nunca publica regra, altera obrigação, concede desconto, usa crédito, decide prescrição ou executa ato crítico sem autoridade humana aplicável.
- Operações financeiras exigem idempotência, trilha de auditoria e preservação histórica.
- Website futuro não pode inventar métricas, integrações, certificações ou resultados.

## 4. Target Product Experience

O produto-alvo deve permitir:
- Executivo compreender resultado, tendência, risco e decisão em aproximadamente 10 segundos.
- Operador priorizar fila por impacto, SLA, risco e próxima ação.
- Financeiro identificar exceções, conciliar com segurança e rastrear eventos.
- Jurídico/compliance distinguir fato, evidência, inferência, recomendação e decisão humana.
- Admin/owner operar permissões, políticas e auditoria com clareza fail-closed.
- Tenant enxergar valor sem exposição cruzada de dados.

## 5. Information Architecture

IA alvo validada contra rotas reais:

| Área | Itens reais | FUTURE |
|---|---|---|
| Visão Geral | Executive Command Center (`/backoffice`) | Board pack executivo |
| Receita | Receita, Oportunidades/Prospectos, Cobranças, Negociações, Escalonamentos | Forecast avançado, metas operacionais |
| Compliance | Empresas, Instrumentos, Contestações | Enquadramentos, Obrigações como navegação própria |
| Financeiro | Financeiro, Conciliação, Contratos Financeiros | Pagamentos dedicados, Repasses, Créditos |
| Operação | Central Operacional | Tarefas, SLA, Exceções dedicadas |
| Governança | Políticas, Usuários, Auditoria | Autoridades/Delegações, Segurança |

Busca/command transversal deve ser permission-aware, tenant-scoped e fail-closed. Resultados não autorizados não podem vazar por count, sugestão, título, autocomplete ou metadata.

## 6. Visual Direction

A linguagem visual alvo deve transmitir autoridade institucional, inteligência financeira e operação enterprise.

Direção:
- Superfícies mais intencionais, menos cards equivalentes.
- Primeira dobra de dashboards orientada a decisão.
- Densidade progressiva: resumo executivo acima, detalhe operacional abaixo.
- Status financeiros e riscos com semântica forte.
- Gráficos usados apenas quando respondem pergunta real.
- Website mais platform-first, após estabilização do app autenticado.

Evitar ERP antigo, sistema governamental, admin template, fintech consumer, dashboard decorativo, glassmorphism, gradientes gratuitos e sombras excessivas.

## 7. Typography

Separar tipografia de website e produto:
- Website: mais expressivo, institucional e comercial.
- Produto: compacto, analítico e operacional.

Regras alvo:
- Numerais tabulares em dinheiro, KPIs, percentuais e tabelas.
- Headings contidos dentro do app.
- Labels e metadata com alta legibilidade.
- Valores financeiros alinhados e contextualizados.
- Long content testado com nomes extensos de sindicatos, empresas, CNPJs e instrumentos.

## 8. Color & Semantics

Preservar navy como autoridade/estrutura, teal como progresso/performance, gold raro para insight/destaque, amber para atenção e red para risco real.

Cor nunca pode ser único sinal. Todo status deve ter label textual, contraste adequado e, quando crítico, explicação contextual.

Semânticas necessárias:
- Risk: baixo, médio, alto, crítico, bloqueado.
- Financial: previsto, cobrado, recebido, conciliado, parcial, estornado, não identificado.
- SLA: no prazo, em atenção, próximo do vencimento, violado.
- Policy: permitido, requer confirmação, requer checker, vetado, em revisão.

## 9. Density & Spacing

Definir três densidades:
- Compact: operadores avançados, filas e grids.
- Default: páginas administrativas e navegação.
- Comfortable: website, onboarding e leitura longa.

Cards não devem ser usados como layout padrão. Seções podem ser faixas, painéis funcionais ou workspaces; cards ficam para itens repetidos, resumos ou entidades.

## 10. Application Shell

Wave 1 deve redesenhar arquitetura do shell sem criar navegação vazia:
- Sidebar agrupada por domínio.
- Itens FUTURE não entram na navegação até existirem.
- Badges apenas para pendências reais calculadas com permissão.
- Topbar com tenant/contexto, command search, notificações/decisões e usuário.
- Page header com breadcrumb, título, descrição curta, status, ação primária, secundárias e metadata.
- Mobile shell com atalhos e busca, não apenas lista longa.

## 11. Executive Command Center

`/backoffice` será a reference implementation da nova linguagem.

Zone A — Executive Pulse:
- Um KPI primário.
- KPIs secundários hierarquizados.
- Período e comparação.
- Tendência e estado.
- Sem grade de sete cards equivalentes.

Zone B — Performance & Risk:
- Onde perdemos receita.
- Se risco aumentou.
- Qual etapa deteriorou.
- Onde há concentração.
- Onde há atraso.

Zone C — Decision Queue:
- Problema.
- Impacto quando houver dado real.
- Urgência.
- Owner.
- SLA.
- Próxima ação.

Zone D — Executive Intelligence:
- Inicialmente determinística.
- Thresholds, comparações, anomalias explicáveis e tendências.
- IA futura sempre explicável e sem falsa certeza.

## 12. Data Visualization

Todo gráfico deve declarar:
1. pergunta;
2. métrica;
3. período;
4. comparação;
5. threshold/meta;
6. drilldown;
7. empty state;
8. representação acessível.

Padrões necessários:
- Trend: evolução temporal com comparação.
- Comparison: meta vs projetado vs cobrado vs recebido.
- Target: progresso contra meta.
- Composition: composição por status, domínio ou carteira.
- Aging: faixas de vencimento e risco.
- Funnel: potencial, qualificado, constituído, cobrado, negociado, recebido.
- Concentration: maiores empresas/CNPJs/obrigações com impacto.
- Variance: mudança vs período anterior.
- Forecast: bruto, ponderado e gap.

## 13. Enterprise Data Grid

Capacidades por tier, aplicadas conforme criticidade:
- Sticky header.
- Pinned columns.
- Sorting.
- Advanced filters.
- Saved views.
- Density.
- Pagination.
- Bulk selection/actions controladas.
- Export permission.
- Row actions.
- Status/SLA/risk.
- Keyboard navigation.
- Loading/error/empty/filtered empty.
- Responsive fallback.

Nem toda tabela precisa de todas as capacidades. Cobranças, financeiro, conciliação, negociações, contestações e operações são candidatas prioritárias.

## 14. Mobile Operational Pattern

Para entidades operacionais, mobile deve usar row card:
- Identidade.
- Valor.
- Estado.
- SLA.
- Risco.
- Metadata mínima.
- Ação primária.
- Overflow actions.

Ação crítica não pode depender de scroll horizontal. Mobile serve principalmente para triagem, aprovação, consulta rápida, alerta e próxima ação.

## 15. Entity Workspace

Shell comum:
- Header: identidade, status, valor/risco, owner e ações.
- Summary: métricas, bloqueios e próxima ação.
- Tabs: overview, activity, financial, documents, relationships, audit.
- Context Panel: decisão, risco, SLA e política quando necessário.

Prioridades de aplicação futura: cobrança, empresa, obrigação, negociação, contestação, pagamento e instrumento.

## 16. Critical Workflow Pattern

Padrão obrigatório:

**Context → Impact → Policy → Confirmation → Result → Audit**

Antes da ação:
- entidade;
- impacto financeiro, se existir dado real;
- política aplicada;
- reversibilidade;
- autoridade necessária;
- MFA/maker-checker quando aplicável;
- auditoria que será criada.

Depois da ação:
- resultado;
- identificador;
- próximo estado;
- próximos passos;
- evento de auditoria.

## 17. States

Padronizar:
- loading;
- skeleton;
- empty;
- filtered empty;
- error;
- partial error;
- permission denied;
- stale;
- processing;
- success;
- blocked.

Estados críticos devem explicar causa, consequência e próxima ação. `Permission denied` não pode revelar existência de objeto não autorizado.

## 18. Accessibility

Gate WCAG AA:
- contraste;
- teclado;
- foco visível;
- heading structure;
- landmarks;
- dialogs;
- forms;
- tables;
- charts;
- icon buttons;
- responsive.

Automação futura recomendada: axe ou equivalente, com Playwright em rotas críticas.

## 19. Website Direction

Website só deve ser redesenhado após estabilizar a identidade do app autenticado.

Direção:
- Hero = plataforma + problema + resultado.
- Produto real na primeira dobra.
- Fluxo: identificar → estruturar → cobrar → negociar → conciliar → governar.
- Segurança, auditoria, governança e integrações.
- Casos de uso por persona.
- CTA claro para demonstração/diagnóstico.

Não inventar métricas, certificações ou integrações.

## 20. Component Inventory

| Component | Current role | Decision | Target role | Wave | Risk |
|---|---|---|---|---|---|
| `SidebarNav` | Lista plana permission-aware | EVOLVE | Navegação agrupada, role-aware e com badges reais | Wave 1 | Vazamento por badges/counts |
| `MobileSidebar` | Drawer mobile da navegação | EVOLVE | Mobile shell com busca e atalhos | Wave 1 | Lista longa em tela estreita |
| `PageHeader` | Cabeçalho genérico | EVOLVE | Breadcrumb, status, ação primária, metadata | Wave 1 | Inconsistência entre rotas |
| `DetailHeader` | Cabeçalho de detalhe | EVOLVE | Header de Entity Workspace | Wave 4 | Crescimento orgânico de detalhes |
| `MetricCard` | KPI card genérico | EVOLVE | `ExecutiveKpi` com hierarquia e tendência | Wave 2 | Cards equivalentes |
| `DataTable` | Tabela com busca/sort/paginação | REPLACE / EVOLVE | Enterprise Data Grid por tier | Wave 3 | Regressão em tabelas existentes |
| `TableToolbar` | Busca e ações simples | EVOLVE | Filtros, views, density, export autorizada | Wave 3 | Ações sem permissão granular |
| `StatusBadge` | Badge de status | EVOLVE | Linguagem única de status, risco, SLA e financeiro | Wave 0 | Cor como único sinal |
| `FinancialSummary` | Resumo financeiro | EVOLVE | Finance summary com contexto, variação e explicação | Wave 2 / 3 | Falta de memória de cálculo |
| `RiskPanel` | Painel de risco | EVOLVE | Decision/risk panel com thresholds explicáveis | Wave 2 / 4 | Falsa certeza |
| `Timeline` | Histórico visual | EVOLVE | Audit timeline com visibilidade e retificações | Wave 4 | Confundir comentário com evento |
| `EmptyState` | Estado vazio reutilizável | EVOLVE | Empty/filtered/permission/domain states | Wave 0 | Estados genéricos demais |
| `ConfirmationDialog` | Confirmações genéricas | EVOLVE | Parte do critical workflow pattern | Wave 5 | Confirmação sem impacto/política |
| `CriticalActionDialog` | Ações críticas | EVOLVE | Context → Impact → Policy → Confirmation | Wave 5 | Autoridade/MFA omitidos |
| `FutureModulePlaceholder` | Placeholder explícito | KEEP | Sinalização de FUTURE sem falsa feature | All | Virar navegação vazia |
| `SiteHeader` | Navegação do website | EVOLVE | Platform-first e CTA mais claro | Wave 6 | Website desalinhado do app |
| Site UI components | Cards/sections institucionais | EVOLVE | Provas de produto, trust e fluxo de valor | Wave 6 | Marketing sem evidência |
| `ExecutiveKpi` | Inexistente | NEW | KPI hierárquico com contexto | Wave 2 | Inventar comparação ausente |
| `DecisionQueue` | Inexistente | NEW | Fila executiva por impacto/urgência | Wave 2 | Inventar impacto financeiro |
| `MobileRowCard` | Inexistente | NEW | Fallback mobile operacional | Wave 3 | Perder ações críticas |
| `EntityWorkspace` | Inexistente | NEW | Shell comum de detalhe | Wave 4 | Refactor amplo |
| `ChartFrame` | Inexistente | NEW | Contrato de pergunta/métrica/meta/drilldown | Wave 2 / 3 | Chartjunk |

## 21. Route Inventory

| Route | Persona | Criticality | Current pattern | Target pattern | Wave |
|---|---|---|---|---|---|
| `/backoffice` | Executivo, staff, tenant | Critical | Home com cards e eventos | Executive Command Center | Wave 2 |
| `/backoffice/receita` | Executivo, financeiro, staff | Critical | KPIs, funil, trend, segmentação | Performance/Risk analytics | Wave 2 / 3 |
| `/backoffice/operacoes` | Operação GSBC | Critical | Central operacional | Queue com SLA, risco e owner | Wave 3 |
| `/backoffice/cobrancas` | Cobrança, financeiro | Critical | DataTable | Enterprise Data Grid + mobile row cards | Wave 3 |
| `/backoffice/cobrancas/[id]` | Cobrança, jurídico | Critical | Dossiê vertical | Entity Workspace | Wave 4 |
| `/backoffice/negociacoes` | Negociação | Critical | Lista/tabela | Enterprise Data Grid + policy context | Wave 3 |
| `/backoffice/negociacoes/[id]` | Negociação, autoridade | Critical | Detalhe com ações | Entity Workspace + critical workflow | Wave 4 / 5 |
| `/backoffice/contestacoes` | Atendimento, jurídico | Critical | Lista/tabela | Queue com decisão e segregação | Wave 3 |
| `/backoffice/escalonamentos` | Jurídico, entidade | Critical | Lista/tabela | Decision queue jurídica | Wave 3 / 5 |
| `/backoffice/financeiro` | Financeiro | Critical | Financeiro operacional | Grid financeiro + exceções | Wave 3 |
| `/backoffice/conciliacao` | Financeiro GSBC | Critical | Conciliação | Workspace de exceções e idempotência | Wave 3 / 5 |
| `/backoffice/contratos-financeiros` | Staff financeiro | High | Gestão contratual | Grid + effective dating/contexto | Wave 3 / 4 |
| `/backoffice/empresas` | Compliance, operação | High | DataTable | Registry grid + risco/cobertura | Wave 3 |
| `/backoffice/empresas/[id]` | Compliance, financeiro | High | Dossiê/seções | Entity Workspace | Wave 4 |
| `/backoffice/prospectos` | Owner/staff | High | Lista e inteligência | Opportunity workspace/list | Wave 3 / 4 |
| `/backoffice/prospectos/[id]` | Owner/staff | High | Detalhe com oportunidade | Entity Workspace | Wave 4 |
| `/backoffice/instrumentos` | Compliance | High | Lista | Grid com estado/versionamento | Wave 3 |
| `/backoffice/instrumentos/[id]` | Compliance, jurídico | High | Detalhe/seções | Entity Workspace normativo | Wave 4 |
| `/backoffice/sindicatos` | Admin, staff | High | Cadastro/lista | Registry grid | Wave 3 |
| `/backoffice/sindicatos/[id]` | Admin, staff | High | Detalhe | Entity Workspace tenant | Wave 4 |
| `/backoffice/politicas` | Staff/owner | High | Cards/listas | Policy console | Wave 4 / 5 |
| `/backoffice/usuarios` | Admin | High | Usuários/tabela | Access governance workspace | Wave 4 / 5 |
| `/backoffice/auditoria` | Todos autorizados | Critical | Tabela de auditoria | Audit explorer | Wave 4 |
| `/portal/*` | Empresa/contato | High | Portal externo | Mobile-first evidence/action UX | Future after Wave 2 |
| `/(site)` | Prospect/decisor | High | Website institucional | Platform-first website | Wave 6 |

## 22. Responsive Matrix

| Pattern | 320 | 375 | 768 | 1024 | 1440 | Widescreen |
|---|---|---|---|---|---|---|
| Shell | Drawer + command | Drawer + shortcuts | Collapsible sidebar | Sidebar grouped | Sidebar + topbar full | Max-width content; no stretched tables without purpose |
| Dashboard | Pulse compact + decision first | KPI primary + queue | 2-column summary | 3-zone layout | Full command center | Additional context panels |
| KPI | One primary, small secondaries | Same | 2 columns | 3-4 columns only when hierarchy holds | Mixed hierarchy | Avoid equal-card wall |
| Charts | Summary + accessible table | Compact chart | Chart + legend | Full chart with drilldown | Chart + comparison | Optional side insights |
| Grids | Row cards | Row cards | Table with hidden low-priority columns | Full table | Full data grid | Pinned columns and density |
| Workspaces | Header + tabs + stacked context | Same | Tabs + panels | Main + side context | Full workspace | Persistent context panel |
| Workflows | Full-screen stepper/dialog | Same | Dialog or side sheet | Side sheet | Side sheet + audit summary | No loss of context |
| Website hero | Platform message + CTA + product hint | Same | Product visual visible | Full hero with product proof | Product and proof in first viewport | Next section hint visible |

## 23. Dependency Map

| Wave | Dependencies | Unlocks | Components | Routes | Risks | Backend/data needs | Tests |
|---|---|---|---|---|---|---|---|
| Wave 0 | Audit, product docs, tokens | Shared language | Status, tokens, states | All | Overdesign sem implementação | Nenhum novo dado | Docs review, contrast baseline |
| Wave 1 | Wave 0 direction | Shell consistente | Sidebar, topbar, PageHeader, command architecture | Backoffice | Badges vazarem counts | Counts permission-aware somente quando existirem | Keyboard, role visibility, responsive |
| Wave 2 | Wave 1 shell | Reference implementation | ExecutiveKpi, DecisionQueue, ChartFrame | `/backoffice`, partes de receita | Inventar impacto/forecast ausente | Usar apenas dados reais e marcar ausência | Desktop/mobile screenshots, comprehension test |
| Wave 3 | Wave 2 approved | Operação escalável | EnterpriseDataGrid, MobileRowCard | Lists críticas | Regressão em tabelas | Filtros/export dependem de permissões | Grid tests, overflow, keyboard |
| Wave 4 | Wave 3 patterns | Detalhes previsíveis | EntityWorkspace, AuditTimeline | `[id]` críticas | Refactor amplo | Dados de relações/auditoria | Route screenshots, long content |
| Wave 5 | Entity workspace | Workflows seguros | Critical workflow pattern | Negociação, conciliação, escalonamento | Ação crítica sem authority context | MFA/maker-checker/policy | Workflow QA, failure states |
| Wave 6 | Wave 2 identity approved | Website premium | Site hero/proof/use cases | `/(site)` | Métrica inventada | Apenas provas reais | Desktop/mobile/site accessibility |
| Wave 7 | Waves anteriores | Qualidade final | Motion, badges, icons, QA | All | Polish esconder dívida estrutural | Nenhum | Axe, visual regression, performance |

## 24. Wave 0

Objetivo: criar Design Direction aprovada antes de mexer no app.

Entregáveis:
- Princípios finais de design.
- IA alvo com itens reais e FUTURE.
- Tipografia de site/produto/número/tabela/metadata.
- Densidade compact/default/comfortable.
- Spacing e surfaces.
- Cores semânticas de risco, financeiro, SLA e policy.
- Regras de charts.
- Regras responsive.
- Filosofia de componentes.

Gate: `DESIGN DIRECTION APPROVED`.

Quality Gate esperado: PASS WITH CONDITIONS até validação visual.

## 25. Wave 1

Objetivo: Application Shell.

Entregáveis:
- Sidebar agrupada por domínio.
- Topbar com contexto, usuário e arquitetura de command search.
- Page header consistente.
- Breadcrumb e ações primárias/secundárias.
- Responsive shell desktop/tablet/mobile.
- Role visibility sem leakage.

Gate: desktop/tablet/mobile, role visibility e keyboard.

Quality Gate esperado: PASS somente se todos os itens vazios forem excluídos ou marcados fora da navegação como FUTURE.

## 26. Wave 2

Objetivo: transformar `/backoffice` em Executive Command Center e referência de linguagem.

Entregáveis:
- Executive Pulse.
- Performance & Risk.
- Decision Queue.
- Executive Intelligence determinística.
- Controles de período/contexto.
- Drilldowns para rotas existentes.
- Responsive command center.

Não criar métricas falsas. Se forecast, gap ou impacto não existirem, exibir ausência qualificada ou usar métrica real alternativa.

## 27. Wave 2 STOP Gate

STOP obrigatório após Wave 2.

Pergunta de revisão:

> O GSBC agora parece inequivocamente uma plataforma enterprise premium?

Se a resposta for NÃO, PARCIALMENTE ou houver D0/D1 estrutural aberto no padrão do dashboard/shell, não iniciar Wave 3.

Critérios:
- Antes/depois desktop e mobile.
- Dashboard responde resultado, tendência, risco e decisão em ~10 segundos.
- Navegação comunica domínios.
- Hierarquia visual clara.
- Densidade adequada.
- Acessibilidade básica verificada.
- Sem dados inventados.

## 28. Wave 3

Objetivo: Enterprise Operations.

Escopo:
- EnterpriseDataGrid por tier.
- Filtros avançados.
- Density.
- Views salvas quando suportadas.
- Mobile row cards.
- SLA/risk nas filas.
- Queues operacionais.

Rotas prioritárias: cobranças, financeiro, conciliação, negociações, contestações, escalonamentos e central operacional.

## 29. Wave 4

Objetivo: Entity Workspaces.

Prioridade preliminar:
- cobrança;
- empresa;
- obrigação, se houver rota dedicada futura;
- negociação;
- contestação;
- pagamento;
- instrumento.

Cada workspace deve preservar auditoria, contexto financeiro, política, documentos, relações e próxima ação.

## 30. Wave 5

Objetivo: Critical Workflows.

Escopo:
- Approvals.
- Maker-checker.
- Payment/reconciliation.
- Escalation.
- Evidence.
- Negotiation.
- Legal/policy decisions.

Padrão obrigatório: Context → Impact → Policy → Confirmation → Result → Audit.

## 31. Wave 6

Objetivo: Website.

Escopo:
- Hero platform-first.
- Product proof.
- Use cases.
- Trust/security/governance.
- Product narrative.
- Responsive.

Só iniciar após identity do app autenticado ser validada.

## 32. Wave 7

Objetivo: Polish & Accessibility.

Escopo:
- WCAG.
- Keyboard.
- Motion funcional com `prefers-reduced-motion`.
- Microcopy.
- Icons.
- Badges.
- Loading/errors.
- Visual regression.
- Responsive QA.

## 33. Design QA

Por wave:
- Capturas desktop/mobile.
- Matriz responsive.
- Keyboard navigation.
- Contraste.
- Overflow.
- Empty/loading/error.
- Long content.
- Valores financeiros pequenos, milhões, negativos e percentuais.
- Nomes longos.
- Muitos status simultâneos.
- Tabelas vazias e grandes volumes.
- Diferenças por papel.

Quality Gate:
- PASS.
- PASS WITH CONDITIONS.
- FAIL.

## 34. Visual Regression Strategy

Estratégia futura:
- Playwright screenshots para rotas críticas.
- Viewports: 320, 375, 768, 1024, 1440.
- Comparar shell, dashboard, grids, workspaces, workflows e website.
- Testar temas/estados se forem adicionados.
- Guardar baseline após Wave 2 approval.

Rotas críticas iniciais:
- `/backoffice`;
- `/backoffice/receita`;
- `/backoffice/cobrancas`;
- `/backoffice/financeiro`;
- `/backoffice/conciliacao`;
- `/backoffice/operacoes`;
- `/`;
- `/solucoes`;
- `/tecnologia`.

## 35. Performance Constraints

Premium não pode significar lento.

Limites:
- Charts devem evitar renderização pesada no client sem necessidade.
- Grids grandes exigem paginação/virtualização conforme volume.
- Client components devem ser justificados por interação real.
- Skeletons precisam preservar layout.
- Lazy loading para painéis secundários e website abaixo da dobra.
- Icon bundles devem continuar controlados.
- Font loading deve evitar layout shift.

## 36. Security/Privacy UX

UI deve refletir fail-closed:
- Nada de resultado não autorizado em busca.
- Nada de count agregado que revele existência de dados.
- Nada de autocomplete com nomes fora do tenant/permissão.
- Badges e notificações só com escopo autorizado.
- Tooltips e empty states não devem revelar objetos bloqueados.
- Ações não autorizadas devem estar ausentes ou explicar apenas a permissão faltante sem expor objeto sensível.

## 37. Premium Acceptance Criteria

- Executivo identifica resultado, tendência, risco e principal decisão em ~10 segundos.
- Navegação comunica domínios sem lista plana.
- Operação identifica prioridade, SLA, valor, risco e próxima ação.
- Valores têm contexto.
- Mobile não exige scroll horizontal para ação crítica.
- Entidades críticas usam workspace previsível.
- Workflows sensíveis mostram consequência antes da execução.
- Website comunica SaaS e valor na primeira dobra.
- Fluxos críticos atendem WCAG AA.
- Padrões são consistentes entre domínios.

## 38. Design Debt

Registro completo em `docs/DESIGN_DEBT_REGISTER.md`.

Resumo:
- D0: mobile operacional e dashboard executivo.
- D1: navegação plana, card-heavy, tabelas não enterprise, website não product-first e charts sem decisão.
- D2: busca global, entity workspace, densidade, tipografia financeira, accessibility gate, states e provas de website.
- D3: microcopy, iconografia, surfaces, mobile spacing e badges.

## 39. Risks

- Redesenhar visualmente antes de resolver IA e decisão.
- Criar navegação para módulos inexistentes.
- Inventar forecast, impacto ou métricas sem dado real.
- Badges/counts vazarem dados cross-tenant.
- Tornar UI mais bonita e menos densa para operadores.
- Propagar padrão de dashboard antes do STOP Gate.
- Tratar mobile como desktop empilhado.
- Criar charts decorativos sem pergunta.
- Website prometer capacidades futuras como atuais.
- Accessibility virar polish tardio em vez de arquitetura.

## 40. Recommended Execution Sequence

1. Aprovar Wave 0 Direction.
2. Executar Wave 1 Application Shell.
3. Executar Wave 2 Executive Command Center.
4. Parar no Wave 2 STOP Gate.
5. Revisar antes/depois com capturas desktop/mobile.
6. Só iniciar Wave 3 se o padrão aprovado responder inequivocamente a experiência premium enterprise.

Próximos artefatos recomendados:
- `CODEX_DESIGN_WAVE_0_DIRECTION.md`
- `CODEX_DESIGN_WAVE_1_SHELL.md`
- `CODEX_DESIGN_WAVE_2_COMMAND_CENTER.md`

Não gerar prompts de Wave 3-7 antes do STOP Gate de Wave 2.

## 41. Final Recommendation

Executar Wave 0 imediatamente como próxima rodada. Ela deve transformar este plano em direção visual aprovada, tokens semânticos, princípios de componente e critérios de QA. Depois, Wave 1 deve reorganizar o shell sem navegação vazia. Wave 2 deve redesenhar `/backoffice` como prova controlada da tese.

Até o Wave 2 STOP Gate ser aprovado, não propagar redesign para tabelas, workspaces ou website.
