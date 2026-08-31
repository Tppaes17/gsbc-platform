# GSBC Premium Design & UX Audit

Data: 2026-08-30  
Escopo: auditoria read-only de front-end, UX, information architecture, design system, website institucional e experiência operacional autenticada.

Evidências usadas:
- Código-fonte em `src/app`, `src/components`, `src/lib` e `src/app/globals.css`.
- Execução local em `http://localhost:3000`.
- Capturas locais: `/tmp/gsbc-design-site-desktop.png`, `/tmp/gsbc-design-site-mobile.png`, `/tmp/gsbc-design-dashboard-desktop.png`, `/tmp/gsbc-design-dashboard-mobile.png`, `/tmp/gsbc-design-receita-desktop.png`, `/tmp/gsbc-design-cobrancas-mobile.png`.
- Componentes-chave: `src/components/backoffice/sidebar-nav.tsx`, `src/components/backoffice/nav-items.ts`, `src/components/design-system/data-table.tsx`, `src/components/design-system/table-toolbar.tsx`, `src/components/design-system/metric-card.tsx`, `src/app/backoffice/page.tsx`, `src/app/backoffice/receita/page.tsx`, `src/app/(site)/page.tsx`.

Não foram feitas alterações de código, CSS, componentes, tokens, rotas, migrations ou dependências.

## 1 Executive Verdict

O GSBC está visualmente organizado, funcional e acima de um protótipo, mas ainda não transmite maturidade premium/enterprise de forma consistente. A base tem componentes reutilizáveis, tokens de marca, navegação protegida por papéis e páginas operacionais amplas; porém a experiência ainda se apoia em muitos cards equivalentes, tabelas genéricas, navegação plana e dashboards que informam mais do que dirigem decisão.

Veredito: **não está pronto como SaaS premium**, mas tem fundação suficiente para evoluir sem reescrever o produto. O principal salto não é cosmético: é transformar o backoffice em centro de comando executivo e operacional, com hierarquia, priorização, densidade, visualização orientada a decisão e padrões fortes para tabelas, workflows e páginas de detalhe.

## 2 Current Design Maturity

| Dimensão | Nota | Diagnóstico |
|---|---:|---|
| Visual premium | 3/5 | Limpo e coerente, mas ainda genérico e card-heavy. |
| UX operacional | 3/5 | Fluxos existem, mas faltam densidade, priorização e padrões enterprise. |
| Dashboard executivo | 2/5 | Mostra métricas, mas não responde rapidamente o que mudou, o que importa e onde agir. |
| Design system | 3/5 | Tokens e componentes existem, mas faltam padrões de produto: data grid, workspace, charts e estados. |
| Mobile | 2/5 | Responsivo em leitura, frágil para operação real de tabelas e filas. |
| Website | 3/5 | Institucional forte, mas comunica mais parceria/serviço do que plataforma SaaS premium. |
| Acessibilidade | 3/5 | Estrutura razoável, mas requer auditoria formal de contraste, foco, teclado e tabelas. |

## 3 What Makes the Product Feel Outdated

- Excesso de cards com peso visual semelhante, especialmente em `src/app/backoffice/page.tsx` e `src/app/backoffice/receita/page.tsx`.
- Sidebar longa e plana em `src/components/backoffice/nav-items.ts`, sem agrupamento visual por domínio.
- Dashboard inicial sem narrativa executiva, metas, comparação temporal ou fila clara de decisões.
- Tabelas com comportamento básico de overflow horizontal em `src/components/design-system/data-table.tsx`, insuficiente para uso operacional intenso.
- Tipografia percebida como editorial/institucional nas capturas, com pouca diferenciação entre produto executivo, website e operação.
- Website em `src/app/(site)/page.tsx` posiciona a GSBC como frente de parceria antes de deixar a plataforma digital evidente.
- Visualização de dados ainda decorativa/informativa, não analítica: poucos benchmarks, thresholds, anotações, drilldowns e estados de alerta.

## 4 Information Architecture

A IA atual separa muitos domínios relevantes, mas a navegação não expressa a hierarquia do negócio. A lista em `src/components/backoffice/nav-items.ts` inclui 17 itens de staff no mesmo nível: visão geral, receita, central operacional, sindicatos, empresas, prospectos, instrumentos, cobranças, negociações, contestações, escalonamentos, financeiro, contratos financeiros, conciliação, políticas, usuários e auditoria.

Isso torna o produto completo, mas menos executivo. Um operador novo precisa inferir quais áreas são estratégicas, quais são operacionais, quais são cadastros e quais são governança.

Recomendação: reestruturar em grupos persistentes: **Comando**, **Operação**, **Receita**, **Financeiro**, **Cadastros**, **Governança** e **Administração**.

## 5 Executive Dashboard Audit

`src/app/backoffice/page.tsx` cumpre papel de home administrativa, mas não de dashboard executivo premium. Ele mostra volume da operação, valores movimentados, atenção necessária e eventos recentes. A estrutura é clara, porém fragmentada.

Problemas principais:
- Ausência de período global e comparação contra período anterior.
- Ausência de metas, forecast, variação, concentração de risco e top drivers.
- A seção "Atenção necessária" não é uma fila de decisão com impacto financeiro explícito.
- Eventos recentes não se conectam a auditoria, risco ou próximos passos.

`src/app/backoffice/receita/page.tsx` é mais próximo de um command center, com KPIs, funil, tendência e segmentação, mas ainda precisa virar uma página de decisão, não apenas uma coleção de gráficos e cards.

## 6 Navigation Audit

O `SidebarNav` em `src/components/backoffice/sidebar-nav.tsx` é tecnicamente simples e legível, com controle por papéis. O problema é de IA e densidade: muitos destinos competem pelo mesmo peso.

Achados:
- A navegação não comunica fluxo natural de trabalho.
- Não há agrupamento visual por domínio.
- Não há estado de urgência, contagem, alertas ou atalhos contextuais.
- As áreas financeiras, operacionais e de governança ficam misturadas.

## 7 Tables & Operational UX

`src/components/design-system/data-table.tsx` oferece busca, ordenação, paginação, loading, empty state e overflow horizontal. Isso é uma base útil, mas ainda é insuficiente para cobrança, negociações, contestações e conciliação em escala.

Na captura `/tmp/gsbc-design-cobrancas-mobile.png`, a tabela de cobranças em mobile fica parcialmente cortada, com colunas e ações fora do campo visual. Isso compromete uso real em campo ou revisão rápida em tela estreita.

Faltam padrões esperados de SaaS operacional:
- Cabeçalho fixo.
- Colunas fixas para entidade e ação.
- Densidade compacta/confortável.
- Filtros avançados e salvos.
- Bulk actions com confirmação.
- Exportação.
- Modo mobile em cards/resumo de linha.
- Estados de erro recuperáveis.
- Indicação forte de SLA, risco, vencimento e bloqueios.

## 8 Detail Pages

As páginas de detalhe do backoffice aparentam usar blocos e seções consistentes, mas ainda se comportam mais como dossiês verticais do que workspaces. Para entidades centrais como cobrança, empresa, sindicato, prospecto e negociação, o padrão premium deveria separar:

- Cabeçalho com estado, owner, risco, valor e ações primárias.
- Timeline auditável.
- Próxima melhor ação.
- Dados principais editáveis.
- Relacionamentos.
- Eventos financeiros.
- Alertas e bloqueios.
- Evidências e anexos.

Sem esse padrão, cada detalhe tende a crescer organicamente e perder previsibilidade.

## 9 Workflow UX

O produto já possui muitos fluxos de domínio, mas a UX ainda precisa explicitar melhor consequência, reversibilidade, auditoria e estado pós-ação. Em cobrança e pagamentos, isso é essencial.

Todo workflow crítico deve exibir antes da confirmação:
- Evento de negócio gerado.
- Entidade afetada.
- Impacto financeiro.
- Política aplicada.
- Auditoria criada.
- O que acontece em falha parcial.

## 10 Design System

`src/app/globals.css` define tokens de marca, semântica de cores, radius, chart colors e base shadcn/Tailwind. Isso é uma boa fundação.

Lacunas:
- Tokens não parecem cobrir densidade operacional.
- Componentes financeiros e de risco ainda não têm linguagem própria.
- `MetricCard`, `DataTable` e `TableToolbar` são genéricos.
- Falta um padrão enterprise para dashboards, filas, entity workspace, status timeline, decision panel e audit trail.
- O radius base e cards arredondados dão polidez, mas podem reforçar aparência de template quando usados em excesso.

## 11 Typography

A tipografia atual é legível, mas não entrega por si só uma sensação SaaS premium. Nas capturas, o produto parece mais institucional/editorial em várias áreas do que executivo-operacional.

Recomendação:
- Definir escala tipográfica específica para produto: números, tabelas, headings compactos e labels operacionais.
- Usar numerais tabulares em KPIs, valores e colunas financeiras.
- Reduzir headline scale dentro do backoffice.
- Separar voz do website da voz do app autenticado.

## 12 Color & Visual Language

Os tokens de navy, teal, gold e ice são adequados para uma fintech/collections B2B. O risco está no uso: muitas superfícies claras com bordas e cards iguais diluem prioridade.

Direção recomendada:
- Navy para autoridade e estrutura.
- Teal para progresso/recuperação.
- Gold apenas para destaque executivo e insight, não decoração ampla.
- Vermelho/âmbar com semântica forte para risco, bloqueio e vencimento.
- Gráficos com paleta funcional, não apenas estética.

## 13 Data Visualization

`src/app/backoffice/receita/page.tsx` já usa funil, tendência e segmentação, mas os gráficos precisam responder perguntas executivas:

- Receita em risco aumentou ou caiu?
- Qual estágio do funil causa perda?
- Quais sindicatos/empresas concentram impacto?
- Qual política performa melhor?
- Onde há atraso operacional?
- O que exige decisão humana hoje?

Faltam targets, thresholds, annotations, drilldown e comparação temporal.

## 14 Mobile / Responsive

O website é legível em mobile, mas longo e linear. O backoffice responde em stack de cards, mas isso não equivale a uma experiência operacional mobile.

Problema crítico: tabelas operacionais em mobile escondem informação essencial por overflow horizontal, evidenciado em `/tmp/gsbc-design-cobrancas-mobile.png`.

Estratégia recomendada:
- Mobile para revisão, aprovação, triagem e consulta rápida.
- Tabelas viram cards de linha com ação primária explícita.
- KPIs viram resumo compacto, não pilha longa de cards.
- Navegação mobile com busca/atalhos, não só menu linear.

## 15 Accessibility

Não foi executada auditoria automatizada completa de acessibilidade nesta etapa. Pela inspeção visual e de componentes, os riscos principais são:

- Contraste de textos secundários em cards e website.
- Estados de foco e navegação por teclado em menus, filtros, tabelas e ações.
- Tabelas responsivas com semântica e leitura por screen reader.
- Uso de cor como sinal de status sem redundância textual.
- Densidade de links/ações em páginas longas.

Critério mínimo: WCAG AA para contraste, foco visível, navegação por teclado e nomes acessíveis em ações iconográficas.

## 16 Website Audit

`src/app/(site)/page.tsx` é visualmente mais refinada que partes do backoffice, com hero escuro, CTAs e seções institucionais. Contudo, a primeira dobra comunica "parceria com movimento sindical" antes de comunicar "plataforma enterprise de cobrança, receita e operação".

Achados:
- A proposta SaaS aparece tarde.
- Há muitas seções em cards com mensagens próximas.
- Falta screenshot/produto real em destaque na primeira dobra.
- Faltam provas concretas de segurança, governança, integrações, auditoria e resultado operacional.
- A linguagem é confiável, mas poderia ser mais direta para decisores C-level e operadores.

## 17 Brand Consistency

A marca tem território visual promissor: navy, teal, gold, autoridade sindical/financeira, operação B2B. A inconsistência está entre:

- Website mais institucional.
- Backoffice mais administrativo/template.
- Dashboard de receita mais analítico.
- Tabelas mais genéricas.

Premium exige um sistema único: a mesma marca deve se manifestar em decisões, dados, riscos, fluxos e comunicação pública.

## 18 Persona Review

Executivo: precisa de visão de resultado, risco, forecast e decisões. Hoje recebe muitos indicadores, mas pouca priorização.

Operador de cobrança: precisa de fila, contexto, SLA, motivo de prioridade e próxima ação. Hoje encontra listas e páginas, mas sem cockpit operacional consolidado.

Financeiro: precisa de rastreabilidade, conciliação, exceções, idempotência e evidência. A UX deve destacar exceções e trilhas de auditoria.

Admin/owner: precisa de governança, papéis, políticas e segurança. A navegação mistura administração com operação.

Sindicato/cliente externo: precisa de clareza, confiança e prova de valor. O website ainda enfatiza parceria mais do que plataforma auditável.

## 19 D0 Findings

### D0-001 Mobile operacional compromete uso em tabelas críticas

Evidência: `/tmp/gsbc-design-cobrancas-mobile.png`, `src/components/design-system/data-table.tsx`.

A tabela de cobranças em mobile usa overflow horizontal, escondendo colunas e ações. Em um sistema de cobrança, negociação e conciliação, isso compromete triagem e tomada de ação.

Tipo: REDESIGN / BUILD.

### D0-002 Dashboard inicial não funciona como cockpit executivo

Evidência: `src/app/backoffice/page.tsx`, `/tmp/gsbc-design-dashboard-desktop.png`, `/tmp/gsbc-design-dashboard-mobile.png`.

A home autenticada mostra dados relevantes, mas não prioriza risco, variação, impacto financeiro, metas, forecast ou decisões pendentes. Para liderança, isso reduz confiança e velocidade de decisão.

Tipo: RESTRUCTURE / BUILD.

## 20 D1 Findings

### D1-001 Navegação longa e plana

Evidência: `src/components/backoffice/nav-items.ts`, `src/components/backoffice/sidebar-nav.tsx`.

Dezessete itens no mesmo nível reduzem escaneabilidade e não refletem domínios do negócio.

Tipo: RESTRUCTURE.

### D1-002 Produto parece card-heavy

Evidência: `src/app/backoffice/page.tsx`, `src/app/backoffice/receita/page.tsx`, `src/components/design-system/metric-card.tsx`.

Cards demais com pesos parecidos tornam o sistema limpo, mas menos premium e menos operacional.

Tipo: REDESIGN.

### D1-003 Tabelas ainda não são enterprise-grade

Evidência: `src/components/design-system/data-table.tsx`, `src/components/design-system/table-toolbar.tsx`.

Faltam filtros salvos, bulk actions, coluna fixa, sticky header, densidade, exportação, ações padronizadas e modo mobile nativo.

Tipo: BUILD.

### D1-004 Website não coloca o produto como sinal primário

Evidência: `src/app/(site)/page.tsx`, `/tmp/gsbc-design-site-desktop.png`, `/tmp/gsbc-design-site-mobile.png`.

A narrativa inicial é institucional. A plataforma, seus resultados e suas telas deveriam aparecer mais cedo.

Tipo: REDESIGN.

### D1-005 Gráficos informam, mas não orientam decisão

Evidência: `src/app/backoffice/receita/page.tsx`.

Faltam thresholds, metas, variação temporal, anotações e drilldowns.

Tipo: BUILD.

## 21 D2 Findings

- Falta busca global/command menu para operar em alta escala. Tipo: BUILD.
- Falta padrão único de entity workspace para detalhes. Tipo: BUILD.
- Falta densidade compacta para usuários avançados. Tipo: BUILD.
- Falta hierarquia tipográfica específica para números financeiros. Tipo: REDESIGN.
- Falta auditoria automatizada de acessibilidade no pipeline. Tipo: BUILD.
- Empty, loading e error states existem parcialmente, mas precisam de padrão premium por domínio. Tipo: CONSOLIDATE.
- O website precisa de provas concretas: screenshots, métricas, segurança, integrações e casos de uso. Tipo: BUILD.

## 22 D3 Findings

- Ajustar microcopy de CTAs para ser mais direto e orientado a valor.
- Padronizar peso visual de ícones.
- Revisar uso de radius e sombras para reduzir sensação de template.
- Refinar espaçamento vertical em páginas longas mobile.
- Melhorar consistência de badges e status chips entre domínios.

## 23 KEEP

- Base Tailwind/shadcn e tokens em `src/app/globals.css`.
- Separação entre site público e backoffice.
- Controle de navegação por papel.
- Componentes reutilizáveis de tabela, toolbar e métricas como fundação.
- Dashboard de receita como início de command center.
- Linguagem de marca navy/teal/gold, desde que usada com mais intenção.

## 24 REDESIGN

- Home autenticada como executive command center.
- Website hero e narrativa da primeira dobra.
- Mobile de tabelas operacionais.
- Visual hierarchy de cards e seções.
- Tipografia do produto autenticado.
- Páginas de detalhe como workspaces.

## 25 RESTRUCTURE

- Sidebar por domínios e papéis.
- IA do backoffice em camadas de comando, operação, financeiro, cadastros e governança.
- Dashboard de receita com filtro temporal global e comparação.
- Workflows críticos com revisão de impacto antes de confirmar.

## 26 BUILD

- Enterprise data grid.
- Mobile row-card mode.
- Command/search global.
- Decision queue.
- Risk and SLA visualization.
- Chart annotations, thresholds and drilldowns.
- Design system documentation for dashboards, tables, workflows and details.
- Accessibility test gate.

## 27 REMOVE

- Redundância de cards com mensagens equivalentes.
- Uso de cards como estrutura padrão para todo conteúdo.
- Website sections que repetem valor sem prova ou produto visível.
- Navegação plana para domínios estratégicos.

## 28 Proposed Premium Information Architecture

1. Comando: Visão executiva, Receita, Risco, Oportunidades.
2. Operação: Fila operacional, Cobranças, Negociações, Contestações, Escalonamentos.
3. Financeiro: Pagamentos, Conciliação, Repasses, Contratos financeiros.
4. Cadastros: Sindicatos, Empresas, Instrumentos, Prospectos.
5. Governança: Políticas, Auditoria, Segurança, Usuários.
6. Inteligência: Copilotos, recomendações, análises e simulações, quando governança permitir.

## 29 Proposed Executive Dashboard

Primeira dobra:
- Receita potencial, constituída, cobrada e recebida.
- Variação vs período anterior.
- Receita em risco.
- Top 5 decisões pendentes.
- Exceções financeiras críticas.

Segunda dobra:
- Forecast vs realizado.
- Aging e concentração.
- Funil por estágio.
- Segmentação por sindicato, empresa e instrumento.
- Timeline de eventos críticos.

Terceira dobra:
- Fila de decisão.
- Alertas de política.
- Auditoria recente relevante.
- Drilldowns para operação.

## 30 Proposed Navigation Model

Navegação principal agrupada, com no máximo 6 áreas persistentes. Itens de menor uso devem ficar em submenus ou busca global. Badges devem sinalizar pendências reais: contestações abertas, conciliações com divergência, escalonamentos vencidos, políticas em revisão.

## 31 Proposed Design System Direction

Criar padrões de produto, não apenas tokens visuais:

- `ExecutiveKpi`
- `DecisionQueue`
- `EnterpriseDataGrid`
- `EntityWorkspace`
- `AuditTimeline`
- `RiskBadge`
- `FinancialStatus`
- `PolicyDecisionPanel`
- `WorkflowReviewStep`
- `MobileRowCard`

Tokens necessários:
- Densidade.
- Status financeiro.
- Risco.
- SLA.
- Superfícies executivas.
- Foco/acessibilidade.
- Paleta de gráficos.

## 32 Website Redesign Direction

O website deve abrir com a GSBC como plataforma:

- Headline centrada em plataforma/resultado, não apenas parceria.
- Screenshot ou composição real do produto na primeira dobra.
- Provas: governança, segurança, auditoria, integrações, resultados.
- Casos de uso por persona.
- Demonstração de fluxo: identificar receita, cobrar, negociar, conciliar, auditar.
- CTA mais claro para diagnóstico/demonstração.

## 33 Mobile Strategy

Mobile não deve tentar replicar desktop. Deve priorizar:

- Triagem.
- Aprovação.
- Consulta de entidade.
- Próxima ação.
- Alertas.
- Decisões rápidas com confirmação.

Tabelas críticas devem virar resumos acionáveis por linha. Cards precisam ser compactos, com hierarquia clara e ação primária visível.

## 34 Component Priorities

1. Enterprise data grid.
2. Executive KPI and decision dashboard system.
3. Navigation groups and command search.
4. Entity workspace shell.
5. Workflow confirmation and audit pattern.
6. Chart system with thresholds and drilldown.
7. Mobile operational list pattern.
8. Website product hero and proof sections.

## 35 Design Debt

- Backoffice com aparência de admin template em partes críticas.
- IA não reflete maturidade do domínio financeiro/collections.
- Componentes genéricos carregam peso demais.
- Falta padrão visual para risco, SLA, exceção e dinheiro.
- Mobile operacional está subespecificado.
- Website não mostra produto cedo o suficiente.
- Acessibilidade precisa virar gate, não revisão posterior.

## 36 Recommended Implementation Sequence

### Wave 1 Foundation

- Reorganizar navegação por grupos.
- Definir tokens de densidade, status, risco, SLA e charts.
- Especificar enterprise data grid.
- Criar padrões de empty/loading/error por domínio.
- Adicionar gate de acessibilidade.

### Wave 2 Executive Dashboard

- Redesenhar `src/app/backoffice/page.tsx` como command center.
- Adicionar período global, variações, metas e decision queue.
- Conectar KPIs a drilldowns operacionais.

### Wave 3 Operational UX

- Evoluir tabelas críticas.
- Criar mobile row-card mode.
- Padronizar páginas de detalhe como workspaces.
- Padronizar workflows críticos com revisão de impacto e auditoria.

### Wave 4 Website

- Reposicionar hero para plataforma.
- Inserir produto visual na primeira dobra.
- Adicionar provas de segurança, governança, integrações e resultado.
- Reduzir seções repetitivas.

### Wave 5 Polish

- Refinar tipografia, microcopy, ícones, badges e gráficos.
- Revisar contraste, foco, keyboard navigation e estados responsivos.
- Consolidar documentação do design system.

## 37 Acceptance Criteria for “Premium”

- Um executivo entende em 10 segundos: resultado, risco, variação e decisão necessária.
- Tabelas críticas funcionam sem perda de contexto em mobile.
- Navegação tem grupos claros e estados de urgência reais.
- Toda página de detalhe crítica usa o mesmo padrão de workspace.
- Todo workflow financeiro ou sensível mostra impacto, auditoria e consequência.
- Gráficos têm meta, threshold, contexto temporal e drilldown.
- Website comunica plataforma SaaS na primeira dobra.
- Acessibilidade AA é verificada automaticamente.
- Design system cobre dados, risco, finanças, workflows e governança.
- O produto parece feito para operação real, não para demonstração estática.

## 38 Final Recommendation

1. **O design atual é premium?** Ainda não. É limpo e coerente, mas não tem hierarquia, densidade e decisão suficientes para premium enterprise.
2. **O produto parece SaaS enterprise?** Parcialmente. A base existe, mas a experiência ainda se parece com backoffice administrativo.
3. **A navegação está correta?** Funciona, mas deve ser reestruturada por domínios.
4. **O dashboard executivo está pronto?** Não. Ele precisa virar command center com risco, variação, metas e decisões.
5. **As tabelas são adequadas para operação real?** Não em seu estado atual, especialmente em mobile.
6. **O website vende a plataforma corretamente?** Parcialmente. Ele vende confiança e parceria, mas não coloca o produto e o valor SaaS cedo o bastante.
7. **Qual a próxima decisão recomendada?** Executar Wave 1 e Wave 2 antes de qualquer polimento visual amplo. O salto de premium virá de arquitetura de informação, componentes operacionais e dashboards de decisão.
