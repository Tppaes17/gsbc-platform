# GSBC Design Wave 1 Shell Report

Data: 2026-08-31  
Wave: 1 — Application Shell  
Gate: `WAVE 1 PASS`

## 1. Executive Result

Wave 1 concluída com implementação controlada do Application Shell. A navegação plana foi substituída por domínios reais, o topbar ganhou contexto e affordance de busca segura, o `PageHeader` passou a suportar breadcrumbs/metadados/status, a navegação mobile preservou a mesma fonte permission-aware, e as páginas existentes continuaram funcionando.

Não foram alterados domínio, banco, APIs de negócio, RLS, migrations, dashboard executivo, tabelas, detail pages, workflows ou website.

## 2. Inputs Reviewed

- `AGENTS.md`
- `docs/DESIGN_PREMIUM_AUDIT.md`
- `docs/DESIGN_TRANSFORMATION_PLAN.md`
- `docs/DESIGN_DEBT_REGISTER.md`
- `docs/DESIGN_WAVE_0_DIRECTION.md`
- `docs/PRODUCT.md`
- `docs/DOMAIN_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/MULTITENANCY.md`
- `docs/STG_00_09_BASELINE.md`
- `src/app/backoffice/layout.tsx`
- `src/components/backoffice/nav-items.ts`
- `src/components/backoffice/sidebar-nav.tsx`
- `src/components/backoffice/mobile-sidebar.tsx`
- `src/components/backoffice/user-menu.tsx`
- `src/components/design-system/page-header.tsx`
- Rotas reais em `src/app/backoffice`.

## 3. Wave 0 Contract Compliance

Cumprido:
- Sem dashboard redesign.
- Sem cards novos para layout.
- Sem gold decorativo.
- Sem badges/counts sem autorização.
- Sem navegação para módulos FUTURE.
- Navegação por domínio real.
- Mobile com drawer, hierarquia e fechamento previsível.
- Busca global apenas como trigger seguro, sem resultados simulados.

## 4. Previous Shell

Antes:
- Sidebar desktop de 64px de largura visual (`w-64`) com 17 itens staff no mesmo nível.
- Topbar basicamente continha menu mobile e user menu.
- `PageHeader` sem breadcrumb, status ou metadata.
- Mobile usava a mesma lista plana dentro do drawer.
- Todas as páginas ficavam sob o mesmo `max-w-[1440px]`.

## 5. Information Architecture Applied

IA implementada apenas com rotas reais:
- Visão Geral: Command Center.
- Receita: Receita, Oportunidades, Cobranças, Negociações, Escalonamentos.
- Compliance: Empresas, Instrumentos, Contestações.
- Financeiro: Pagamentos, Conciliação, Contratos.
- Operação: Central Operacional.
- Governança: Políticas, Usuários, Auditoria, Sindicatos.

Itens FUTURE não expostos:
- Enquadramentos.
- Obrigações.
- Repasses.
- Créditos.
- Tarefas.
- SLA.
- Exceções.
- Autoridades/Delegações.
- Segurança.

## 6. Route Mapping

| Route | Domain | Exposed label | Notes |
|---|---|---|---|
| `/backoffice` | Visão Geral | Command Center | Nome prepara Wave 2 sem redesenhar dashboard |
| `/backoffice/receita` | Receita | Receita | Mantido visível para todos autorizados |
| `/backoffice/prospectos` | Receita | Oportunidades | Owner-only preservado |
| `/backoffice/cobrancas` | Receita | Cobranças | Visível conforme regra anterior |
| `/backoffice/negociacoes` | Receita | Negociações | Visível conforme regra anterior |
| `/backoffice/escalonamentos` | Receita | Escalonamentos | Transparência preservada |
| `/backoffice/empresas` | Compliance | Empresas | Mantido |
| `/backoffice/instrumentos` | Compliance | Instrumentos | Mantido |
| `/backoffice/contestacoes` | Compliance | Contestações | Mantido |
| `/backoffice/financeiro` | Financeiro | Pagamentos | Rótulo alinhado à IA alvo |
| `/backoffice/conciliacao` | Financeiro | Conciliação | Staff-only preservado |
| `/backoffice/contratos-financeiros` | Financeiro | Contratos | Staff-only preservado |
| `/backoffice/operacoes` | Operação | Central Operacional | Staff-only preservado |
| `/backoffice/politicas` | Governança | Políticas | Staff-only preservado |
| `/backoffice/usuarios` | Governança | Usuários | Mantido |
| `/backoffice/auditoria` | Governança | Auditoria | Transparência preservada |
| `/backoffice/sindicatos` | Governança | Sindicatos | Mantido |

## 7. Role Mapping

Staff GSBC:
- Vê todos os grupos.
- Owner vê Oportunidades.
- Vê Central Operacional, Conciliação, Contratos e Políticas.

Sindicato:
- Não vê grupo Operação quando vazio.
- Não vê Oportunidades.
- Não vê Conciliação, Contratos ou Políticas.
- Mantém acesso aos itens transparentes autorizados.

Nenhum grupo vazio é renderizado.

## 8. Sidebar

Alterações:
- `NAV_GROUPS` criado como fonte estruturada em `src/components/backoffice/nav-items.ts`.
- `NAV_ITEMS` preservado como flatten para compatibilidade.
- `SidebarNav` agora renderiza grupos semânticos com `aria-label`, active state e `aria-current`.
- Active state usa match exato ou prefixo com `/`, evitando prefix matching ingênuo.

## 9. Collapsed State

Não implementado nesta Wave. A sidebar agrupada já resolveu a dívida estrutural sem adicionar persistência local, tooltips ou estado adicional. Collapsed state pode ser reavaliado após Wave 2, se a densidade real exigir.

## 10. Topbar

Novo `src/components/backoffice/topbar.tsx`:
- Contexto do tenant/backoffice.
- User menu preservado.
- Trigger visual de busca global.
- Shortcut `Ctrl K` exibido como affordance.

Busca não executa resultados, autocomplete ou counts. O botão fica `aria-disabled` com `title` explicando dependência segura.

## 11. Tenant / Context

O tenant/contexto continua derivado de `getCurrentUser()` em server component:
- Platform staff: `Backoffice GSBC`.
- Sindicato: nome do tenant ativo.

Não foi criado tenant switch. Nenhum tenant inacessível é listado.

## 12. Command/Search

Implementado somente o affordance/trigger seguro. Busca global real continua dependente de backend permission-aware e tenant-scoped.

Regra preservada: search, autocomplete, counts e suggestions não foram implementados para evitar leakage.

## 13. Page Header

`src/components/design-system/page-header.tsx` evoluiu sem quebrar chamadas existentes:
- `breadcrumb` automático via `BackofficeBreadcrumbs`.
- `metadata` opcional.
- `status` opcional.
- `actions` preservado.
- `showBreadcrumbs` opcional.

## 14. Breadcrumbs

Novo `src/components/design-system/backoffice-breadcrumbs.tsx`:
- Usa IA real, não apenas URL mecânica.
- Renderiza domínio e rota.
- Em `/novo` mostra `Novo`.
- Em detalhes mostra `Detalhe`.
- Current page não é link.
- Links usam rotas reais existentes.

## 15. Page Geometry

Novo `src/components/backoffice/backoffice-content-frame.tsx`:
- Rotas operacionais críticas usam `max-w-none`.
- Demais rotas permanecem em `max-w-[1440px]`.
- Não impõe uma largura única a todo o produto.

## 16. Responsive Navigation

Mobile mantém drawer com a mesma `SidebarNav`, grupos reais, active state e fechamento ao navegar. Desktop mantém sidebar fixa/sticky. Tablet foi validado em 768px.

## 17. Mobile

Validado em 375px e 320px:
- Botão "Abrir menu".
- Drawer lateral.
- Grupos visíveis.
- Active item visível.
- Fechamento ao navegar.
- Sem scroll horizontal na navegação.

Observação: o badge flutuante do Next dev pode sobrepor parte inferior em screenshot local; não é UI de produto.

## 18. Tablet

Validado em 768px:
- Sidebar desktop aparece.
- Topbar mantém busca e user menu.
- Conteúdo operacional usa largura ampla.
- Breadcrumb aparece no header.

## 19. Desktop

Validado em 1440px:
- Sidebar agrupada reduz competição visual.
- Topbar mantém contexto.
- Active state claro.
- Conteúdo existente renderiza sem redesign.

## 20. Accessibility

Implementado/validado:
- `<nav aria-label="Navegação do backoffice">`.
- `aria-current="page"` em item ativo.
- Links com labels textuais.
- Botão mobile com `aria-label`.
- Drawer Base UI preserva semântica/focus trap/Escape.
- Trigger de busca marcado como `aria-disabled`.
- Focus visible preservado por classes Tailwind/shadcn.

## 21. Performance

Não foram adicionados fetches globais, polling, providers ou endpoints. O shell continua usando dados já carregados por `getCurrentUser()`. Badges não foram implementados para evitar N+1 e leakage.

## 22. Components KEEP

- `UserMenu`
- `MobileSidebar` como wrapper de drawer
- `FutureModulePlaceholder`
- `NAV_ITEMS` como compatibilidade

## 23. Components EVOLVE

- `SidebarNav`
- `PageHeader`
- `MobileSidebar`
- `BackofficeLayout`
- Specs que dependiam de rótulos antigos da navegação

## 24. Components NEW

- `BackofficeContentFrame`
- `Topbar`
- `BackofficeBreadcrumbs`
- `NAV_GROUPS`
- `e2e/shell-navigation.spec.ts`

## 25. Components DEPRECATED

Nenhum componente depreciado nesta Wave.

## 26. Technical Changes

Arquivos alterados:
- `src/app/backoffice/layout.tsx`
- `src/components/backoffice/nav-items.ts`
- `src/components/backoffice/sidebar-nav.tsx`
- `src/components/backoffice/mobile-sidebar.tsx`
- `src/components/design-system/page-header.tsx`
- `e2e/prospectos.spec.ts`
- `e2e/financial-contracts.spec.ts`
- `e2e/promocao-prospecto.spec.ts`
- `e2e/rls-visibility.spec.ts`
- `docs/DESIGN_DEBT_REGISTER.md`

Arquivos criados:
- `src/components/backoffice/backoffice-content-frame.tsx`
- `src/components/backoffice/topbar.tsx`
- `src/components/design-system/backoffice-breadcrumbs.tsx`
- `e2e/shell-navigation.spec.ts`
- `docs/DESIGN_WAVE_1_SHELL_REPORT.md`

## 27. Tests

Executados:
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS WITH WARNING. Warning conhecido em `src/components/design-system/data-table.tsx` sobre `useReactTable()` e React Compiler.
- `npx playwright test e2e/shell-navigation.spec.ts`: PASS, 3/3.
- `npx playwright test e2e/promocao-prospecto.spec.ts`: PASS, 1/1.
- `npx playwright test e2e/financial-contracts.spec.ts e2e/promocao-prospecto.spec.ts e2e/rls-visibility.spec.ts`: PASS após ajustes dos testes impactados por rótulos/paginação.
- `npm run test:e2e`: PASS, 93/93.

Falhas intermediárias tratadas:
- Specs esperavam rótulos antigos `Financeiro`, `Contratos Financeiros` e `Empresas Prospectadas`.
- Spec de promoção dependia da primeira página de prospectos; foi tornada determinística buscando o dossiê importado pelo CNPJ fixture.

## 28. Visual QA

Capturas geradas:
- `/tmp/gsbc-wave1-staff-dashboard-1440.png`
- `/tmp/gsbc-wave1-staff-cobrancas-768.png`
- `/tmp/gsbc-wave1-staff-cobrancas-375.png`
- `/tmp/gsbc-wave1-mobile-menu-open-375-stable.png`
- `/tmp/gsbc-wave1-staff-detail-1440.png`
- `/tmp/gsbc-wave1-sindicato-dashboard-1440.png`
- `/tmp/gsbc-wave1-sindicato-mobile-menu-320.png`

Inspeção:
- Desktop: grupos e active state claros.
- Tablet: sidebar/topbar/conteúdo funcionais.
- Mobile: drawer agrupado funcional após estabilização da animação.
- Conteúdo legado continua renderizando.

## 29. Before / After

Antes:
- 17 itens competindo no mesmo nível.
- Sem breadcrumb.
- Topbar sem busca/contexto operacional.
- Mobile herdava lista plana.

Depois:
- 6 domínios visuais.
- Grupos vazios não renderizam.
- Breadcrumb aparece nas páginas.
- Topbar comunica tenant/contexto e prepara busca segura.
- Mobile usa a mesma IA agrupada e fecha ao navegar.

## 30. Design Debt Updated

Atualizado `docs/DESIGN_DEBT_REGISTER.md`:
- `D1-001`: RESOLVED.
- `D2-001`: PARTIAL, porque apenas trigger/arquitetura segura de busca foi entregue; busca global real permanece dependência backend permission-aware.

D0-001 permanece aberto porque tabelas mobile não eram escopo da Wave 1.

## 31. Regressions

Nenhuma regressão crítica identificada. `npm run test:e2e` passou 93/93.

## 32. New Findings

- A tabela de prospectos sem busca torna testes e uso com muitos registros menos eficiente; isso reforça `D1-003`/Wave 3, mas não é regressão da Wave 1.
- O botão/trigger de busca global deve virar implementação real somente com consulta server-side permission-aware.

## 33. Remaining Risks

- Search real pode vazar dados se implementado no client ou por autocomplete inseguro.
- Badges futuros podem vazar counts cross-tenant.
- A linguagem do shell agora está à frente de algumas páginas antigas; contraste temporário é aceitável.
- D0 de tabelas mobile segue aberto até Wave 3.

## 34. Wave 2 Readiness

1. Shell recebe Executive Command Center sem nova reorganização? Sim.
2. IA está clara? Sim.
3. Desktop/mobile utilizáveis? Sim.
4. Geometry suporta dashboard executivo? Sim.
5. Permissions preservadas? Sim, validado por E2E.
6. Breadcrumb/header maduros? Sim para Wave 2.
7. Shell parece enterprise sem depender do dashboard novo? Sim, em nível de navegação/shell.
8. Existe D0/D1 estrutural de shell aberto? Não.

## 35. Gate Assessment

Critérios:
- Navegação plana substituída por domínios: PASS.
- Nenhuma feature fictícia exposta: PASS.
- Permissions preservadas: PASS.
- Nenhum leakage identificado: PASS.
- Mobile utilizável: PASS.
- Tablet testado: PASS.
- Active state correto: PASS.
- Page header/breadcrumb reutilizáveis: PASS.
- Shell obedece Wave 0: PASS.
- Páginas existentes funcionam: PASS.
- E2E verde: PASS.
- Sem regressão crítica: PASS.
- Wave 2 pode começar sem refazer shell: PASS.

Gate: `WAVE 1 PASS`.

## 36. Final Decision

`WAVE 1 PASS`.

Próximo passo recomendado: iniciar Wave 2 Executive Command Center, sem iniciar Wave 3 antes do STOP Gate obrigatório da Wave 2.
