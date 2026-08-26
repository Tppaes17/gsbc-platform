# Testes E2E (Playwright)

Testes reais contra o stack local (Postgres + RLS + Next.js), não mocks —
mesma disciplina de verificação usada manualmente em todas as rodadas
(regra 92).

## Pré-requisitos

1. `supabase start` (stack local rodando).
2. `npm run dev` de pé (por padrão em `http://localhost:3000` — ajuste
   `BASE_URL` se estiver em outra porta).

## Rodando

```bash
npm run test:e2e
```

## Specs

- **`rls-visibility.spec.ts`** — somente leitura. Confirma que a equipe
  GSBC vê tudo (cross-tenant) e pode gerenciar; que o sindicato só
  acompanha (sem botões de escrita) e nunca vê o campo "Sem responsável
  definido" para staff GSBC (regressão do bug real corrigido na
  migration `0009`). Seguro rodar quantas vezes quiser, sem reset.
- **`financeiro-e-notificacoes.spec.ts`** — somente leitura + envio de
  notificação (idempotente, seguro rodar sempre). Confirma a regra de
  negócio da Rodada 13: uma negociação aceita com desconto fecha a
  cobrança pelo valor ACORDADO, não pelo valor_cobranca original
  (migration `0015`) — o seed já reflete isso (1 pagamento de
  R$1.150,00 fecha uma cobrança de R$1.285,00 original).
- **`site-institucional.spec.ts`** — páginas públicas e o formulário de
  diagnóstico. Idempotente (só insere linhas em `site_leads`).
- **`inteligencia-cadastral.spec.ts`** — só visibilidade (Owner vê a seção,
  sindicato não vê nada). A consulta em si (que chama a BrasilAPI de
  verdade e muta o dossiê) é verificada manualmente, não automatizada —
  ver `docs/rodadas/rodada-14.md`.

## O que falta cobrir

- Isolamento cross-tenant de verdade (hoje só existe 1 sindicato
  semeado — precisaria de uma segunda entidade no seed para testar que
  o tenant A nunca vê dados do tenant B).
- Fluxos de criação (nova empresa, novo instrumento, nova obrigação) —
  cobertos manualmente a cada rodada, ainda não automatizados.
