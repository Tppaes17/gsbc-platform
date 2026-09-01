# GSBC Pre-Demo Release Audit And Website Remediation Report

Data: 2026-09-01  
Executor: Codex  
Gate tecnico: `PRE-DEMO FAIL`  
Gate humano: `DEMO READY` nao concedido por Codex  
Estado: `WAVE 6 REOPENED FOR REMEDIATION`; `STG-10 HOLD`; `RESULTA HOLD`

## 1. Executive Result

Auditoria pre-demo executada sobre o codigo local atualmente aberto. Foram corrigidos dois problemas materiais de apresentacao publica: linguagem interna/QA exposta na home e screenshots de produto renderizadas com altura excessiva por uso de imagem inteira sem crop controlado.

Build local, typecheck, lint, a11y, smoke pre-demo local e E2E completo passaram. O gate permanece `PRE-DEMO FAIL` porque o protocolo exige validar o candidate deployment Vercel correspondente ao codigo auditado, e nenhum candidate URL/deployment ID foi fornecido nesta rodada.

## 2. Trigger

O Product Owner reportou erros no deploy e solicitou aplicar `CODEX_PRE_DEMO_RELEASE_AUDIT_AND_WEBSITE_REMEDIATION.md`.

## 3. Formal State

- `STG-10`: HOLD.
- `WAVE 6`: REOPENED FOR REMEDIATION.
- `WAVE 7`: TECHNICALLY COMPLETED / FINAL PRESENTATION GATE SUSPENDED.
- `DESIGN SYSTEM`: ACCEPTED WITH DEBT.
- `BRAND MIGRATION RESULTA`: HOLD.
- `DEMO READY`: NOT GRANTED.

## 4. Deployment Identification

| Campo | Resultado |
| --- | --- |
| Candidate URL | Nao fornecido |
| Deployment ID | Nao disponivel |
| Commit local | `b2df7baf3c1a53e92be110fedcc36625ba0a2719` |
| Branch local | `main` |
| Projeto Vercel local | `.vercel/project.json` presente e ignorado pelo git |
| Prova deployment <-> codigo | Nao obtida |
| Status | `STOP` para validacao real de deployment |

## 5. Baseline

O build local antes da remediacao passou. A auditoria encontrou evidencias locais suficientes para corrigir problemas de website, mas nao reproduziu falha de build.

## 6. Inputs Reviewed

Revisados: `AGENTS.md`, `CODEX_PRE_DEMO_RELEASE_AUDIT_AND_WEBSITE_REMEDIATION.md`, `docs/DESIGN_WAVE_6_WEBSITE_REPORT.md`, `docs/DESIGN_WAVE_7_FINAL_ACCEPTANCE_REPORT.md`, `docs/DESIGN_SYSTEM_ACCEPTANCE_GUIDE.md`, `docs/DESIGN_DEBT_REGISTER.md`, `docs/PUBLIC_PRODUCT_SCREENSHOT_MANIFEST.md`, `src/proxy.ts`, `src/lib/supabase/proxy.ts`, `src/lib/supabase/env.ts`, `src/lib/supabase/server.ts`, `src/lib/auth/session.ts`, `src/app/(site)/page.tsx`, `src/app/login/page.tsx`, `src/app/(site)/diagnostico/page.tsx`, `src/components/site/site-header.tsx`, `src/components/site/site-footer.tsx`, `playwright.config.ts`, E2E de website/auth/a11y e `vercel.json`.

## 7. Production Reality Matrix

| Surface | Local | E2E | Vercel Candidate | Expected | Actual | Severity | Root Cause | Fix | Retest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | PASS | PASS | NOT TESTED | Home comercial apresentavel | Local ok apos remediacao | P1 resolved | CONTENT/VISUAL | Copy e crop de screenshots | PASS local |
| `/login` | PASS | PASS | NOT TESTED | Login acessivel | Local ok | P0 unknown on deploy | ENV/AUTH possivel | Sem mudanca auth local | PASS local |
| Entrar | PASS | PASS | NOT TESTED | CTA leva a `/login` | Local ok | P0 unknown on deploy | Nao comprovado | Smoke cobre fluxo | PASS local |
| Logout | PASS | PASS | NOT TESTED | Sai para `/login` | Local ok em E2E completo | P0 unknown on deploy | Nao comprovado | Sem mudanca | PASS local |
| Rota protegida anonima | PASS | PASS | NOT TESTED | Redirect para `/login` | Local ok | P0 unknown on deploy | Proxy/layout | Smoke cobre `/backoffice` | PASS local |
| Backoffice autenticado | PASS | PASS | NOT TESTED | Abre com usuario demo | Local ok | P0 unknown on deploy | Env/cookies/callback possivel | Sem mudanca | PASS local |
| Sessao invalida/expirada | PARTIAL | PASS via guards | NOT TESTED | Sem loop | Local nao apontou loop | P1 unknown on deploy | Cookies/env possivel | Sem mudanca | PASS local parcial |
| `/diagnostico` | PASS | PASS | NOT TESTED | Form renderiza e envia | Local ok | P1 unknown on deploy | Supabase env possivel | Sem mudanca | PASS local |
| Product proof | PASS | PASS | NOT TESTED | Imagens reais, contidas, sem QA | Local ok apos remediacao | P1 resolved | VISUAL/CONTENT | Aspect-ratio + copy | PASS local |
| Header/footer | PASS | PASS | NOT TESTED | Links criticos funcionam | Local ok | P2 unknown on deploy | Nao comprovado | Smoke cobre nav/CTA | PASS local |
| Mobile nav | PASS | PASS | NOT TESTED | Menu abre/navega | Local ok | P1 unknown on deploy | Nao comprovado | E2E existente | PASS local |
| Assets | PASS | PASS | NOT TESTED | PNGs carregam | Local ok | P1 unknown on deploy | Nao comprovado | Smoke cobre assets | PASS local |
| 404 | NOT TESTED | Existing build route ok | NOT TESTED | Sem stack interna | Pendente candidate | P2 open | Deployment evidence ausente | Nao alterado | Pending |

## 8. Login P0 Audit

Localmente, `/login` renderiza H1 institucional, campos `E-mail` e `Senha`, botao `Entrar` e painel visual de continuidade. `/backoffice` anonimo redireciona para `/login`.

No deployment candidato, o login nao foi auditado porque faltou URL/ID. Possiveis causas de falha observada no deploy, a confirmar: variaveis Supabase ausentes/incorretas, `NEXT_PUBLIC_APP_URL` apontando para dominio errado, callbacks Supabase Auth nao liberados para preview/production, cookies cross-domain ou deployment antigo/cacheado.

## 9. Auth Root Cause

Root cause de login no Vercel: indeterminado. O codigo local de Proxy/guard esta consistente com Next 16 (`src/proxy.ts` + `src/lib/supabase/proxy.ts`) e o build mostra `Proxy (Middleware)`.

## 10. Login Remediation

Nenhuma remediacao de auth foi aplicada por tentativa e erro. Isso preserva o principio do protocolo: corrigir auth somente com evidencia do candidate deployment.

## 11. Homepage Fold Audit

Hero: mantido product-first com screenshot real do Command Center.  
Product proof: antes expunha copy de testes automatizados e podia gerar altura excessiva; corrigido.  
Capacidades: sem claims proibidos detectados.  
Operacao: imagem real preservada.  
Seguranca: linguagem adequada sobre servidor/banco sem vender certificacao.  
Audiencias/implantacao/FAQ/final CTA: sem linguagem interna bloqueadora apos scan.

## 12. Hero

Preservado. O H1 continua `Compliance, receita e operação sindical em uma plataforma governada`; CTA primario continua `Solicitar demonstração`; CTA secundario continua `Ver produto`.

## 13. Internal Language

Finding P1: `src/app/(site)/page.tsx` mencionava `ambiente de demonstração usado nos testes automatizados`. Isso violava o MUST FIX do protocolo.

Fix: substituido por linguagem comercial: `Produto real, dados demonstrativos e capacidades suportadas` e descricao sem referencias a QA/testes.

Retest: scan em `src/app/(site)` e `src/components/site` nao encontrou `testes automatizados`, `ambiente de testes`, `E2E`, `QA`, `Wave`, `STG`, `Codex`, `Vercel`, `env` ou `deployment` em copy publica do site.

## 14. Product Proof

Finding P1: screenshots `executive-command-center.png`, `login-transition.png` e `empresa-workspace.png` possuem proporcao alta (`1440x1705` e `1440x3281`) e eram renderizadas com `h-auto w-full`, causando composicao crua/alta e risco de grandes vazios.

Fix: `ProductProofCard` agora usa container `relative aspect-[16/10] max-h-[430px]` com `Image fill` e `object-cover object-left-top`.

## 15. Screenshot Composition

O crop preserva produto real, prioriza topo/esquerda da tela e nao fabrica feature, dado ou UI inexistente. Regioes criticas: Command Center, relacoes do workspace, grid operacional e dialogo de consequencia.

## 16. Whitespace / Rhythm

Root cause local: uso de assets verticais longos sem limite de altura. Corrigido por dimensao estavel de container, nao por decoracao ou preenchimento artificial.

## 17. Commercial QA

Localmente, a home deixou de parecer um artefato de QA no bloco de product proof. Gate comercial real ainda depende de inspecao do URL Vercel pelo Product Owner.

## 18. Header / Nav / CTA

Local PASS via E2E: `Plataforma`, `Capacidades`, `Segurança`, `Sobre`, `Entrar`, `Solicitar demonstração` e menu mobile foram exercitados por testes existentes e smoke.

## 19. CTA

`Solicitar demonstração` leva a `/diagnostico`. `Entrar` leva a `/login`. Retestado localmente.

## 20. Diagnostico

`/diagnostico` renderiza formulario com labels e envio local passou em `e2e/site-institucional.spec.ts`. Em deployment, ainda depende de Supabase env e URL candidata.

## 21. Public Routes

Presentation critical: `/`, `/login`, `/diagnostico`.  
Supporting: `/beneficios`, `/tecnologia`, `/sobre`, `/contato`, `/solucoes`, `/compliance`, `/como-funciona`.  
Hidden/internal: nenhuma rota publica nova criada.  
Remove/redirect candidates: nao avaliados nesta rodada.

## 22. Protected Routes

`/backoffice` e rotas filhas continuam protegidas por Proxy e layout. Local PASS em smoke e E2E completo.

## 23. 404 / Error

Nao validado no candidate deployment. Build local inclui `/_not-found`.

## 24. Console / Network

Sem captura do candidate deployment. E2E local completo passou sem falhas materiais. Hydration warning Base UI permanece divida aceita da Wave 7, nao reaberta nesta remediacao.

## 25. Assets

Smoke local validou carregamento de:

- `/product-proof/executive-command-center.png`
- `/product-proof/empresa-workspace.png`
- `/product-proof/cobrancas-enterprise-grid.png`
- `/product-proof/critical-workflow-payment.png`
- `/product-proof/login-transition.png`

## 26. Metadata

Mantida marca GSBC. RESULTA permanece HOLD.

## 27. Responsive / Mobile

Local PASS: testes de website cobrem 1920, 1440, 1024, 768, 375 e 320. A11y cobre mobile/zoom 200%.

## 28. Browser Coverage

Chromium PASS. WebKit/Safari-like nao executado porque `playwright.config.ts` define apenas projeto Chromium; tentativa via `--browser=webkit` foi rejeitada pela CLI por configuracao com projects.

## 29. Accessibility

`npm run test:a11y`: 5/5 passed.

## 30. Performance

Nao re-medida em production-like por falta de candidate deployment. Lighthouse dev anterior 77 permanece como condicao, nao como baseline de producao.

## 31. Claim Integrity

Scan publico local sem claims proibidos e sem linguagem interna critica apos remediacao.

## 32. Security / Privacy

`.env.local` e `.vercel/project.json` estao ignorados pelo git e nao aparecem versionados. Nenhum secret foi adicionado. Nenhuma migration/API/RLS foi alterada.

## 33. Demo Data

Dados demo locais seguem usados pelos E2E. Candidate deployment nao validado; antes de compartilhar URL, confirmar tenant demo e ausencia de dados reais indevidos.

## 34. Demo Journey

Localmente, partes do roteiro foram cobertas pela suite: home, product proof, login, Command Center, Empresa Workspace, Cobrança Workspace, critical workflows, financeiro/operacional e logout. Jornada no candidate deployment permanece bloqueada por falta de URL.

## 35. Shareholder Presentation Test

| Pergunta | Local | Candidate |
| --- | --- | --- |
| Produto abre? | Sim | Nao testado |
| Marca consistente? | Sim, GSBC | Nao testado |
| SaaS claro? | Sim | Nao testado |
| Login funciona? | Sim local | Nao testado |
| Dados demo convencem? | Parcial/local | Nao testado |
| Linguagem interna removida? | Sim no site publico | Nao testado |
| Tela quebrada? | Nao observado localmente | Nao testado |
| URL apresentavel sem ressalva? | Nao aplicavel | Nao comprovado |

## 36. Visual Evidence

Evidencias locais atualizadas por `e2e/website-wave-6-visual.spec.ts` em `test-results/design-wave-6-website/`. Evidencia do candidate deployment: pendente.

## 37. Deployment Smoke

Criado `e2e/pre-demo-release-smoke.spec.ts`, com `BASE_URL` configuravel pelo Playwright existente.

Uso esperado:

```bash
BASE_URL=https://candidate-url.vercel.app npx playwright test e2e/pre-demo-release-smoke.spec.ts
```

Local result: PASS.

## 38. Vercel Preview / Production

Projeto local esta linkado, mas Codex nao executou deploy, commit, push ou merge. Candidate preview/production precisa ser informado pelo Product Owner ou validado por ferramenta Vercel autorizada.

## 39. Root Causes

- `CONTENT`: linguagem de testes automatizados em copy publica.
- `VISUAL`: screenshots longas renderizadas sem art direction.
- `PROCESS GAP`: Waves anteriores validaram local/build/E2E, mas nao exigiram candidate deployment smoke como gate final.
- `DEPLOYMENT`: pendente; erros reportados no Vercel nao puderam ser classificados sem URL/logs.

## 40. P0

Aberto: candidate deployment nao identificado.  
Nao reproduzido localmente: login indisponivel, protected route exposta, app inacessivel, leak ou demo journey impossivel.

## 41. P1

Resolvidos:

- Copy publica com linguagem interna/QA em `src/app/(site)/page.tsx`.
- Product proof/login visualmente altos demais por `h-auto` em assets verticais em `src/app/(site)/page.tsx` e `src/app/login/page.tsx`.

## 42. P2 / P3

Aberto: validacao de 404/error, console/network e WebKit no candidate deployment.

## 43. Remediation

Arquivos modificados:

- `src/app/(site)/page.tsx`
- `src/app/login/page.tsx`
- `e2e/site-institucional.spec.ts`
- `e2e/website-wave-6-visual.spec.ts`
- `e2e/pre-demo-release-smoke.spec.ts`

Migrations: nenhuma.

## 44. Design System Compliance

Preservado. Nao houve redesign estrutural nem alteracao de componentes globais de dominio.

## 45. Tests

- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS com warning conhecido `react-hooks/incompatible-library` em `src/components/design-system/data-table.tsx`.
- `npm run build`: PASS.
- `npx playwright test e2e/pre-demo-release-smoke.spec.ts e2e/site-institucional.spec.ts e2e/website-wave-6-visual.spec.ts`: 9/9 PASS.
- `npm run test:a11y`: 5/5 PASS.
- `npm run test:e2e`: 123/123 PASS.
- `git diff --check`: PASS.
- WebKit focused E2E: NOT RUN, config atual define somente Chromium.
- Deployment smoke contra candidate URL: NOT RUN, URL nao fornecido.

## 46. Full E2E

`123 passed (3.9m)`.

## 47. Build

`next build` compilou, executou TypeScript, gerou 41 paginas estaticas e preservou `Proxy (Middleware)`.

## 48. A11y

Axe/public/auth/mobile/zoom: PASS local.

## 49. WebKit

Pendente. Recomendado adicionar projeto WebKit temporario/permanente ou executar em ambiente de CI com browser instalado antes de demo externa.

## 50. Candidate Deployment Retest

Bloqueado. Necessario URL Vercel candidato e, idealmente, deployment ID/commit SHA.

## 51. Regressions

Nenhuma regressao detectada localmente.

## 52. Remaining Risks

- Candidate deployment pode estar usando env incorreto ou deployment antigo.
- Supabase Auth callbacks podem nao incluir o dominio preview/production.
- `NEXT_PUBLIC_APP_URL` no Vercel pode divergir do URL compartilhado, afetando magic links/webhooks simulados.
- WebKit/Safari-like ainda nao validado nesta rodada.
- Product Owner ainda precisa aprovar composicao visual real no URL.

## 53. Brand Hard-Code Inventory

Inventariado sem substituir: `GSBC` aparece em logo, metadata, footer, login, textos de backoffice, e-mails e dominio de contato. RESULTA permanece fora de escopo.

## 54. Permanent Release Rule

Mudanca que afete website publico, autenticacao, navegacao global ou assets criticos exige:

1. Local tests.
2. Build.
3. E2E.
4. A11y.
5. Candidate deployment smoke com `BASE_URL`.
6. Visual/commercial QA no URL real.
7. Product Owner gate antes de producao.

## 55. Product Owner Checklist

- [ ] Homepage correta no URL Vercel.
- [ ] Hero aprovado.
- [ ] Sem linguagem interna/QA no URL Vercel.
- [ ] Product proof apresentavel.
- [ ] Header/nav funcionam.
- [ ] Solicitar demonstracao funciona.
- [ ] Entrar funciona.
- [ ] Login aparece.
- [ ] Autenticacao funciona.
- [ ] Command Center abre.
- [ ] Empresa abre.
- [ ] Cobranca abre.
- [ ] Critical workflow apresentavel.
- [ ] Financeiro/Operacao apresentaveis.
- [ ] Logout funciona.
- [ ] Mobile aceitavel.
- [ ] Sem erro visual constrangedor.
- [ ] Sem dado sensivel.
- [ ] URL apresentavel aos socios sem ressalva operacional.

## 56. STG-10 Hold Status

`STG-10` permanece HOLD.

## 57. Brand Migration Hold Status

`RESULTA` permanece HOLD.

## 58. Technical Gate

`PRE-DEMO FAIL`.

Motivo: falta de candidate deployment Vercel verificavel. Localmente, os P1 comprovados foram corrigidos e os testes passaram.

## 59. Human Gate

`AWAITING PRODUCT OWNER DEPLOYMENT REVIEW`.

## 60. Final Recommendation

Gerar ou informar um candidate deployment Vercel correspondente ao commit auditado, configurar/confirmar variaveis de ambiente e callbacks Supabase, rodar:

```bash
BASE_URL=https://candidate-url.vercel.app npx playwright test e2e/pre-demo-release-smoke.spec.ts
```

Depois executar a jornada manual de demo no mesmo URL antes de compartilhar com os socios.
