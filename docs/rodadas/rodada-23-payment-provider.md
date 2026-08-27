# GSBC — Rodada 23 (STG-06 — Payment Provider Integration)

## Objetivo
Conectar a GSBC a um provider de pagamento real (Pix/boleto), com
abstração `PaymentProvider`/`Adapter`, IDs internos separados dos
externos, webhooks (assinatura, idempotência, persistência bruta,
revisão manual) e mapeamento de status externo → estado canônico
interno (`docs/roadmap-stagings.md`, STG-06).

## Decisão confirmada com o usuário antes de implementar
Sem provider contratado ainda. Em vez de escolher um provider às cegas
ou adiar a rodada inteira, o usuário optou por: construir a abstração
completa (interface, webhook, mapeamento de status, idempotência) com
um adapter de **simulação** ('mock') claramente identificado como tal
em todo lugar — banco (`provider = 'mock'`), UI (banner permanente "Nenhum
provider de pagamento real está conectado") e nomes de arquivo. Nenhuma
cobrança real é gerada. Trocar por um provider de verdade depois é só
implementar a mesma interface `PaymentProvider` num novo adapter —
nenhum outro arquivo do sistema muda.

## Diagnóstico e decisões arquiteturais

### "Charge" é conceitualmente diferente de "pagamento"
`payment_charges` (intenção de cobrança — Pix/boleto, pode expirar sem
nunca ser paga) é uma entidade nova, deliberadamente separada de
`pagamentos` (Rodada 8, ledger imutável do que foi de fato recebido).
`register_pagamento()` (Rodada 8) continua sendo o único caminho pra
lançar um pagamento — reaproveitado aqui via cliente admin quando o
webhook confirma `status=paid`, em vez de duplicar a cascata de status
da cobrança numa segunda função.

### internal_id vs external_id — nunca confundidos
`payment_charges.id` é o internal_id; `payment_charges.external_id` é o
que o provider retorna (regra explícita do roadmap). Um índice único
parcial em `(provider, external_id)` garante que o mesmo external_id
nunca aparece duas vezes pro mesmo provider.

### Webhook: persistência bruta ANTES de qualquer decisão
`payment_webhook_events` grava o payload cru assim que a requisição
chega — mesmo quando a assinatura é inválida ou o parse falha (regra
explícita do roadmap: "raw event persistence"). Idempotência por
`unique (provider, external_event_id)`: uma entrega duplicada (retry do
provider, ou o mesmo evento reenviado) nunca reprocessa — o segundo
insert bate no conflito e o handler responde "duplicate" sem tocar em
mais nada.

### Evento fora de ordem: estado terminal de sucesso nunca é desfeito
Se uma charge já está `paid`/`refunded` e chega um evento de
`expired`/`cancelled` depois (entrega atrasada, fora de ordem), o
webhook é marcado `ignored` e a charge não muda — um pagamento que já
aconteceu nunca é revertido por um evento tardio que só chegou depois.
Verificado ao vivo (ver Testes).

### Sem RPC nova — orquestração em TypeScript com o cliente admin
Diferente de outras rodadas que usaram uma função `security definer`
pra concentrar lógica de autorização, o processamento de webhook não
precisou disso: a requisição não tem sessão de usuário nenhuma (vem do
provider, não de alguém logado), então `createAdminClient()` (service
role, contorna RLS por completo) já é o mecanismo certo — mesmo
raciocínio já documentado em `src/lib/supabase/admin.ts` pro cron do
motor de cobrança (STG-02) e pro webhook, agora seu quarto caso de uso
documentado ali. Toda a orquestração (persistir evento, checar
duplicidade/fora de ordem, chamar `register_pagamento`, atualizar a
charge) vive em `src/lib/payments/webhook-processor.ts`, mesmo padrão
já usado em `collection/engine.ts` (STG-02).

### UI exclusiva de staff — mesmo padrão da régua de cobrança
`PaymentChargesSection` só aparece pra staff GSBC na ficha da cobrança
— não porque a RLS proíba o sindicato de ler `payment_charges` (a
policy de select já segue o padrão de transparência de sempre, staff-ou-
tenant-member), mas porque é uma ferramenta operacional de teste/gestão,
não um artefato de transparência (mesma decisão já tomada pra régua de
cobrança na Rodada 19).

### Portal (STG-05) não foi conectado a isso
O botão "Pagar" cortado na Rodada 22 (STG-05) continua cortado — expor
uma cobrança Pix/boleto *simulada* pra uma empresa de verdade no portal
pareceria funcionalidade real sem ser (regra 9 do AGENTS.md). A seção
de cobrança via provider desta rodada é uma ferramenta interna de
teste/preparação, não uma tela voltada à empresa. Conectar o portal ao
"pagar" real fica pra quando um provider de verdade existir.

## Implementações
- `payment_charges` / `payment_webhook_events`
  (`0024_payment_provider.sql`).
- `src/lib/payments/provider.ts` — interface `PaymentProvider`
  (`createCharge`, `getCharge`, `cancelCharge`, `refundPayment`,
  `verifyWebhookSignature`, `parseWebhookEvent`).
- `src/lib/payments/mock-provider.ts` — adapter de simulação (HMAC-
  SHA256 pra assinar/verificar, igual ao mecanismo que um provider real
  usaria) + `buildSimulatedWebhookPayload()`, usado só pela ação de
  teste "Simular webhook".
- `src/lib/payments/registry.ts` — resolve o adapter pelo nome; único
  ponto que muda quando um provider real for adicionado.
- `src/lib/payments/webhook-processor.ts` — orquestração completa:
  assinatura → persistência bruta → idempotência → charge encontrada? →
  estado terminal? → atualiza charge → `register_pagamento` se pago.
- `/api/webhooks/payments/[provider]` — endpoint público (sem sessão).
- `PaymentChargesSection` na ficha da cobrança (staff): gerar Pix/boleto
  simulado + botões "Simular: Pago/Expirado/Cancelado" pra testar o
  pipeline real de webhook sem depender de infraestrutura externa.
- `e2e/payment-provider.spec.ts`.

## Arquivos criados
`supabase/migrations/0024_payment_provider.sql`,
`src/lib/payments/{provider.ts, mock-provider.ts, registry.ts, webhook-processor.ts}`,
`src/app/api/webhooks/payments/[provider]/route.ts`,
`src/app/backoffice/cobrancas/[id]/{payment-charge-actions.ts, payment-charges-section.tsx}`,
`e2e/payment-provider.spec.ts`.

## Arquivos alterados
`src/types/database.types.ts`, `src/lib/supabase/admin.ts`,
`src/app/backoffice/cobrancas/[id]/page.tsx`, `.env.example`.

## Banco de dados
`0024_payment_provider.sql`: 2 tabelas novas, RLS staff-ou-tenant
(select) / staff-only (insert/update) em `payment_charges`, staff-only
(select) em `payment_webhook_events` — nenhuma escrita de
`payment_webhook_events` é feita por cliente autenticado, só pelo
endpoint de webhook via service role.

## Segurança
- Segredo de assinatura (`MOCK_PROVIDER_WEBHOOK_SECRET`) só
  server-side — nunca prefixado `NEXT_PUBLIC_`, nunca exposto ao
  cliente.
- Toda requisição ao webhook tem a assinatura verificada antes de
  qualquer confiança no corpo — verificado ao vivo (ver Testes) que uma
  assinatura forjada é rejeitada com 401 **e ainda assim persistida**
  (auditoria não depende do processamento ter dado certo).
- `payment_webhook_events` nunca escrito por cliente autenticado — só
  service role, mesma justificativa já documentada pro cron e pro
  Portal.

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92) — a lista de
cenários é literalmente a que o roadmap pede ("Sandbox oficial: pago,
expirado, cancelado, duplicado, evento fora de ordem, retry"),
adaptada pro adapter de simulação já que não existe sandbox de um
provider real ainda:

- **Pago**: gerei um Pix simulado numa cobrança de teste real → cliquei
  "Simular: Pago" (dispara um HTTP POST assinado de verdade pro
  endpoint real, exatamente como o provider faria) → charge virou
  "Paga" na hora, `pagamentos` recebeu uma linha nova
  (`forma_pagamento='pix'`, observação citando a charge), e a cobrança
  em si passou de "Aprovada" pra "Paga" — cascata completa confirmada
  no banco (`payment_charges.pagamento_id` aponta pro pagamento certo).
- **Expirado**: gerei um boleto simulado na mesma cobrança → "Simular:
  Expirado" → charge virou "Expirada", **nenhum pagamento novo foi
  criado** (confirmado por contagem — continuou 1).
- **Cancelado**: mesmo caminho de código do "expirado" (só muda a
  string de status), não repetido — risco incremental baixo.
- **Duplicado/retry**: reenviei o **mesmo** payload assinado (mesmo
  `event_id`) uma segunda vez via curl direto no endpoint → resposta
  `"status": "duplicate"`, nada reprocessado.
- **Evento fora de ordem**: com a charge já "Paga", enviei um evento
  `EXPIRADA` pra ela (simulando uma entrega atrasada) → resposta
  `"status": "ignored"`, charge continuou "Paga" — confirmado que um
  evento tardio nunca desfaz um pagamento que já aconteceu.
- **Assinatura inválida**: POST com assinatura forjada → HTTP 401, e o
  evento **ainda assim** foi persistido em `payment_webhook_events`
  (`signature_valid=false`, `processing_status='error'`) — confirmado
  por query direta.
- **Provider desconhecido**: POST pra
  `/api/webhooks/payments/provider-inexistente` → 404, coberto em e2e.
- **Ciclo completo repetido em staging** (Supabase Cloud + Vercel): gerar
  Pix → simular "Pago" via HTTP real → cobrança de teste foi de
  "Aprovada" pra "Paga" no ambiente publicado — não só local.
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` sem erros.
- **e2e automatizado** (`e2e/payment-provider.spec.ts`, 4 testes,
  cobrindo o que não muda dado em staging): 4/4 passando em staging.
  Suíte completa: 31/34 passando — as mesmas 3 falhas pré-existentes já
  documentadas nas Rodadas 21/22 (SMTP sem provider customizado, dados
  de prospectos não resetados), nenhuma nova.
- Todos os artefatos de teste (cobranças, charges, eventos de webhook,
  pagamentos, audit logs) apagados depois, local e staging — os 322
  prospectos reais, 3 empresas (staging) / 2 empresas (local) e a
  cobrança seed permanecem intactos (reverificado por contagem após
  cada limpeza).

### O que não foi testado ao vivo
- **Cancelado**: mesmo código do "expirado", só muda a string de status
  mapeada — ver Testes acima.
- **Refund (`refundPayment`)**: implementado na interface e no adapter
  de simulação (retorna um `refundId` fictício), mas sem UI/action de
  staff pra disparar — a Central de cobrança ainda não tem um botão de
  estorno; fica como ponto de extensão explícito quando um provider
  real (com fluxo de estorno de verdade) existir.
- **Um provider real de verdade** — decisão confirmada com o usuário,
  fora de escopo desta rodada.

## Pendências
- **Nenhum provider real conectado** — decisão explícita do usuário.
  Quando o usuário decidir um provider (Pix + boleto, considerando
  split de repasse já previsto pro STG-07), implementar um novo adapter
  (`ProviderXAdapter`) na mesma interface e trocar
  `ACTIVE_PAYMENT_PROVIDER` em `src/lib/payments/registry.ts`.
- **Portal (STG-05) sem "pagar"** — continua deliberadamente fora até
  existir um provider real (ver Diagnóstico acima).
- **Botão de estorno (`refundPayment`)** na UI de staff — capability já
  implementada no adapter, sem UI ainda.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Sem provider real — plataforma não cobra de verdade ainda | Alto (esperado) | Decisão explícita do usuário; abstração pronta pra reduzir o esforço de conectar um provider depois |
| "Cancelado" não testado ao vivo separadamente do "expirado" | Baixo | Mesmo código, mesma cobertura de fato |
| Refund sem UI de staff | Baixo | Capability existe na interface/adapter; só falta o botão quando fizer sentido priorizar |

## Regras de negócio pendentes
Nenhuma nova — a decisão de não conectar um provider real e não expor
"pagar" no portal já estava confirmada com o usuário antes de
implementar.

## Próximo staging recomendado
STG-07 (Split, Conciliação e Repasses) continua o ciclo financeiro —
mas depende de haver pagamentos de verdade fluindo por um provider real
pra fazer sentido completo (split/conciliação sobre simulação tem valor
limitado). Alternativa: STG-08 (Revenue Command Center do Sindicato),
que pode ser construído sobre os dados já reais existentes
(cobrancas/pagamentos/negociações) sem depender de um provider — talvez
a ordem mais produtiva agora, dado que STG-06 ficou como abstração sem
provider conectado.
