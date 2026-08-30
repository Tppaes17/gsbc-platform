# Rodada 38 — STG-10 Revenue Opportunity Engine Completion

Data: 2026-08-30

## Objetivo

Fechar a STG-10 como inteligência de oportunidade não executória, usando `docs/STG_10_INVARIANTS.md` e `docs/STG_10_EVAL_PLAN.md` como gates de aceite.

## Diagnóstico Inicial

A implementação existente de STG-10 já possuía:

- tabela `oportunidades`;
- fatores explicáveis em `oportunidade_fatores`;
- eventos em `oportunidade_eventos`;
- scoring determinístico em `src/lib/oportunidades/scoring.ts`;
- UI de avaliação e decisão humana em prospectos.

Gaps encontrados:

- os testes eram majoritariamente smoke;
- os fatores não persistiam proveniência estruturada;
- os eventos não distinguiam avaliação inferencial de revisão humana;
- a auditoria de oportunidade enviava `tenantId: null` mesmo quando a entidade tinha `tenant_candidato_id`, gerando falha contra a função de audit hardening.

## Implementação

### Banco de Dados

Criada a migration `supabase/migrations/0040_stg10_opportunity_provenance.sql`.

Adições em `oportunidade_fatores`:

- `source_type`;
- `source_fields`;
- `evidence_snapshot`.

Adições em `oportunidade_eventos`:

- `actor_type`;
- `decision_nature`;
- `before_state`;
- `after_state`.

Nenhuma tabela de obrigação, cobrança, payment charge, notificação, escalonamento ou delivery foi alterada.

### Backend / Domínio

Atualizado `src/lib/oportunidades/scoring.ts` para retornar proveniência por fator:

- campos de origem;
- natureza do sinal (`observed_data` ou `derived_inference`);
- snapshot mínimo de evidência.

Atualizado `src/app/backoffice/prospectos/oportunidade-actions.ts` para:

- persistir proveniência dos fatores;
- registrar avaliação como `system` + `inference`;
- registrar análise/validação/descarte como `human` + `human_review`;
- gravar `before_state` e `after_state`;
- corrigir auditoria para usar `tenant_candidato_id` quando a oportunidade possui tenant candidato.

### UI

Atualizado `src/app/backoffice/prospectos/[id]/oportunidade-section.tsx` para:

- rotular o valor como `Estimativa econômica inferida`;
- exibir proveniência de cada fator.

Atualizado `src/app/backoffice/prospectos/[id]/page.tsx` para carregar os novos campos de proveniência.

### Tipos

Atualizado `src/types/database.types.ts` para refletir a migration `0040`.

## Testes

Criado `e2e/oportunidades-invariants.spec.ts`.

Cobertura adicionada:

- scoring determinístico;
- proveniência explícita por fator;
- oportunidade não cria obrigação, cobrança, payment charge, notificação, escalonamento nem envio;
- sindicato não lê, altera nem insere oportunidades;
- revisão humana preserva fatores e registra contexto auditável.

## Gates Executados

| Comando | Resultado |
|---|---|
| `npx supabase db push --local` | passou; aplicou `0040_stg10_opportunity_provenance.sql` |
| `npx tsc --noEmit` | passou |
| `npm run lint` | passou com warning conhecido em `src/components/design-system/data-table.tsx:62` |
| `npx supabase migration list --local` | passou; inclui `0040` |
| `npx supabase db diff --local --schema public,storage --use-migra` | passou; sem drift |
| `npx playwright test e2e/oportunidades.spec.ts e2e/oportunidades-invariants.spec.ts` | passou, 6/6 |
| `npm run test:e2e` | passou, 81/81 |

## Bugs Encontrados e Corrigidos

- `oportunidade-actions.ts` registrava audit log com `tenantId: null` para oportunidade com `tenant_candidato_id`. A função `log_audit_event` bloqueou corretamente o mismatch. Corrigido para auditar com o tenant real da oportunidade.

## RLS / Autorização

- Nenhuma policy foi afrouxada.
- STG-10 continuou restrita a Owner via RLS e route guard.
- Teste novo confirma que usuário de sindicato não lê, altera nem insere oportunidades.
- Nenhum novo uso de service role foi adicionado.

## Auditoria

- Avaliação automatizada agora é marcada como inferência.
- Revisão humana agora é distinguível e contém antes/depois.
- Fatores de score preservam proveniência estruturada.

## Riscos Residuais

- MFA/step-up e `AuthorityDelegation` permanecem pendentes para STG-11/produção.
- Matriz formal de service role permanece pendente para STG-11.
- PSP real/settlement permanecem fora do escopo de STG-10.
- STG-11 e STG-12 ainda exigem seus próprios testes de invariant.
- Warning React Compiler/TanStack Table permanece como P2.

## Decisão Final

STG-10 concluída.

Revenue Opportunity Engine permanece não executório: oportunidade é inferência, não obrigação jurídica, cobrança, comunicação externa ou efeito financeiro.

Próximo estágio recomendado: STG-11 Policy Engine, começando por authority/delegation/decision runtime antes de qualquer automação mais forte.
