# GSBC Design Debt Register

Fonte: `docs/DESIGN_PREMIUM_AUDIT.md`  
Plano relacionado: `docs/DESIGN_TRANSFORMATION_PLAN.md`  
Status: registro de dívida de design para execução em ondas. Não representa implementação.

| ID | Severity | Route/Component | Problem | Decision | Wave | Status | Evidence |
|---|---|---|---|---|---|---|---|
| D0-001 | D0 | `src/components/design-system/data-table.tsx`, `/backoffice/cobrancas` | Mobile operacional depende de overflow horizontal e esconde colunas/ações críticas. | REDESIGN / BUILD | Wave 3 | OPEN | `/tmp/gsbc-design-cobrancas-mobile.png`; `docs/DESIGN_PREMIUM_AUDIT.md` |
| D0-002 | D0 | `/backoffice`, `src/app/backoffice/page.tsx` | Home autenticada não funciona como cockpit executivo: falta variação, risco, forecast, metas e fila de decisão. | RESTRUCTURE / BUILD | Wave 2 | OPEN | `/tmp/gsbc-design-dashboard-desktop.png`; `/tmp/gsbc-design-dashboard-mobile.png`; `docs/DESIGN_PREMIUM_AUDIT.md` |
| D1-001 | D1 | `src/components/backoffice/nav-items.ts`, `src/components/backoffice/sidebar-nav.tsx` | Navegação longa e plana não comunica domínios, fluxo de trabalho nem urgência. | RESTRUCTURE | Wave 1 | OPEN | 17 itens de staff no mesmo nível |
| D1-002 | D1 | `src/app/backoffice/page.tsx`, `src/app/backoffice/receita/page.tsx`, `src/components/design-system/metric-card.tsx` | Produto usa cards demais com peso visual semelhante, reduzindo hierarquia e percepção premium. | REDESIGN | Wave 0 / Wave 2 | OPEN | Auditoria visual desktop/mobile |
| D1-003 | D1 | `src/components/design-system/data-table.tsx`, `src/components/design-system/table-toolbar.tsx` | Tabelas não são enterprise-grade: faltam sticky header, pinned columns, filtros salvos, density, bulk, export, keyboard e mobile fallback. | BUILD | Wave 3 | OPEN | Componentes atuais de tabela |
| D1-004 | D1 | `src/app/(site)/page.tsx` | Website não coloca produto/plataforma como sinal primário na primeira dobra. | REDESIGN | Wave 6 | OPEN | `/tmp/gsbc-design-site-desktop.png`; `/tmp/gsbc-design-site-mobile.png` |
| D1-005 | D1 | `src/app/backoffice/receita/page.tsx` | Gráficos informam, mas não orientam decisão com meta, threshold, variação, anotação e drilldown. | BUILD | Wave 2 / Wave 3 | OPEN | Página de receita atual |
| D2-001 | D2 | Application shell | Falta busca global/command menu permission-aware e tenant-scoped para operação em alta escala. | BUILD | Wave 1 | OPEN | `docs/PRODUCT.md` seção Busca global |
| D2-002 | D2 | Detail pages | Falta padrão único de Entity Workspace para detalhes de cobrança, empresa, obrigação, negociação, contestação, pagamento e instrumento. | BUILD | Wave 4 | OPEN | Rotas `[id]` existentes em backoffice |
| D2-003 | D2 | Design system | Falta densidade compacta/default/comfortable para usuários avançados e telas de alta carga. | BUILD | Wave 0 | OPEN | `src/app/globals.css`; componentes atuais |
| D2-004 | D2 | Typography / financial UI | Falta hierarquia tipográfica específica para números financeiros, tabelas e metadata. | REDESIGN | Wave 0 | OPEN | `docs/DESIGN_PREMIUM_AUDIT.md` Typography |
| D2-005 | D2 | QA / accessibility | Falta gate automatizado de acessibilidade no pipeline. | BUILD | Wave 7 | OPEN | Auditoria não automatizada |
| D2-006 | D2 | States | Empty, loading e error states existem parcialmente, mas precisam de padrão por domínio e estado parcial/bloqueado. | CONSOLIDATE | Wave 0 / Wave 3 | OPEN | `src/components/design-system/empty-state.tsx`; `src/components/ui/skeleton.tsx` |
| D2-007 | D2 | Website | Website precisa de provas concretas: produto real, métricas verificáveis, segurança, integrações e casos de uso. | BUILD | Wave 6 | OPEN | `src/app/(site)/page.tsx` |
| D3-001 | D3 | Website / CTA copy | Microcopy de CTAs pode ser mais direta e orientada a valor. | REDESIGN | Wave 6 / Wave 7 | OPEN | `docs/DESIGN_PREMIUM_AUDIT.md` |
| D3-002 | D3 | Iconography | Peso visual de ícones precisa ser padronizado entre shell, cards, tabelas e estados. | CONSOLIDATE | Wave 7 | OPEN | `lucide-react` em navegação/componentes |
| D3-003 | D3 | Surfaces | Radius e sombras precisam de uso mais seletivo para reduzir sensação de template. | REDESIGN | Wave 0 / Wave 7 | OPEN | `src/app/globals.css`; componentes card-heavy |
| D3-004 | D3 | Mobile spacing | Espaçamento vertical em páginas longas mobile precisa ser refinado para reduzir scroll improdutivo. | REDESIGN | Wave 3 / Wave 7 | OPEN | Capturas mobile |
| D3-005 | D3 | Status language | Badges e status chips precisam de consistência semântica entre domínios. | CONSOLIDATE | Wave 0 / Wave 7 | OPEN | `src/components/design-system/status-badge.tsx` |
