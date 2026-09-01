# Rodada 44 — Design Wave 6 Website

Data: 2026-09-01  
Gate: `WAVE 6 PASS WITH CONDITIONS`

## Objetivo

Aplicar a Wave 6 do plano de design: transformar o website público em uma apresentação product-first de Enterprise SaaS vertical para entidades sindicais, com prova real de produto, claims íntegros, CTA claro e continuidade visual até o login.

## Diagnóstico

A home anterior comunicava autoridade institucional antes de provar produto, usava visual mais decorativo, CTA de diagnóstico com leitura consultiva e não colocava screenshots reais na primeira dobra. Também havia claims frágeis como percentuais de redução operacional e IA preditiva como capacidade atual.

## Implementação

- Reestruturada a home em `src/app/(site)/page.tsx` com hero product-first, screenshot real, capacidades, governança, segurança, públicos, FAQ e CTA final.
- Adicionados assets seguros em `public/product-proof/` para Command Center, Empresa Workspace, Cobranças Enterprise Grid e Critical Workflow.
- Atualizados header, footer e navegação pública para Plataforma, Capacidades, Segurança, Sobre, Entrar e Solicitar demonstração.
- Atualizado login em `src/app/login/page.tsx` para manter continuidade visual sem alterar autenticação.
- Atualizada página de demonstração preservando a rota `/diagnostico` e o fluxo real de lead.
- Ajustadas páginas públicas secundárias para remover claims/copy incompatíveis e consolidar CTA.
- Adicionados testes públicos e visuais em `e2e/site-institucional.spec.ts` e `e2e/website-wave-6-visual.spec.ts`.

## Arquitetura / API / Dados

Nenhuma migration, API, RLS, tabela, RPC, auth flow ou integração foi criada/modificada. A rodada foi exclusivamente frontend, conteúdo público, assets e testes.

## Claims

Removidos claims não comprovados como redução operacional percentual, IA preditiva atual, "tempo real" sem garantia explícita e linguagem de diagnóstico gratuito como CTA principal. AI foi posicionada como assistiva/supervisionada.

## Testes

- `npx tsc --noEmit`: passou.
- `npm run lint`: passou com 1 warning conhecido em `src/components/design-system/data-table.tsx` (`useReactTable`/React Compiler).
- `npx playwright test e2e/site-institucional.spec.ts e2e/website-wave-6-visual.spec.ts`: 8/8 passou.
- `npm run build`: passou.
- `git diff --check`: passou.
- `npm run test:e2e`: primeira execução 103/117 por instabilidade inicial de servidor local; reexecução focada 19/19; segunda execução completa 117/117 passou.

## Evidências Visuais

Capturas geradas em `test-results/design-wave-6-website/` para 1920, 1440, 1024, 768, 375 e 320, incluindo first fold, product proof, governance/security, CTA final, login, menu mobile e CTA/contact mobile.

## Dívida Atualizada

`docs/DESIGN_DEBT_REGISTER.md` marcou `D1-004`, `D2-007` e `D3-001` como resolvidos e adicionou riscos `W6-WEB-001`, `W6-WEB-002` e `W6-WEB-003`.

## Pendências / Riscos

- Páginas públicas secundárias ainda precisam receber o mesmo refinamento product-first da home.
- Falta rotina formal de recaptura/revisão de privacidade das screenshots públicas.
- Falta axe/Lighthouse CI automatizado.
- Condições da Wave 5 ainda abertas: step-up/MFA UX, maker-checker genérico, stale-state UX e consolidação futura de confirmações.

## Próximo Staging

Wave 7 pode começar com foco em polish/a11y/design system consolidation, sem iniciar automaticamente nesta rodada.
