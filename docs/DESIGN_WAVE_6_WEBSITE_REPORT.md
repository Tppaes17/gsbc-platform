# GSBC Design Wave 6 Website Report

Data: 2026-09-01  
Gate: `WAVE 6 PASS WITH CONDITIONS`  
Escopo: website público product-first, prova real de produto, claims, CTA, navegação pública, login transition e evidência visual.

## 1. Executive Result

Wave 6 concluída. A home pública foi reposicionada como website product-first de Enterprise SaaS vertical para entidades sindicais, com prova visual real do produto antes da promessa comercial. O gate é `WAVE 6 PASS WITH CONDITIONS` porque os critérios centrais passaram, mas ainda restam refinamentos de Wave 7 em páginas públicas secundárias, gate automatizado de acessibilidade e rotina formal de refresh/privacy review das screenshots.

## 2. Inputs Reviewed

Foram revisados `AGENTS.md`, `CODEX_DESIGN_WAVE_6_WEBSITE.md`, `docs/DESIGN_DEBT_REGISTER.md`, relatórios Waves 0-5, `docs/PRODUCT.md`, `docs/SECURITY.md`, `docs/MULTITENANCY.md`, `docs/DOMAIN_RULES.md`, website público, header/footer, login, componentes públicos, testes E2E existentes e evidências visuais de Waves 2.1-5.

## 3. Current Website Audit

| Area          | Current problem                              | KEEP                           | EVOLVE                               | REPLACE                               | REMOVE                                        |
| ------------- | -------------------------------------------- | ------------------------------ | ------------------------------------ | ------------------------------------- | --------------------------------------------- |
| Header        | Navegação ampla e menos orientada a produto. | Login e CTA real.              | Labels curtos.                       | IA pública por âncoras product-first. | Excesso de links no primeiro nível.           |
| Hero          | Promessa institucional antes do produto.     | Tom sóbrio.                    | Plataforma para entidades sindicais. | Hero com screenshot real.             | Visual decorativo sem prova.                  |
| Sections      | Repetição de benefícios/capacidades.         | Conteúdo institucional útil.   | Arquitetura por capacidade.          | Home IA condensada.                   | Claims genéricos.                             |
| Product proof | Ausente na primeira dobra.                   | Screenshots seguros das Waves. | Legendas por capacidade.             | Galeria real de produto.              | Stock/ilustração abstrata.                    |
| CTA           | "Diagnóstico gratuito" soava consultivo.     | Rota `/diagnostico`.           | Copy comercial honesta.              | "Solicitar demonstração".             | Promessa de integração comercial inexistente. |
| Footer        | Sitemap inflado.                             | Links úteis.                   | Segurança/governança.                | Footer mais enxuto.                   | Copy redundante.                              |
| Login         | Marca funcional, mas pouco conectada à home. | Auth intacta.                  | Continuidade visual.                 | Painel com screenshot real.           | Mudança de autenticação.                      |

## 4. Positioning Decision

Posicionamento aprovado: "plataforma de compliance, receita e operação para entidades sindicais". Cobrança permanece engine central, mas não é a identidade inteira do produto.

## 5. Audience

Públicos priorizados: Presidência/Diretoria, Financeiro, Jurídico/Compliance, Operação e gestão administrativa de entidades sindicais.

## 6. Product-First Thesis

Tese aplicada: Institutional Authority + Financial Intelligence + Enterprise Operations. A home mostra produto real no hero e usa seções posteriores para explicar problema, capacidades, governança e implantação.

## 7. Claims Register

| Claim                                   | Location            | Status                     | Evidence                                                       | Qualifier                                           | Decision  |
| --------------------------------------- | ------------------- | -------------------------- | -------------------------------------------------------------- | --------------------------------------------------- | --------- |
| Plataforma SaaS B2B multi-tenant        | Home, metadata      | SUPPORTED NOW              | `docs/PRODUCT.md`, `docs/MULTITENANCY.md`, E2E RLS             | Tenant isolation validado localmente                | Keep      |
| Compliance, receita e operação sindical | Home, header/footer | SUPPORTED NOW              | Rotas backoffice, E2E receita/cobranças/empresas               | Operação conforme módulos existentes                | Keep      |
| Auditoria e acesso por papel            | Home segurança      | SUPPORTED NOW              | `phase0-security.spec.ts`, `rls-visibility.spec.ts`            | Não afirma certificação                             | Keep      |
| IA assistiva, não autônoma              | Home FAQ/AI         | SUPPORTED WITH QUALIFIER   | `copilotos-invariants.spec.ts`, `politicas-invariants.spec.ts` | Exige revisão humana; sem execução crítica autônoma | Keep      |
| Pagamentos e conciliação                | Home capacidades    | SUPPORTED WITH QUALIFIER   | `payment-provider.spec.ts`, `reconciliation-center.spec.ts`    | Provider em simulação quando aplicável              | Keep      |
| 30-40% redução operacional              | Site anterior       | UNSUPPORTED - DO NOT CLAIM | Sem evidência local                                            | Nenhum                                              | Removed   |
| IA preditiva/autônoma                   | Site anterior       | UNSUPPORTED - DO NOT CLAIM | STG12 não é produto autônomo vendido                           | Nenhum                                              | Removed   |
| Certificações/uptime/logos/clientes     | Website             | UNSUPPORTED - DO NOT CLAIM | Não presentes em docs/evidências                               | Nenhum                                              | Not added |

## 8. Unsupported Claims Removed

Removidos ou evitados: redução operacional percentual sem prova, "IA para análise preditiva" como capacidade atual, linguagem de "diagnóstico gratuito" como oferta principal, "tempo real" em locais sem garantia técnica explícita e qualquer promessa de automação total, settlement, certificação, judicialização automática ou integração não comprovada.

## 9. Homepage IA

Home consolidada em: hero + product proof, problema operacional, capacidades, como a operação flui, revenue/collections, compliance, financial operations, governance/auditability, segurança/tenant isolation, públicos, implantação/FAQ e CTA final. A estrutura evita 14 blocos gigantes e reduz repetição.

## 10. Hero

Hero product-first com H1 objetivo, CTA principal "Solicitar demonstração", CTA secundário "Ver produto" e screenshot real do Executive Command Center em primeiro viewport.

## 11. First Fold

First fold responde: é software/plataforma; é para entidades sindicais; organiza compliance, receita, cobrança e governança; há produto real; o próximo passo é solicitar demonstração.

## 12. Product Proof

Provas usadas: Executive Command Center, Empresa Workspace, Cobranças Enterprise Grid e Critical Workflow/consequence preview. Assets ficam em `public/product-proof/`.

## 13. Narrative

Narrativa aplicada: fragmentação operacional -> contexto estruturado -> operação de cobrança/receita -> governança e decisão. Não há promessa de causalidade financeira não comprovada.

## 14. Capability Architecture

Capacidades organizadas em Compliance, Revenue Operations, Financial Operations, Governance e Executive Intelligence, sem vender features futuras como atuais.

## 15. Compliance

Compliance é apresentado como contexto de empresas, instrumentos, obrigações, evidências e distinção entre oportunidade, cobertura, obrigação e dívida.

## 16. Revenue Operations

Revenue Operations cobre cobranças, aging, negociações, escalonamentos e workflows críticos com intervenção humana e trilha auditável.

## 17. Financial Operations

Financial Operations cobre pagamentos, contratos financeiros, split/conciliação e revisão manual quando a fonte de verdade não autoriza automação.

## 18. Governance

Governance comunica permissões, auditoria, políticas e bloqueios de ação crítica. MFA/step-up e maker-checker genérico continuam como dívida, não como claim vendido.

## 19. Executive Intelligence

Executive Intelligence usa o Command Center como prova de métricas executivas, risco, aging e fila de decisão com dados suportados pelo produto.

## 20. Security

Segurança comunicada como tenant isolation, role-aware access, auditoria e proteção por RLS. Não foram adicionadas afirmações de certificações, compliance formal externo ou uptime.

## 21. AI Positioning

IA foi posicionada como assistiva e supervisionada. O website afirma que decisões críticas continuam humanas e auditáveis; não vende agente autônomo.

## 22. Screenshot Strategy

Screenshots foram recapturadas de superfícies reais do produto e publicadas como assets estáticos otimizados o bastante para uso local. Cada imagem tem legenda de capacidade e alt text.

## 23. Screenshot Privacy

As imagens usam dados demo/sintéticos do ambiente local. Não foram identificados secrets, env names, stack traces, dados reais de tenant ou linguagem interna bloqueadora nos assets finais. Condição: antes de uso comercial externo, instituir rotina de recaptura e revisão de privacidade.

## 24. CTA Strategy

CTA principal consolidado: "Solicitar demonstração". A rota `/diagnostico` foi preservada para não inventar integração comercial nem quebrar fluxo existente.

## 25. Contact/Demo Flow

Formulário de demonstração mantém server action e persistência existentes em `site_leads`, com success state validado por Playwright. Nenhuma API nova foi criada.

## 26. Public Navigation

Header curto: Plataforma, Capacidades, Segurança, Sobre, Entrar e Solicitar demonstração. Mobile menu validado em 375px.

## 27. Footer

Footer atualizado para apoiar posicionamento, capacidades reais e segurança/governança sem sitemap inflado.

## 28. Login Transition

Login recebeu continuidade visual com copy de plataforma e screenshot real, preservando `LoginForm` e autenticação intactos.

## 29. Copy System

Copy ficou mais precisa, curta e demonstrável. Buzzwords e números não provados foram removidos.

## 30. Visual Language

Visual mantém navy institucional, superfícies neutras, teal de progresso, gold raro, red/amber semântico, Geist Sans, números tabulares, bordas discretas e sombras mínimas.

## 31. Public Design Primitives

Foram reutilizados `Container`, `Eyebrow`, `SectionHeading`, `Button`, tokens globais e `lucide-react`. Não houve novo design system paralelo.

## 32. Responsive

Validado em 1920, 1440, 1024, 768, 375 e 320 por Playwright e screenshots.

## 33. Mobile

Mobile mantém proposta, CTA, product proof, menu e contato. Testes cobrem 375 e 320, incluindo first fold, product proof, menu e CTA/contact.

## 34. Accessibility

Validação disponível: headings, landmarks implícitos, labels de formulário, alt text, navegação por menu, touch targets e ausência de overflow crítico. Condição: axe/Lighthouse CI ainda não existe.

## 35. Motion

Não foram adicionadas animações pesadas ou dependência de motion. A página privilegia conteúdo estático, screenshots e layout estável.

## 36. Performance

Build passou. Imagens são servidas via `next/image` nas superfícies críticas; assets públicos têm pesos entre 96 KB e 413 KB. Não foram adicionadas dependências client-side.

## 37. SEO/Metadata

Metadata da home e diagnóstico foram revisadas para plataforma, compliance, receita e operação sindical. Não houve projeto SEO amplo, canonical/robots/sitemap.

## 38. Trust

Confiança vem de produto real, governança, auditoria, tenant isolation, política de decisão e processo de implantação factual. Não há logos, depoimentos, uptime ou certificações inventadas.

## 39. Onboarding

Implantação descrita como diagnóstico de dados, escopo operacional, configuração governada e acompanhamento. Sem prazo ou ROI inventado.

## 40. FAQ

FAQ cobre quem usa, dados necessários, segurança, cobrança/pagamentos, papel da entidade e implantação, com respostas factuais e qualificadas.

## 41. Legal/Financial Semantics

Preservada a distinção Opportunity != Coverage != Obligation != Debt. O website não sugere que toda empresa identificada deve pagar nem que acordo equivale a pagamento.

## 42. Content Reduction Test

PASS. A home reduziu repetição e trocou blocos genéricos por arquitetura de capacidades, provas de produto, FAQ e CTA final.

## 43. Product-First 10-Second Test

PASS. Em 10 segundos é possível identificar software, público, problema, capacidades, produto real e próximo passo.

## 44. Trust 30-Second Test

PASS. Produto, governança, segurança, operação e CTA aparecem sem depender de páginas secundárias.

## 45. Screenshot Proof Test

PASS. Cada imagem prova uma capacidade real: comando executivo, workspace de empresa, grade de cobranças e workflow crítico.

## 46. Claim Integrity Test

PASS. Scan textual não encontrou claims críticos bloqueados em `src/app/(site)`, `src/components/site` e `src/app/login`.

## 47. Enterprise Buyer Test

PASS. Diretoria, Financeiro, Jurídico/Compliance e Operação encontram relevância sem homes separadas.

## 48. Visual Premium Test

PASS. Website e backoffice agora compartilham linguagem de produto, densidade, sobriedade e screenshots reais.

## 49. Mobile Marketing Test

PASS. 375px e 320px preservam proposta, CTA, produto, menu, capacidades e contato.

## 50. Performance Test

PASS. `npm run build` passou com Next.js 16.3.1/Turbopack; sem regressão material identificada.

## 51. Security Review

PASS. Nenhum screenshot expõe secrets ou dados reais conhecidos. O texto de segurança não afirma certificações inexistentes. E2E de tenant isolation, service role, audit e webhook passou.

## 52. Technical Changes

Arquivos modificados: `src/app/(site)/page.tsx`, páginas públicas secundárias, `src/app/login/page.tsx`, `src/components/site/nav-items.ts`, `src/components/site/site-header.tsx`, `src/components/site/site-footer.tsx`, `e2e/site-institucional.spec.ts`, `e2e/website-wave-6-visual.spec.ts`, `docs/DESIGN_DEBT_REGISTER.md`, este relatório e nota de rodada.

## 53. Tests

Executados: `npx tsc --noEmit`, `npm run lint`, `npx playwright test e2e/site-institucional.spec.ts e2e/website-wave-6-visual.spec.ts`, lote focado de specs afetadas, `npm run test:e2e`, `npm run build`, `git diff --check`, scan de claims e inspeção de dimensões de screenshots.

## 54. Full E2E

Primeira execução completa: 103/117 passaram; 13 falhas por `ERR_CONNECTION_REFUSED` no início e 1 falha de promoção de prospecto. Reexecução focada dos afetados: 19/19 passou. Segunda execução completa: 117/117 passou.

## 55. Visual QA

Capturas geradas em `test-results/design-wave-6-website/`: 1920 first fold, 1440 first fold, 1440 full, product proof, governance/security, CTA final, login 1440, 1024, 768, 375 first fold, 375 product proof, 375 menu, 320 first fold e 320 CTA/contact.

## 56. Design Debt

Atualizado `docs/DESIGN_DEBT_REGISTER.md`: `D1-004`, `D2-007` e `D3-001` resolvidos; adicionados `W6-WEB-001`, `W6-WEB-002` e `W6-WEB-003`.

## 57. Regressions

Sem regressão material confirmada. A primeira execução completa teve instabilidade de servidor local, mas a reexecução focada e a segunda execução full ficaram verdes.

## 58. New Findings

`W6-WEB-001`: páginas secundárias ainda não têm a mesma maturidade product-first da home. `W6-WEB-002`: falta rotina de refresh/privacy review das screenshots. `W6-WEB-003`: falta axe/Lighthouse CI automatizado.

## 59. Remaining Risks

Riscos restantes: a home está pronta, mas páginas secundárias podem parecer menos premium; screenshots podem envelhecer conforme o produto mudar; acessibilidade visual foi validada manualmente/por E2E, mas sem auditor automatizado dedicado.

## 60. Wave 7 Readiness

Positioning está estável; homepage passou; product proof passou; claims passaram; mobile passou; login passou; performance é aceitável; não há D0/D1 crítico de website aberto; produto está pronto para audit final de polish/a11y. Condições da Wave 5 ainda abertas: step-up/MFA UX, maker-checker genérico, stale-state UX e consolidação de confirmações futuras.

## 61. Gate Assessment

`WAVE 6 PASS WITH CONDITIONS`. Os critérios bloqueadores passaram: first fold product-first, produto real visível, claims íntegros, screenshots seguros, mesma marca website/backoffice, 320/375 funcional, CTA/login funcionais, build e E2E completo verdes. Condições não bloqueadoras ficam para Wave 7.

## 62. Final Decision

Wave 6 concluída. Não iniciar Wave 7 automaticamente. Não foi feito commit, push, merge, migration, API change, RLS change ou deploy.
