# GSBC Design Wave 0 Direction

Data: 2026-08-31  
Wave: 0 — Design Direction  
Gate: `DESIGN DIRECTION APPROVED`

Esta Wave congela a constituição visual e interacional do GSBC para orientar Wave 1 Application Shell e Wave 2 Executive Command Center. Não houve redesign de páginas, alteração de rotas, banco, domínio, RLS, APIs, workflows, dependências ou migrations.

## 1. Executive Decision

Wave 0 fica aprovada como direção fundacional documentada. A decisão principal é preservar a base Tailwind v4/shadcn e a paleta institucional existente, mas elevar seu uso por uma camada semântica: decisão, dinheiro, risco, SLA, status, densidade, superfície e acessibilidade.

Nenhuma mudança técnica foi aplicada nesta rodada para evitar redesign acidental. Wave 1 e Wave 2 devem implementar esta constituição sem reinterpretar decisões fundamentais de gosto.

## 2. Inputs Reviewed

- `AGENTS.md`
- `docs/DESIGN_PREMIUM_AUDIT.md`
- `docs/DESIGN_TRANSFORMATION_PLAN.md`
- `docs/DESIGN_DEBT_REGISTER.md`
- `docs/PRODUCT.md`
- `docs/DOMAIN_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/MULTITENANCY.md`
- `docs/STG_00_09_BASELINE.md`
- `src/app/globals.css`
- `package.json`, `components.json`, `postcss.config.mjs`
- `src/components/design-system/*`
- Shell, navegação, dashboard, receita, website e componentes atuais.

## 3. Current Foundation Inventory

| Foundation | Current value/pattern | Usage | Problem | Decision |
|---|---|---|---|---|
| Framework | Tailwind CSS v4 + shadcn | Toda UI | Base adequada, exige cuidado com Next 16 | KEEP |
| Icons | `lucide-react` via `components.json` | Navegação, ações, estados | Precisa de regras de tamanho/acessibilidade | KEEP / NORMALIZE |
| Fonts | `--font-sans`, `--font-mono`, `--font-heading` | App/site | Sem contrato explícito por função | EVOLVE |
| Font sizes | Tailwind utilities por componente | Cards, tabelas, headers | Escala ainda local e variável | NORMALIZE |
| Weights | `font-medium`, `font-semibold` | Labels, valores, nav | Pouca hierarquia entre KPI e detalhe | NORMALIZE |
| Line height | Tailwind default | App/site | Sem contrato para tabelas/metadata | NORMALIZE |
| Spacing | `gap-*`, `p-*`, `py-*` por componente | Todo produto | Risco de arbitrariedade | NORMALIZE |
| Colors | Navy, teal, gold, ice, neutral | Marca/site/app | Tokens físicos existem; semântica incompleta | EVOLVE |
| Semantic colors | success, warning, info, destructive | Status simples | Não cobre risco/SLA/financeiro/policy | NEW |
| Radius | Base `0.625rem`, escalas até `4xl` | Cards, inputs, sidebar | Risco de bubble/template se usado amplo | NORMALIZE |
| Shadows | shadcn/default por componente | Overlays e superfícies | Devem ficar para layers reais | NORMALIZE |
| Borders | `border`, `border-subtle` | Cards, tabelas, inputs | Separação funcional ainda inconsistente | NORMALIZE |
| Widths | `w-64` sidebar, grids locais | Shell/backoffice | Falta política constrained/wide/full | EVOLVE |
| Breakpoints | Tailwind defaults | Responsividade | Comportamento por pattern não definido | NORMALIZE |
| Charts | `--chart-1..5`, Recharts | Receita | Paleta existe; falta regra de seleção e acessibilidade | EVOLVE |
| Focus | `outline-ring/50`, `--ring` | Base | Precisa contrato claro por superfície | EVOLVE |
| Transitions | `transition-colors`, componentes | Links, nav, UI | Sem política de motion/reduced motion | NORMALIZE |
| Icon sizes | `h-4 w-4`, `h-8 w-8` | Nav/cards/empty | Falta escala por contexto | NORMALIZE |

## 4. Design Thesis

**Institutional Authority + Financial Intelligence + Enterprise Operations.**

O GSBC deve parecer construído para decisão de alto valor, operação financeira, compliance, auditoria, governança, risco e uso diário em escala. A interface deve ser calma, densa quando necessário e sempre clara sobre o que é fato, inferência, decisão humana e consequência operacional.

## 5. Product vs Website Visual Language

Produto autenticado:
- Compacto, analítico, operacional.
- Menos expressivo e mais preciso.
- Números, status, filas e decisões dominam a hierarquia.
- Superfícies funcionais, poucas sombras, alta densidade.

Website:
- Mais expressivo, institucional e comercial.
- Deve mostrar plataforma e produto real cedo.
- Pode usar mais espaço e narrativa, sem inventar provas.
- Deve herdar navy/teal/gold com mais presença visual que o app.

## 6. Typography System

| Role | Family | Size | Weight | Line-height | Tracking | Use | Forbidden use |
|---|---|---:|---:|---:|---:|---|---|
| Product Display | `--font-sans` | 32-40 | 650-700 | 1.05 | 0 | Hero executivo raro | Cards e tabelas |
| Page Title | `--font-sans` | 24-30 | 650 | 1.15 | 0 | Título de rota | Repetir em seções |
| Section Title | `--font-sans` | 16-20 | 600 | 1.25 | 0 | Seções de dashboard/workspace | Hero |
| Subsection | `--font-sans` | 14-16 | 600 | 1.3 | 0 | Grupos internos | Navegação principal |
| Body | `--font-sans` | 14-16 | 400 | 1.5 | 0 | Texto corrente | Números financeiros |
| Compact Body | `--font-sans` | 13-14 | 400 | 1.35 | 0 | Tabelas e filas | Texto explicativo longo |
| Label | `--font-sans` | 11-12 | 600 | 1.2 | 0 | Labels, filtros, badges | Parágrafos |
| Metadata | `--font-sans` | 12-13 | 400-500 | 1.3 | 0 | Data, owner, fonte | CTA |
| Financial Number Hero | `--font-sans`, tabular | 36-48 | 700 | 1 | 0 | KPI primário | Listas densas |
| Financial Number Standard | `--font-sans`, tabular | 20-28 | 650 | 1.05 | 0 | KPIs secundários | Texto editorial |
| Financial Number Table | `--font-sans`, tabular | 13-14 | 500-600 | 1.25 | 0 | Colunas financeiras | Headline |
| Table Header | `--font-sans` | 11-12 | 650 | 1.2 | 0 | Cabeçalho de grid | Corpo de tabela |
| Button | `--font-sans` | 13-14 | 600 | 1.2 | 0 | Ações | Textos longos |

Numerais financeiros usam `tabular-nums`. Não usar tracking negativo. Números grandes só aparecem quando a hierarquia justificar.

## 7. Density System

| Density | Row height | Control height | Padding | Gap | Use |
|---|---:|---:|---:|---:|---|
| Compact | 36-40px | 32-36px | 8-12px | 6-8px | Grids, filas, conciliação, operações intensivas |
| Default | 44-48px | 40px | 12-16px | 12px | Formulários, listas comuns, shell |
| Comfortable | 56px+ | 44px+ | 20-32px | 16-24px | Website, onboarding, blocos executivos de leitura |

Não precisa haver seletor de densidade ao usuário nesta fase. A densidade é escolhida pelo padrão de tela.

## 8. Spacing System

- Micro spacing: 4px para relação íntima entre ícone/label.
- Control spacing: 8px entre controles do mesmo grupo.
- Component spacing: 12-16px entre campos, filtros e blocos pequenos.
- Section spacing: 24-32px entre seções do app.
- Page spacing: 24px mobile, 32px desktop, 40px em páginas executivas.
- Executive spacing: usar espaço para hierarquia, não para parecer vazio.

Evitar gaps/paddings arbitrários por página.

## 9. Grid & Geometry

- Constrained: website, login, formulários estreitos, textos longos.
- Wide: dashboard, receita, detalhes com contexto lateral.
- Full operational width: tabelas críticas, conciliação, filas, auditoria.
- Sidebar desktop atual pode manter 256px como base; Wave 1 pode colapsar por grupo.
- Gutters: 16px mobile, 24px tablet, 32px desktop.
- Widescreen usa contexto paralelo; não estica tabelas sem motivo.

## 10. Surface System

| Surface | Background | Border | Shadow | Radius | Use | Forbidden use |
|---|---|---|---|---|---|---|
| Canvas | `background` | none | none | none | Base da página | Card falso |
| Section | transparent or subtle shift | optional divider | none | none/low | Agrupar conteúdo | Todo bloco como card |
| Elevated | `card`/`surface-elevated` | subtle | low only if elevated | md | Cards reais, panels | Layout genérico |
| Inset | muted/subtle | subtle | none | md | Filtros, summaries internos | KPI primário |
| Executive | neutral/brand-tinted | functional | none/very low | md-lg | Pulse, decision zones | Gráficos decorativos |
| Interactive | accent/subtle | visible on hover/focus | none | md | Rows, options | Superfície estática |
| Selected | teal/gold subtle | stronger | none | md | Seleção real | Destaque decorativo |
| Critical | red/amber subtle | semantic | none | md | Risco, bloqueio, destructive context | Informação neutra |

## 11. Card Policy

Card só existe quando representa unidade independente, objeto clicável, comparação, estado isolado ou boundary necessário.

Não usar card para criar espaçamento. Alternativas: section, divider, typography, grid, background shift, whitespace, table/list.

## 12. Border / Radius / Shadow

Borders:
- Separação funcional em grids, inputs, seleção e boundaries necessárias.
- Não contornar toda superfície por padrão.

Radius:
- `sm/md` para controles e rows.
- `lg` para cards reais e dialogs.
- `xl+` apenas quando houver justificativa visual específica.

Shadows:
- Permitidas para overlays, dropdowns, dialogs e layers realmente elevadas.
- Proibidas como principal forma de hierarquia de dashboard.

## 13. Color System

| Token family | Role | Rule |
|---|---|---|
| Navy | Autoridade, estrutura, navegação | Base institucional e áreas de comando |
| Teal | Progresso, recuperação, performance positiva | Usar para melhoria comprovada ou ação saudável |
| Gold | Insight executivo, seleção de alto valor | Raro; não usar como série genérica |
| Amber | Atenção, risco intermediário, prazo próximo | Sempre com label/ícone |
| Red | Erro, bloqueio, vencimento crítico, risco real | Reservar para consequência real |
| Neutral | Maior parte da interface | Evita produto monocromático de marca |

Tokens semânticos propostos para implementação futura:
- `--surface-canvas`, `--surface-section`, `--surface-executive`, `--surface-critical`, `--surface-selected`
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
- `--risk-neutral`, `--risk-info`, `--risk-attention`, `--risk-warning`, `--risk-critical`, `--risk-blocked`
- `--financial-potential`, `--financial-qualified`, `--financial-constituted`, `--financial-charged`, `--financial-received`, `--financial-overdue`, `--financial-negotiated`, `--financial-reversed`, `--financial-credit`, `--financial-divergence`
- `--sla-within`, `--sla-approaching`, `--sla-due-today`, `--sla-overdue`, `--sla-frozen`, `--sla-external`, `--sla-blocked`
- `--focus-ring`, `--focus-ring-critical`

## 14. Financial Semantics

| Concept | Meaning | Visual language |
|---|---|---|
| Potential | Receita possível ainda não qualificada | Neutral/info; nunca verde de recebido |
| Qualified potential | Potencial validado | Teal subtle + qualification label |
| Constituted | Obrigação constituída | Navy/neutral, com fonte/regra |
| Charged | Valor cobrado | Navy + operational status |
| Received | Valor recebido | Teal/success somente após confirmação |
| Overdue | Vencido/inadimplente | Amber/red conforme criticidade |
| Negotiated | Em negociação/acordo | Info/teal, sem confundir com recebido |
| Reversed | Estorno/reversão | Red/neutral compensatório |
| Credit | Crédito reconhecido | Gold/neutral, uso exige autorização |
| Divergence | Divergência financeira | Amber/red com ação de conciliação |
| Blocked | Fluxo bloqueado por política/risco | Critical surface + reason |

Regra central: **Opportunity ≠ Coverage ≠ Obligation ≠ Debt**.

## 15. Risk System

| Level | Color | Icon | Label | Surface/border | Use |
|---|---|---|---|---|---|
| neutral | neutral | optional dot | Neutro | none/subtle | Sem risco especial |
| info | navy/blue subtle | info icon | Informação | subtle | Contexto relevante |
| attention | amber subtle | alert circle | Atenção | amber border light | Requer acompanhamento |
| warning | amber strong | triangle | Alerta | amber border | Pode degradar |
| critical | red | octagon/alert | Crítico | red border/surface | Consequência relevante |
| blocked | red/navy | lock/ban | Bloqueado | critical surface | Ação proibida ou fail-closed |

Sempre usar redundância além de cor: texto, ícone, tooltip ou explicação.

## 16. SLA / Time Semantics

| State | Meaning | Rule |
|---|---|---|
| within SLA | Prazo interno saudável | Neutral/teal |
| approaching | Prazo se aproxima | Amber subtle |
| due today | Vence hoje | Amber strong |
| overdue | SLA violado | Red/critical |
| frozen | Relógio interno congelado | Info + pause |
| external deadline | Prazo jurídico/externo | Label explícito; não congelar por padrão |
| blocked | Sem avanço por regra/política | Critical + reason |

Nunca confundir relógio interno congelável com prazo jurídico externo.

## 17. Status System

- Badge: status compacto com significado conhecido.
- Dot + label: status secundário em listas densas.
- Inline status: texto dentro de frase/tabela.
- Icon + label: risco, SLA ou estado que exige escaneabilidade.
- Banner: impacto de página inteira.
- Callout: explicação contextual ou bloqueio.

Evitar transformar todos os campos em pills. Badges são sinais, não decoração.

## 18. Iconography

Biblioteca principal: `lucide-react`.

Tamanhos:
- 12px: tabela/metadado muito denso.
- 16px: nav, botões compactos, badges.
- 20px: ações principais e headings.
- 24px: estados vazios ou cards destacados.
- 32px+: somente ilustração funcional.

Stroke padrão: lucide default. Evitar misturar filled icons. Icon-only exige accessible name e tooltip quando a função não for universal.

## 19. Buttons

- Primary: uma ação principal por área.
- Secondary: ações alternativas fortes.
- Tertiary/Ghost: navegação, filtros, ações leves.
- Destructive: exclusão/cancelamento/estorno/ação irreversível.
- Critical confirmation: ação sensível com contexto, impacto, política e auditoria.
- Icon-only: ferramentas frequentes; requer nome acessível e tooltip.

Não colocar múltiplas ações primárias competindo no mesmo bloco.

## 20. Form Controls

Controles cobertos:
- input;
- select;
- combobox;
- date;
- amount;
- textarea;
- checkbox;
- radio;
- switch;
- search.

Estados obrigatórios:
- default;
- hover;
- focus;
- invalid;
- disabled;
- read-only;
- loading.

Campos financeiros devem usar alinhamento e máscara adequados, sem perder valor bruto para validação.

## 21. Executive KPI Language

Padrão conceitual `ExecutiveKpi`:
- label;
- primary value;
- period;
- comparison;
- trend;
- target/gap;
- context;
- status;
- drilldown.

Variantes:
- Hero KPI: um por zona executiva.
- Supporting KPI: contextualiza o principal.
- Inline KPI: usado em filas, tabelas e detalhes.

Proibido criar fileiras de 6-8 Hero KPIs.

## 22. Decision Language

Padrão conceitual `DecisionQueue`:
- title;
- reason;
- financial impact, quando houver dado real;
- risk;
- SLA;
- owner;
- next action;
- context;
- source.

Diferenças:
- Notification: exige ciência.
- Task: exige execução.
- Decision: exige escolha com consequência.
- Exception: algo saiu da política/normalidade.

## 23. Data Visualization

Chart foundation:
- Tipografia compacta.
- Gridlines leves e funcionais.
- Eixos legíveis.
- Legends próximas do gráfico.
- Tooltips com métrica, período e contexto.
- Labels só quando ajudam.
- Annotations para mudança relevante.
- Thresholds e target lines sempre que houver meta.
- Fallback acessível em tabela/resumo.
- Paleta funcional com poucas cores simultâneas.

Gold não é série genérica.

## 24. Chart Selection Rules

| Chart | Use when | Avoid when |
|---|---|---|
| Line | Tendência temporal | Poucos pontos isolados |
| Bar | Comparar categorias | Categorias demais |
| Stacked bar | Composição ao longo de categoria/tempo | Segmentos pequenos demais |
| Area | Volume acumulado/tendência ampla | Precisão é crítica |
| Funnel | Estágios com conversão | Ranking comunicaria melhor |
| Donut/Pie | Composição simples, poucas categorias | Precisa comparar ou ordenar |
| Table/Ranking | Prioridade, concentração, decisão | Só para decoração |
| Sparkline | Tendência compacta em KPI/lista | Sem valor comparativo |

Todo chart futuro deve declarar pergunta, métrica, período, comparação, threshold/meta, drilldown, empty state e representação acessível.

## 25. Responsive Principles

- Mobile: triagem, consulta, aprovação, alerta, decisão rápida.
- Tablet: operação intermediária.
- Desktop: operação completa.
- Widescreen: contexto paralelo, não simples esticamento.

Breakpoints devem ser por pattern, não por página isolada.

## 26. Breakpoint Behavior

| Pattern | 320 | 375 | 768 | 1024 | 1440 | Widescreen |
|---|---|---|---|---|---|---|
| Navigation | Drawer + search | Drawer + shortcuts | Collapsible/rail possible | Sidebar grouped | Full grouped sidebar | Persistent context |
| Gutters | 16 | 16 | 24 | 24-32 | 32 | 40 max |
| Columns | 1 | 1 | 2 | 2-3 | 3-4 by hierarchy | Context side panels |
| KPIs | Primary first | Primary + compact support | 2 columns | Hierarchical grid | Mixed hierarchy | No equal-card wall |
| Charts | Summary + accessible data | Compact chart | Chart + legend | Full chart | Full + drilldown | Side insights |
| Grids | Row cards | Row cards | Adaptive table | Full table | Data grid | Pinned columns/context |
| Workspaces | Header + tabs | Same | Tabs + panels | Main + context | Full workspace | Persistent context panel |
| Dialogs/drawers | Full screen | Full screen | Sheet/dialog | Sheet/dialog | Context-preserving | Context-preserving |

## 27. Focus & Accessibility

Focus:
- Ring visível em superfícies claras e escuras.
- Offset suficiente para não misturar com border.
- Ações destrutivas usam foco crítico ou label explícito.

WCAG AA:
- Contraste para texto, muted text e controles.
- Cor semântica sempre redundante.
- Target sizes adequados.
- Keyboard navigation em shell, dialogs, tables e forms.
- `prefers-reduced-motion`.

Se implementação futura detectar falha crítica de contraste, ajustar token na própria wave antes de propagar componente.

## 28. Motion

Permitido:
- Micro feedback: 100-150ms.
- Panel transition: 150-220ms.
- State change: 120-180ms.
- Chart transition: sutil, 200-300ms, opcional.

Easing: standard ease-out para entrada, ease-in para saída, linear apenas para progresso técnico.

Proibido:
- Parallax.
- Motion decorativo.
- Animação que atrase operação.
- Animação indispensável para entender estado.

Respeitar `prefers-reduced-motion`.

## 29. Loading / Empty / Error

| State | Rule |
|---|---|
| loading/skeleton | Preserva estrutura e evita layout shift |
| empty | Explica ausência e próxima ação possível |
| filtered empty | Oferece limpar filtros |
| error | Explica recuperação sem culpar usuário |
| partial error | Preserva o que carregou e isola falha |
| permission denied | Não revela existência de objeto |
| stale | Indica dado desatualizado e opção de atualizar |
| processing | Mostra progresso sem prometer conclusão |
| success | Confirma resultado e próximo estado |
| blocked | Explica regra/política/autoridade que bloqueou |

## 30. Microcopy

Voz:
- Direta.
- Institucional.
- Precisa.
- Não promocional dentro do app.
- Orientada à ação.

CTAs devem usar verbo específico: "Aprovar negociação", "Registrar pagamento", "Revisar contestação", "Gerar simulação". Evitar "OK" e "Continuar" quando a ação real é conhecida.

## 31. Token Architecture

Arquitetura proposta:
- Foundation tokens: marca, neutros, radius, spacing, typography.
- Semantic tokens: risk, financial, SLA, policy, focus, surfaces.
- Component tokens: grid, KPI, nav, chart, dialog, workflow.

Convenção:
- Tokens não devem ser específicos de tela.
- Tokens novos devem preservar backward compatibility.
- Tokens antigos podem virar aliases.
- Depreciações devem ser documentadas antes de migração.

Exemplos:
- `--surface-canvas`
- `--surface-executive`
- `--text-primary`
- `--financial-received`
- `--risk-critical`
- `--sla-overdue`
- `--focus-ring`

## 32. Legacy Compatibility

| Existing token/component | Current consumers | Risk of change | Strategy |
|---|---|---|---|
| `--primary` | Buttons, links, shell | Alto | Retain; criar semantic aliases |
| `--accent` | Nav active, highlights | Médio | Retain; limitar uso futuro |
| `--success` | Status positivo | Médio | Alias para alguns financeiros, não todos |
| `--warning` | Atenção genérica | Médio | Alias para SLA/risco apenas quando aplicável |
| `--destructive` | Erro/destructive | Alto | Retain; criar risk-critical alias |
| `--chart-1..5` | Recharts | Médio | Retain; definir chart semantic palette futura |
| `--radius` | Cards/inputs | Alto | Retain; documentar uso por superfície |
| `MetricCard` | Dashboards | Médio | Migrate later para `ExecutiveKpi` |
| `DataTable` | Listas críticas | Alto | Evolve/replace em Wave 3 com adapter |
| `StatusBadge` | Estados | Médio | Evolve com tone semântico |
| `CriticalActionDialog` | Ações críticas | Médio | Evolve para workflow pattern |

Não quebrar dezenas de telas para limpar CSS.

## 33. Design Decisions

### DD-000 Typography

**Decision:** produto usa tipografia compacta e analítica; website pode ser mais expressivo.  
**Why:** app é ferramenta operacional de alto valor.  
**Alternatives rejected:** headline editorial em toda UI; trocar fonte sem validação.  
**Impact:** Wave 1/2 devem reduzir arbitrariedade tipográfica.  
**Applies from:** Wave 0.

### DD-001 Density

**Decision:** três densidades: compact, default e comfortable.  
**Why:** operação e leitura têm necessidades diferentes.  
**Alternatives rejected:** uma única densidade para todo produto.  
**Impact:** grids/filas podem ser densos sem afetar website.  
**Applies from:** Wave 0.

### DD-002 Card Policy

**Decision:** cards representam unidades reais, não espaçamento.  
**Why:** excesso de cards foi achado D1.  
**Alternatives rejected:** ampliar grid de KPIs/cards.  
**Impact:** Wave 2 deve usar zonas e hierarquia.  
**Applies from:** Wave 0.

### DD-003 Radius

**Decision:** radius pequeno/controlado; `xl+` raro.  
**Why:** evitar aparência de template/bubble SaaS.  
**Alternatives rejected:** arredondamento amplo em toda superfície.  
**Impact:** Wave 1/2 usam radius por função.  
**Applies from:** Wave 0.

### DD-004 Shadows

**Decision:** sombras só para layers elevadas reais.  
**Why:** hierarquia deve vir de estrutura, tipografia e semântica.  
**Alternatives rejected:** dashboard baseado em shadow cards.  
**Impact:** overlays sim, painéis normais sem sombra ornamental.  
**Applies from:** Wave 0.

### DD-005 Gold Usage

**Decision:** gold é raro e executivo.  
**Why:** preservar valor simbólico sem ruído visual.  
**Alternatives rejected:** gold como série genérica de gráfico.  
**Impact:** charts e highlights usam gold com parcimônia.  
**Applies from:** Wave 0.

### DD-006 Financial Semantics

**Decision:** cada estado financeiro tem linguagem própria.  
**Why:** recebido, cobrado, potencial, crédito e divergência não são equivalentes.  
**Alternatives rejected:** verde para qualquer valor positivo.  
**Impact:** Wave 2 KPIs e Wave 3 grids devem distinguir estados.  
**Applies from:** Wave 0.

### DD-007 Responsive Philosophy

**Decision:** mobile tem trabalho próprio: triagem, consulta, aprovação e alerta.  
**Why:** overflow horizontal em tabela crítica é D0.  
**Alternatives rejected:** desktop empilhado em mobile.  
**Impact:** Wave 3 cria `MobileRowCard`.  
**Applies from:** Wave 0.

### DD-008 Dashboard Hierarchy

**Decision:** dashboard responde decisão antes de quantidade.  
**Why:** `/backoffice` atual não é cockpit executivo.  
**Alternatives rejected:** grade maior de KPIs.  
**Impact:** Wave 2 cria Executive Pulse, Performance & Risk, Decision Queue e Intelligence.  
**Applies from:** Wave 0.

## 34. Technical Changes

Nenhuma alteração técnica aplicada.

Tokens criados/alterados no código: nenhum.  
Primitives criadas/alteradas no código: nenhuma.  
Sandbox visual: não criado nesta wave para evitar arquitetura desnecessária e porque o output obrigatório é documental.

## 35. Validation

Executado:
- `git status --short` antes da criação: limpo.
- Inspeção de `src/app/globals.css`, `package.json`, `components.json`, `postcss.config.mjs`.
- Inspeção de componentes fundacionais em `src/components/design-system`.
- `git diff --check -- docs/DESIGN_WAVE_0_DIRECTION.md`: PASS.
- `npm run lint`: PASS WITH WARNING. O warning existente vem de `src/components/design-system/data-table.tsx` sobre `useReactTable()` e React Compiler (`react-hooks/incompatible-library`), sem erro de lint.
- `npx tsc --noEmit`: PASS.

Como não houve alteração em código, não foi necessário subir app local nem fazer QA visual de regressão nesta wave.

## 36. Risks

- Wave 1 reinterpretar visualmente a constituição em vez de aplicá-la.
- Criar badges/counts sem autorização permission-aware.
- Implementar token novo quebrando consumidores legados.
- Fazer dashboard bonito, mas sem decisão.
- Usar gold ou teal como decoração.
- Adiar acessibilidade para polish.
- Tratar mobile como desktop empilhado.

## 37. Wave 1 Contract

Wave 1 não pode redefinir:
- Tipografia.
- Color semantics.
- Density.
- Surface system.
- Card policy.
- Sidebar/topbar principles.
- Page geometry.
- Focus/accessibility.
- Responsive philosophy.

Wave 1 deve implementar shell agrupado, role-aware e permission-safe sem criar navegação para itens FUTURE.

Status: READY.

## 38. Wave 2 Contract

Wave 2 não pode redefinir:
- KPI hierarchy.
- Decision-first structure.
- Financial semantics.
- Chart rules.
- Executive density.
- Risk language.
- Responsive behavior.
- Card restrictions.

Wave 2 deve provar a linguagem no `/backoffice` e parar no STOP Gate antes de Wave 3.

Status: READY.

## 39. Gate Assessment

Critérios:
1. Foundations explicitamente definidas: PASS.
2. Decisões implementáveis: PASS.
3. Tokens semânticos coerentes: PASS.
4. Contraste crítico adequado: PASS WITH CONDITIONS, pois não houve auditoria automatizada completa; nenhuma falha crítica foi identificada na inspeção documental.
5. Sem regressão estrutural: PASS, pois não houve alteração em código.
6. Wave 1 pode começar sem decisão visual fundamental pendente: PASS.
7. Wave 2 tem contrato visual claro: PASS.

Gate: `DESIGN DIRECTION APPROVED`.

## 40. Final Decision

`DESIGN DIRECTION APPROVED`.

A próxima rodada recomendada é Wave 1 Application Shell. Não iniciar Wave 2 antes de concluir o shell, e não iniciar Wave 3 antes do STOP Gate obrigatório da Wave 2.
