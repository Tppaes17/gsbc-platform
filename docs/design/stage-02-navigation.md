# GSBC — Stage 2 (Navigation & App Shell)

## Objetivo

Resolver a navegação mobile perdida — achado #01 do
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2)
(severidade High: abaixo de 768px o backoffice não tinha nenhuma forma
de navegar, confirmado por renderização real em 390px) — sem duplicar a
regra de permissão entre desktop e mobile.

## O que mudou

- `src/components/backoffice/sidebar-nav.tsx` — `SidebarNav` ganhou um
  prop opcional `onNavigate` (chamado no clique de cada item, sem
  efeito por padrão). A filtragem por `requiresPlatformStaff`/
  `ownerOnly` sobre `NAV_ITEMS` continua exatamente a mesma — nenhuma
  segunda lista, nenhuma regra duplicada (regra crítica da Seção 14).
- `src/components/backoffice/mobile-sidebar.tsx` (novo) — drawer
  usando o `Sheet` do shadcn/Base UI (já existia no projeto, sem uso
  até este stage). Renderiza a mesma `SidebarNav`, passando
  `onNavigate={() => setOpen(false)}` — fecha sozinho ao navegar.
  Botão de abrir (`aria-label="Abrir menu"`) visível só em `md:hidden`.
- `src/app/backoffice/layout.tsx` — `MobileSidebar` inserido no header,
  ao lado da wordmark "GSBC"; `tenantLabel` calculado uma vez e
  compartilhado entre a sidebar desktop e o drawer mobile (mesmo texto
  nos dois lugares). Sidebar desktop (`hidden md:flex`) intocada.

Não foi criado um `AppShell` como arquivo separado: `layout.tsx` já é o
único ponto de composição do shell do backoffice (não há duplicação de
estrutura entre páginas hoje) — extrair um wrapper adicional só
adicionaria indireção sem resolver duplicação real nenhuma.

## Comportamento verificado ao vivo

- **Botão de menu visível** — confirmado em 390px: ícone de hambúrguer
  ao lado de "GSBC" no header, ausente em 1440px.
- **Abre drawer, mostra os mesmos links autorizados** — confirmado:
  staff vê os 13 itens completos (incluindo Políticas, Prospectos —
  `requiresPlatformStaff`/`ownerOnly`); sindicato vê só o subconjunto
  autorizado, mesma regra da sidebar desktop.
- **Item ativo identificado** — confirmado: "Empresas" com destaque
  visual depois de navegar para `/backoffice/empresas`.
- **Fecha após navegação** — confirmado por interação real (não só
  leitura de código): clicar num link do drawer navega via App Router
  client-side E fecha o drawer sozinho, sem re-render forçado da
  página.
- **Escape fecha** — confirmado.
- **Foco gerenciado** — herdado do primitivo `Dialog` do Base UI
  (mesma base já usada em todo diálogo do produto — focus trap e
  Escape nativos, não implementados à mão nesta rodada).

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros.
- `npm run build` — build de produção limpo.
- **Validação visual real** em 390×844 e 1440×900 — abrir/fechar o
  drawer, navegar por dentro dele, e confirmar a sidebar desktop
  intocada.
- `npx playwright test e2e/mobile-navigation.spec.ts` (novo, 4 testes:
  abrir + navegar + fechar sozinho; Escape fecha; sindicato vê só o
  subconjunto autorizado; desktop sem botão de menu) — 4/4 passando.
- Regressão ampla: `rls-visibility`, `politicas`, `regua-cobranca`,
  `copilotos` — 16/16 passando, nenhuma quebra por reorganizar o
  header/layout compartilhado por todo o backoffice.

## Pendências

- Nenhuma — Stage 2 cobre exatamente o que o master prompt pediu para
  este stage (navegação mobile + shell consolidado).

## Riscos residuais

| Risco | Observação |
|---|---|
| `Sheet` (Base UI Dialog) usado pela primeira vez fora dos diálogos de formulário existentes | Baixo — mesmo primitivo, comportamento de acessibilidade já validado em produção nos outros diálogos do app |

## Próximo stage

Stage 3 — Typography & Layout: eliminar a aparência de admin genérico
(achado #07) revisando largura de página, hierarquia de título,
spacing e uso de cards — sem redesign extravagante.
