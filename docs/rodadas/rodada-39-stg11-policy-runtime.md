# Rodada 39 — STG-11 Policy Engine Runtime

Data: 2026-08-30

## Objetivo

Completar a STG-11 com uma API explícita de decisão de políticas, auditável e determinística, sem criar linguagem própria complexa.

## Diagnóstico Inicial

O Policy Engine existente já tinha:

- tabela `policies`;
- tabela append-only `policy_decisoes`;
- toggles via `alternar_policy_ativa()`;
- duas políticas aplicadas em fluxos reais;
- três políticas registradas como documentação de comportamento já implementado.

Gap canônico remanescente:

- não havia runtime único para responder `ALLOW`, `DENY`, `REQUIRE_CONFIRMATION`, `REQUIRE_MFA`, `REQUIRE_MAKER_CHECKER`, `REQUIRE_ENTITY_AUTHORITY` ou `GSBC_VETO`;
- os testes eram predominantemente smoke;
- STG-12/automação futura não tinha um gate claro para impedir execução autônoma antes dos evals.

## Implementação

### Banco de Dados

Criada a migration `supabase/migrations/0041_policy_decision_runtime.sql`.

Adicionado:

- policy registry row `policy_decision_runtime`;
- tabela `policy_action_requirements`;
- função `evaluate_policy_action(...)`.

A matriz inicial cobre:

- `policy.toggle` -> `ALLOW` para Owner, falha fechada para não autorizado;
- `negociacao.discount_approval` -> `REQUIRE_MAKER_CHECKER`;
- `finance.critical_execution` -> `REQUIRE_MFA`;
- `ai.tool_execution` -> `GSBC_VETO`;
- ação desconhecida -> `DENY`.

### Segurança / RLS

- `policy_action_requirements` tem RLS de leitura para staff GSBC.
- Não há grant de insert/update/delete para usuários autenticados.
- `evaluate_policy_action` é `SECURITY DEFINER`, mas não executa a ação avaliada: apenas decide e registra.
- Toda avaliação gera `policy_decisoes`.

### Tipos

Atualizado `src/types/database.types.ts` com:

- `PolicyDecisionResult`;
- tabela `policy_action_requirements`;
- RPC `evaluate_policy_action`.

## Testes

Criado `e2e/politicas-invariants.spec.ts`.

Cobertura adicionada:

- runtime retorna `ALLOW` e registra decisão versionada;
- usuário sem autoridade falha fechado;
- ação financeira crítica retorna `REQUIRE_MFA`;
- execução autônoma por IA retorna `GSBC_VETO`;
- ação desconhecida retorna `DENY` e registra log.

## Gates Executados

| Comando | Resultado |
|---|---|
| `npx supabase db push --local` | passou; aplicou `0041_policy_decision_runtime.sql` |
| `npx tsc --noEmit` | passou |
| `npm run lint` | passou com warning conhecido em `src/components/design-system/data-table.tsx:62` |
| `npx supabase migration list --local` | passou; inclui `0041` |
| `npx supabase db diff --local --schema public,storage --use-migra` | passou; sem drift |
| `npx playwright test e2e/politicas.spec.ts e2e/politicas-invariants.spec.ts` | passou, 8/8 |
| `npm run test:e2e` | passou, 86/86 |

## Bugs Encontrados e Corrigidos

Nenhum bug regressivo encontrado na STG-11. A implementação foi aditiva.

## Decisões Arquiteturais

- Não criar DSL de políticas.
- Manter lógica crítica em SQL/TypeScript explícito.
- Usar matriz simples de requisitos por `action_code`.
- Separar decisão de execução: `evaluate_policy_action` não executa side effects.
- Veto de execução autônoma por IA fica explícito antes de STG-12.

## Riscos Residuais

- MFA/step-up real ainda não existe; o runtime retorna `REQUIRE_MFA` mas não completa o challenge.
- `AuthorityDelegation` formal ainda não existe.
- Adoção do runtime em todos os fluxos críticos futuros deve ser feita incrementalmente.
- STG-12 ainda precisa de evals de prompt injection, proveniência e circuit breaker.

## Decisão Final

STG-11 concluída como runtime mínimo, auditável e controlável.

Próximo estágio recomendado: STG-12 AI Copilot + Agentic Collections, limitado inicialmente a copilots de baixa autonomia e bloqueado para execução autônoma por `GSBC_VETO` até cumprir evals próprios.
