# GSBC — Stage 5 (Dashboard)

## Objetivo

Transformar a home do backoffice num cockpit operacional — as 4
perguntas da Seção 38 do master prompt (tamanho da operação, quanto
está movimentado, o que exige atenção, o que aconteceu recentemente) —
e remover o aviso desatualizado de Documentos (achado #03 do
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2):
o módulo de Documentos já existe e funciona desde a Rodada 20, o aviso
"chega em uma próxima rodada" estava simplesmente errado).

## O que mudou

`src/app/backoffice/page.tsx` reorganizado em 4 `PageSection` (Stage 1):

1. **Tamanho da operação** — Sindicatos, Empresas, Instrumentos,
   Usuários, Memberships (5 métricas já existentes, só reagrupadas).
2. **Quanto está sendo movimentado** — Valor em cobrança, Negociações
   em andamento, Total pago (3 métricas já existentes).
3. **Atenção necessária** — **nova**, só pra staff GSBC. Reusa a mesma
   fonte de dado de `/backoffice/operacoes` (`work_items` com status
   `aberto`/`adiado`, mesmo cálculo de vencido por `due_at`) — dado
   real, já auditado nessa outra tela, nenhuma métrica inventada.
   `RiskPanel` (Stage 1) com tom `negative` se há item vencido,
   `warning` caso contrário, link "Ver central operacional". **Seção
   inteira omitida quando não há nada aberto** — regra 39: não criar
   estado "tudo em dia" fake quando o dado simplesmente não existe pra
   mostrar.
4. **O que aconteceu recentemente** — **nova**. Últimos 5 eventos de
   `audit_logs` (já usado por `/backoffice/auditoria`, RLS escopando
   por tenant automaticamente — mesma tabela, mesma policy, nenhuma
   query nova de segurança). Renderizado com o `Timeline` do Stage 1.
   Mapa `AUDIT_ACTION_LABEL` traduz as ~45 ações reais registradas no
   código (levantadas por grep no repositório inteiro, não uma amostra)
   pra texto legível — ação sem entrada no mapa cai no código bruto
   (`action` original), nunca quebra.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros (a primeira versão usou
  `Date.now()` e foi barrada pela regra de pureza do React Compiler;
  corrigido pra `new Date().getTime()`, o mesmo padrão já usado em
  `operacoes/page.tsx`).
- `npm run build` — build de produção limpo.
- **Validação visual real** em 1440×900, staff e sindicato: 4 seções
  renderizando, aviso de Documentos confirmado ausente, feed de
  atividade recente mostrando eventos reais e distintos por tenant
  (RLS visivelmente diferente entre as duas contas de teste).
- **Seção "Atenção necessária" testada com fixture real**: inserido um
  `work_items` de teste (`99000000-...`, vencido) diretamente no banco
  → seção apareceu com tom vermelho, contagem e link corretos → fixture
  removida → seção voltou a desaparecer, confirmando que não é
  renderizada com dado zero.
- Baseline de dado real reverificado intacto: 322 dossiês, 2 empresas,
  1 cobrança, 1 pagamento, 5 políticas, `work_items` de volta a 0.
- `npx playwright test e2e/dashboard-cockpit.spec.ts` (novo, 2 testes)
  + `rls-visibility` + `mobile-navigation` — 13/13 passando.

## Pendências

- Nenhuma pendência de escopo — as 4 entregas do Stage 5 (Seção 38-40
  do master prompt) foram cobertas com dado real em todas.

## Riscos residuais

| Risco | Observação |
|---|---|
| `AUDIT_ACTION_LABEL` precisa ser atualizado quando uma ação nova for adicionada em código | Baixo — fallback pro código bruto da ação garante que nunca quebra, só fica menos bonito até o mapa ser atualizado |

## Próximo stage

Stage 6 — Forms: aplicar `FormSection` (Stage 1) em formulários longos
— dados cadastrais, contato, informações financeiras — com feedback de
erro, helper text e estado de submit padronizados.
