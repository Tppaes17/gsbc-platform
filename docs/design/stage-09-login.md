# GSBC — Stage 9 (Login & Public Transition)

## Objetivo

Fazer a entrada na plataforma transmitir confiança equivalente ao site
institucional (achado #08 do
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2):
confirmado visualmente em 1440px — um card de ~380px sobre um fundo
cinza quase vazio, sem imagem, sem contexto institucional).

## O que mudou

`src/app/login/page.tsx` reescrito como um layout de duas colunas em
desktop (`lg:grid-cols-2`), reaproveitando a linguagem visual já
estabelecida do site institucional — não uma identidade nova:

- **Painel institucional** (`bg-brand-ink`, mesmo gradiente radial sutil
  do hero da home) — `SiteLogo` real (`src/components/site/logo.tsx`,
  o PNG fornecido pelo usuário, não recriado), o mesmo padrão de
  `Eyebrow` + H1 + parágrafo do hero da home, e 3 "pilares" que são a
  mesma lista `solucoes`/`vantagens` já usada em outras páginas do site
  — não uma nova promessa inventada, a mesma linguagem reafirmada.
- **Painel de acesso** — `Card` com heading "Entrar" real (antes só
  "GSBC" fazia esse papel) + descrição, `LoginForm` **totalmente
  intocado** (regra 4 do master prompt: nunca alterar autenticação), e
  uma linha de rodapé com ícone de escudo: "Ambiente de acesso
  restrito a usuários autorizados" — um sinal de confiança honesto
  (o controle de acesso é real, via Supabase Auth + RLS), não uma
  certificação ou selo inventado (regra 80 — nada de números, clientes
  ou selos fictícios).
- **Recuperação de senha**: avaliado e **não adicionado** — esse fluxo
  não existe no produto hoje. A Seção 42 do master prompt já prevê essa
  situação ("recuperação de senha quando fluxo existir") — adicionar um
  link morto seria funcionalidade falsa (regra 9).
- Mobile (`< lg`): painel institucional oculto (`hidden lg:flex`), logo
  pequena acima do card — mesma experiência funcional de antes, só com
  identidade visível.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros.
- `npm run build` — `/login` continua estático (○), nenhuma dependência
  de servidor introduzida.
- **Validação visual real** em 1440×900 e 390×844 — painel
  institucional renderizando logo/headline/pilares corretamente em
  desktop; mobile mostrando só o card, limpo.
- **Teste funcional real do login** (não só visual): submissão de fato
  do formulário com credencial válida — login bem-sucedido, redirecionado
  pra `/backoffice`, confirmando que o novo wrapper não interferiu na
  Server Action de autenticação.
- `npx playwright test e2e/rls-visibility.spec.ts e2e/site-institucional.spec.ts`
  — 10/10 passando. Como `loginAs()` (usado por praticamente toda spec
  do projeto) depende dos mesmos seletores do `LoginForm`
  (`getByPlaceholder`, `getByLabel("Senha")`, `getByRole("button", {name:
  "Entrar"})`), as ~50 execuções de teste já feitas ao longo desta sessão
  de revisão de design são, de fato, cobertura de regressão adicional
  pra este stage.

## Pendências

- Recuperação de senha — fora de escopo até o fluxo existir de verdade
  no produto.

## Riscos residuais

Nenhum novo — `LoginForm` (autenticação) não foi tocado; a mudança é
inteiramente no wrapper visual ao redor dele.

## Próximo stage

Stage 10 — Responsive: auditoria completa nas larguras 390/768/1024/1440
das principais páginas (login, dashboard, empresas, cobrança,
negociação, financeiro).
