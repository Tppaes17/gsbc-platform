# GSBC Design System Acceptance Guide

Status: guia operacional pós-Wave 7.  
Última revisão: 2026-09-01.  
Escopo: manter a fundação visual/UX aceita sem abrir uma nova onda de redesign.

## Princípios

- Reutilizar tokens de `src/app/globals.css` antes de criar cor, radius ou sombra local.
- Usar componentes de `src/components/design-system/` para padrões de domínio e `src/components/ui/` para primitivas base.
- Preservar semântica financeira/jurídica: oportunidade, cobertura, obrigação, cobrança, acordo e pagamento não são sinônimos.
- Ações críticas precisam explicar consequência, não efeito e reversibilidade antes de confirmar.
- Frontend reflete permissão; RLS/backend continuam autoridade final.

## Inventário

| Component                | Class  | Use when                                                             | Accessibility expectation                                         | Mobile behavior                                            |
| ------------------------ | ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `DataTable`              | CORE   | Lista operacional com colunas, ordenação, paginação e busca local.   | `tableLabel`, `aria-sort`, busca com label real, botões textuais. | Usar `renderMobileCard` em superfícies críticas.           |
| `TableToolbar`           | CORE   | Busca, contadores, filtros e ações de tabela.                        | Input `type=search` com `aria-label`; reset com texto visível.    | Empilha controles sem ocultar ação.                        |
| `MobileRowCard`          | CORE   | Fallback mobile de tabelas críticas.                                 | Labels textuais, não depender só de cor.                          | Substitui tabela comprimida abaixo de breakpoint definido. |
| `StatusBadge`            | CORE   | Status operacional/financeiro/jurídico.                              | Label claro; cor sempre acompanhada de texto.                     | Manter compacto e legível.                                 |
| `EmptyState`             | CORE   | Ausência real de dados ou resultado filtrado vazio.                  | Título específico e CTA somente quando existe ação autorizada.    | Evitar caixas superdimensionadas.                          |
| `ActionConsequencePanel` | DOMAIN | Ação L2/L3 com efeito externo, financeiro, jurídico ou privilegiado. | Explicar efeito, não efeito, auditoria e reversibilidade.         | Deve caber em dialog com scroll controlado.                |
| `EntityWorkspace`        | DOMAIN | Detalhes de entidades centrais com contexto persistente.             | Navegação local por âncoras e headings estáveis.                  | Preservar contexto antes de seções longas.                 |
| `ExecutiveKpi`           | DOMAIN | Métricas executivas com definição e tendência suportada.             | Definição acessível por summary/foco.                             | Evitar competir com cards secundários.                     |
| `ChartFrame`             | DOMAIN | Gráficos com pergunta operacional e contexto.                        | Título/pergunta textual; não depender só de cor.                  | Deve preservar legenda e leitura.                          |
| `Timeline`               | DOMAIN | Histórico auditável de eventos.                                      | Ordem cronológica compreensível e timestamps legíveis.            | Quebrar texto longo sem overflow.                          |
| `ConfirmationDialog`     | LEGACY | Ações simples/reversíveis sem consequência crítica.                  | Título, descrição e cancelamento claro.                           | Migrar para `ActionConsequencePanel` em ações L2/L3.       |
| `MetricCard`             | LEGACY | Métrica simples não executiva.                                       | Label e valor textuais.                                           | Evitar proliferação card-heavy.                            |

## Tokens

- `brand-ink` e `brand-navy`: estrutura institucional, fundos fortes e texto de alta hierarquia.
- `brand-teal`: progresso/ação contextual em fundos claros; não usar como texto pequeno sobre fundos escuros.
- `brand-gold`/`brand-gold-light`: acento raro, CTA e pequenos textos sobre fundos escuros.
- `success`, `warning`, `destructive`, `info`: status semântico; não usar como decoração.
- `muted-foreground`: texto secundário; não reduzir opacidade de textos que precisam passar contraste.

## Contribuição

- PR que toca UI crítica deve rodar `npm run lint`, `npx tsc --noEmit`, `npm run test:a11y` e testes E2E focados.
- PR que altera homepage, login, Command Center, workspaces, grids ou critical workflows deve atualizar evidência visual quando a mudança for material.
- Novos componentes devem declarar uso, expectativa de acessibilidade e comportamento mobile.
- Não adicionar novo icon set sem decisão explícita.
- Não criar claim público sem evidência local e qualifier quando necessário.

## Visual Regression

- Baseline atual: `test-results/design-wave-7-final/`.
- Viewports mínimos: 1440, 375 e 320 para website/login; 1440 e 375 para superfícies autenticadas críticas.
- Atualização de screenshot deve ser revisão controlada, não efeito colateral de qualquer mudança.

## Acessibilidade

- `npm run test:a11y` é gate local para axe critical/serious em rotas representativas, skip link, teclado, dialog crítico, mobile, zoom/reflow e screenshots finais.
- Lighthouse deve ser usado como sinal complementar, não como certificação.
- Não declarar WCAG compliance formal sem processo de auditoria externo/contínuo.
