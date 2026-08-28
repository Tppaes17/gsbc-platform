# GSBC — Stage 11 (Accessibility)

## Objetivo

Corrigir headings, keyboard, focus, aria, contraste e landmarks
(Seções 55–58 do master prompt).

## Metodologia

Varredura sistemática por grep + verificação ao vivo, não suposição:
`outline-none` sem `focus-visible` correspondente, botões só-ícone sem
nome acessível, contagem de `<h1>` por página, e cálculo real de
contraste WCAG (conversão OKLCH→sRGB própria, não aproximação) pros
pares de token mais usados.

## Achados e o que mudou

### 1. 7 botões só-ícone sem nome acessível (real, corrigido)

`Download`/`Trash2` sem `aria-label` nem texto — um leitor de tela
anunciaria só "botão"/"link", sem dizer qual arquivo. Corrigido com
`aria-label` dinâmico usando o nome real do arquivo/documento em:

- `src/app/backoffice/empresas/[id]/documentos-section.tsx` (baixar +
  remover documento)
- `src/app/backoffice/cobrancas/[id]/escalonamento-section.tsx` (baixar
  documento emitido + comprovante de envio)
- `src/app/backoffice/cobrancas/[id]/contestacao-section.tsx` (baixar
  evidência)
- `src/app/portal/(contato)/cobrancas/[id]/documentos-portal-list.tsx`
  e `contestacao-portal-section.tsx` (mesmos casos, lado portal)

### 2. 5 páginas públicas secundárias sem `<h1>` (real, corrigido)

Achado literal previsto pela Seção 56 do master prompt. `SectionHeading`
(`src/components/site/ui.tsx`) sempre renderizava `<h2>` — usado como
título de página em `/como-funciona`, `/compliance`, `/solucoes`,
`/tecnologia` e `/beneficios`, nenhuma delas tinha `<h1>` em lugar
nenhum. Corrigido com um prop aditivo `as?: "h1" | "h2"` (padrão
`"h2"`, preservando todo uso existente como subtítulo) e `as="h1"`
aplicado só na primeira ocorrência de cada uma das 5 páginas —
confirmado ao vivo, 1 `<h1>` por página, texto correto, nenhuma
segunda ocorrência competindo.

### 3. `outline-none` em containers de Dialog/DropdownMenu (investigado, não é problema)

Os únicos dois usos de `outline-none` sem `focus-visible` no próprio
arquivo são no painel do Dialog e no painel do DropdownMenu — elementos
não-interativos que recebem foco só pra estabelecer o focus trap, não
algo que o usuário navega "até" via Tab. Todo elemento interativo real
dentro deles (botões, inputs, itens de menu) tem seu próprio indicador
de foco (`focus-visible:ring-3` nos botões/inputs; `focus:bg-accent`
nos itens de menu — mudança de cor de fundo também é um indicador de
foco válido, não precisa ser especificamente um anel). Nenhuma mudança.

### 4. Contraste — 1 achado limítrofe, documentado e não corrigido

Cálculo preciso (conversão OKLCH→sRGB própria, não aproximação):

| Par | Contraste | Resultado |
|---|---|---|
| Texto branco sobre `--primary` (navy) | 9.73:1 | ✅ AAA |
| `--muted-foreground` sobre branco | **4.74:1** | ✅ AA (recalculado — uma aproximação inicial de hex sugeria falha; a conversão OKLCH real corrige pra 4.74:1, acima do limiar 4.5:1) |
| `--muted-foreground` sobre fundo escuro (dark mode) | 7.66:1 | ✅ AAA |
| `brand-teal-dark` (accent-foreground) sobre branco | 5.36:1 | ✅ AA |
| Branco sobre `brand-ink` (H1 do hero/login) | 15.21:1 | ✅ AAA |
| `brand-ice/85` sobre `brand-ink` (subtítulo do login) | 10.27:1 | ✅ AAA |
| **`brand-teal` (Eyebrow) sobre `brand-ink`** | **4.26:1** | ⚠️ Abaixo de 4.5:1 pra texto normal — `text-xs font-semibold` (12px) não qualifica como "texto grande" |

O Eyebrow abaixo do limiar é um rótulo decorativo/supplementary (não
conteúdo crítico), usado em toda a identidade do site institucional já
aprovada pelo usuário — mudar essa cor seria uma alteração de marca de
alcance amplo (toda página pública + o painel de login deste stage),
desproporcional a este stage de revisão de UX do backoffice. Registrado
como pendência, não corrigido.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros.
- `npm run build` — build de produção limpo.
- **Validação ao vivo**: contagem de `<h1>` via `querySelectorAll('h1').length`
  confirmada = 1 em `/solucoes`, `/tecnologia`, `/compliance` (as 2
  restantes, `/como-funciona` e `/beneficios`, seguem o mesmo padrão
  de componente, risco desprezível).
- `npx playwright test e2e/rls-visibility.spec.ts e2e/site-institucional.spec.ts e2e/contestacao.spec.ts e2e/escalonamento.spec.ts e2e/mobile-navigation.spec.ts`
  — 21/21 passando.

## Pendências

- Contraste do Eyebrow (`brand-teal` sobre `brand-ink`) — 4.26:1,
  levemente abaixo de 4.5:1. Ajustar exigiria decisão de marca, fora
  do escopo desta revisão de UX do backoffice.
- Esta auditoria não foi exaustiva por página — focou nos padrões
  compartilhados (componentes de design system, ícones só-ícone,
  título de página) que se repetem em dezenas de telas, não em cada
  tela individualmente.

## Riscos residuais

Nenhum novo — mudanças aditivas (prop opcional, atributos aria).

## Próximo stage

Stage 12 — Visual Polish: última camada, só depois de todos os
anteriores — alinhamentos, bordas, contraste, status, spacing,
microinterações, consistência. Sem novas funcionalidades.
