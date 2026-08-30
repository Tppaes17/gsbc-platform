# Rodada 40 — STG-12 AI Copilot Guardrails

Data: 2026-08-30

## Objetivo

Completar a STG-12 dentro do limite seguro definido pelo roadmap: copilots de baixa autonomia, sem execução autônoma, com proveniência, human-in-the-loop e guardrails auditáveis.

## Diagnóstico Inicial

O produto já tinha:

- `Negotiation Copilot` como insight de leitura;
- `Collections Copilot` como draft de próxima ação;
- tabela `ai_interacoes`;
- UI com aviso claro quando `ANTHROPIC_API_KEY` não está configurada;
- RLS de IA restrita a staff GSBC.

Gaps remanescentes:

- textos livres do contexto não eram sanitizados contra instruções maliciosas;
- interações de IA não registravam nível de autonomia;
- uso/aceite de sugestão não estava vinculado ao Policy Engine;
- não havia teste automatizado de prompt-injection, veto autônomo ou RLS de `ai_interacoes`.

## Implementação

### Guardrails de Contexto

Criado `src/lib/ai/guardrails.ts` com:

- truncamento de contexto textual;
- remoção de padrões instrucionais como `ignore previous instructions`, `system prompt`, `reveal the prompt`;
- metadados de campos sinalizados/truncados.

Aplicado em:

- `src/lib/ai/collections-copilot.ts`;
- `src/lib/ai/negotiation-copilot.ts`.

### Banco de Dados

Criada migration `supabase/migrations/0042_ai_copilot_guardrails.sql`.

Adicionado em `ai_interacoes`:

- `autonomy_level`;
- `context_safety`;
- `policy_decision_id`.

Adicionados requisitos de policy:

- `ai.suggestion_acceptance` -> `ALLOW` para staff GSBC;
- `ai.draft_send_notification` -> `REQUIRE_CONFIRMATION`;

Mantido:

- `ai.tool_execution` -> `GSBC_VETO`.

### Server Actions

Atualizado `Collections Copilot`:

- geração grava `context_safety` e `autonomy_level = 2`;
- aceite de sugestão consulta `evaluate_policy_action`;
- envio de rascunho passa por `ai.draft_send_notification`;
- decisão de policy fica vinculada em `ai_interacoes.policy_decision_id`.

Atualizado `Negotiation Copilot`:

- geração grava `context_safety` e `autonomy_level = 1`;
- aceite de sugestão consulta `evaluate_policy_action`;
- decisão de policy fica vinculada em `ai_interacoes.policy_decision_id`.

## RLS / Segurança

- Nenhuma policy de IA foi afrouxada.
- `ai_interacoes` permanece staff-only.
- Sindicato não lê nem cria interação de IA.
- Execução autônoma por IA permanece vetada pelo Policy Engine.

## Auditoria / Observabilidade

- `ai_interacoes` agora registra autonomia e segurança de contexto.
- Uso/aceite humano pode apontar para `policy_decisoes`.
- Policy runtime registra resultado, motivo, inputs e versão.

## Testes

Criado `e2e/copilotos-invariants.spec.ts`.

Cobertura:

- prompt-injection/context sanitization;
- uso de rascunho exige confirmação humana auditada;
- execução autônoma por IA recebe `GSBC_VETO`;
- sindicato não lê nem cria `ai_interacoes`.

## Gates Executados

| Comando | Resultado |
|---|---|
| `npx supabase db push --local` | passou; aplicou `0042_ai_copilot_guardrails.sql` |
| `npx tsc --noEmit` | passou |
| `npm run lint` | passou com warning conhecido em `src/components/design-system/data-table.tsx:62` |
| `npx supabase migration list --local` | passou; inclui `0042` |
| `npx supabase db diff --local --schema public,storage --use-migra` | passou; sem drift |
| `npx playwright test e2e/copilotos.spec.ts e2e/copilotos-invariants.spec.ts` | passou, 8/8 |
| `npm run test:e2e` | passou, 90/90 |

## Bugs Encontrados

- O erro transitório `The destination stream closed early` apareceu no webserver durante E2E, sem falhar teste. Mantido como P3 monitorado.

## Bugs Corrigidos

- Nenhum bug funcional novo na STG-12. Foram adicionados guardrails e testes.

## Riscos Residuais

- `ANTHROPIC_API_KEY` não está configurada localmente; chamadas reais de IA não foram exercitadas.
- MFA real ainda não existe; o Policy Engine retorna `REQUIRE_MFA` para ações financeiras críticas, mas não executa challenge.
- Agentes autônomos continuam bloqueados para execução por `GSBC_VETO`.
- RAG/search tenant-scoped ainda não foi implementado.
- Circuit breaker quantitativo de bulk automation ainda é futuro.

## Decisão Final

STG-12 concluída no escopo seguro de copilots baixa autonomia.

Agentes autônomos de cobrança não estão liberados para execução real. O produto está pronto para a próxima rodada de hardening produtivo: MFA/AuthorityDelegation, service-role matrix formal, PSP real/settlement e observabilidade externa.
