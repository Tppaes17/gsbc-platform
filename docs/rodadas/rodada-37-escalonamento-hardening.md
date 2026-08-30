# Rodada 37 — STG-09 Escalonamento Extrajudicial Hardening

Data: 2026-08-30

## Objetivo

Endurecer o fluxo STG-09 de escalonamento/notificação extrajudicial, cobrindo automaticamente pontos que ainda dependiam de verificação manual:

- rejeição jurídica seguida de novo escalonamento;
- aprovação jurídica, emissão de documento e registro de envio físico;
- evidência física por referência externa auditável quando ainda não há arquivo anexado;
- garantia de que envio com falha não move a cobrança para `legal_escalation`.

## Diagnóstico

O fluxo STG-09 já existia de forma funcional desde a Rodada 25, com RLS, RPCs `SECURITY DEFINER`, geração de documento e central de escalonamentos.

Dois riscos permaneciam abertos:

- o E2E principal estava documentado como manual em `e2e/escalonamento.spec.ts`, deixando sem regressão automatizada o caminho `iniciar -> submeter -> rejeitar/aprovar -> gerar PDF -> enviar`;
- `public.registrar_envio` avançava o escalonamento para `enviada` e a cobrança para `legal_escalation` no primeiro envio registrado, mesmo se `p_delivery_status = 'falha'`.

## Implementação

### Banco de dados

Criada a migration `supabase/migrations/0038_escalonamento_delivery_evidence_hardening.sql`.

Alterações:

- adiciona `evidencia_referencia text` em `public.escalonamento_envios`;
- adiciona `observacao text` em `public.escalonamento_envios`;
- recria `public.registrar_envio(...)` com parâmetros opcionais `p_evidencia_referencia` e `p_observacao`;
- exige erro descritivo quando `p_delivery_status = 'falha'`;
- exige comprovante anexado ou referência externa auditável para canais físicos;
- só altera `escalonamentos.status` para `enviada` quando o envio não falha;
- só chama `change_cobranca_status(..., 'legal_escalation', ...)` no primeiro envio não falho.

### Aplicação

Arquivos alterados:

- `src/lib/validation/escalonamento.ts`
- `src/app/backoffice/cobrancas/[id]/escalonamento-actions.ts`
- `src/app/backoffice/cobrancas/[id]/escalonamento-section.tsx`
- `src/app/backoffice/cobrancas/[id]/page.tsx`
- `src/types/database.types.ts`
- `e2e/escalonamento.spec.ts`

Mudanças principais:

- envio físico passa a aceitar arquivo ou referência externa auditável;
- UI mostra referência e observação registradas na lista de evidências;
- server action passa a gravar `evidencia_referencia` e `observacao`;
- tipos Supabase foram alinhados ao novo contrato do RPC/tabela.

## Testes

Executados:

- `npx supabase db push --local` — passou; aplicou `0038_escalonamento_delivery_evidence_hardening.sql`;
- `npx tsc --noEmit` — passou;
- `npm run lint` — passou com 1 warning preexistente em `src/components/design-system/data-table.tsx:62` (`react-hooks/incompatible-library` por TanStack Table);
- `npx playwright test e2e/escalonamento.spec.ts` — passou, 6/6;
- `npx supabase db diff --local --schema public,storage --use-migra` — passou, sem drift;
- `npm run test:e2e` — passou, 75/75;
- `git diff --check` — passou.

## Cobertura Nova

`e2e/escalonamento.spec.ts` agora cobre:

- staff vê e opera a seção STG-09;
- staff/sindicato acessam a Central de Escalonamentos conforme transparência/RLS;
- fluxo completo via UI: iniciar escalonamento, submeter ao Jurídico, rejeitar, iniciar novo escalonamento, aprovar, gerar documento PDF, registrar envio físico com referência auditável;
- validação direta do RPC: envio com falha registra evidência, mas mantém escalonamento em `documento_emitido` e cobrança em `approved`.

## RLS, Auditoria e Multi-tenancy

- A escrita continua centralizada em RPC `SECURITY DEFINER`.
- `registrar_envio` continua exigindo `public.is_platform_staff(auth.uid())`.
- As tabelas de escalonamento mantêm RLS de leitura para staff e membros do tenant.
- Eventos continuam imutáveis; falha de envio fica registrada como `observacao` no histórico e como `delivery_status = 'falha'` em `escalonamento_envios`.
- Fixtures E2E criam tenants próprios e limpam dados ao final.

## Riscos Residuais

- Entrega real por correio/cartório continua dependente de operação externa; o sistema registra evidência, não comprova autonomamente o fato jurídico.
- Envio por e-mail ainda depende de configuração SMTP real em ambiente produtivo.
- O warning de lint do React Compiler/TanStack Table permanece fora do escopo desta rodada.

## Status

STG-09 hardening concluído.

Próxima fase recomendada: avançar para a próxima etapa do roadmap somente após revisão humana do diff e confirmação de que o comportamento de envio físico por referência externa é aceitável para o processo operacional/jurídico da GSBC.
