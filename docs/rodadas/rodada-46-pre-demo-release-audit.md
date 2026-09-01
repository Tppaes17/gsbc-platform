# Rodada 46 — Pre-Demo Release Audit And Website Remediation

Data: 2026-09-01  
Gate tecnico: `PRE-DEMO FAIL` por falta de candidate deployment verificavel  
Documento de origem: `CODEX_PRE_DEMO_RELEASE_AUDIT_AND_WEBSITE_REMEDIATION.md`

## Diagnostico

O Product Owner reportou erros no deploy. A auditoria local nao reproduziu erro de build, mas encontrou dois problemas materiais para apresentacao aos socios:

- copy publica na home mencionando ambiente de demonstracao usado em testes automatizados;
- screenshots de produto com proporcao muito alta renderizadas sem crop/limite, causando composicao excessivamente longa.

O projeto local esta linkado a Vercel, mas nenhum candidate URL/deployment ID foi fornecido; portanto a validacao real do deployment ficou bloqueada pelo proprio protocolo.

## Implementacao

Alterado `src/app/(site)/page.tsx` para remover linguagem de QA/teste e controlar a composicao das imagens de product proof com `aspect-[16/10]`, `max-h` e `object-cover`.

Alterado `src/app/login/page.tsx` para aplicar crop controlado ao screenshot lateral do login.

Atualizados `e2e/site-institucional.spec.ts` e `e2e/website-wave-6-visual.spec.ts` para refletir a nova copy publica.

Criado `e2e/pre-demo-release-smoke.spec.ts` com smoke nao destrutivo e `BASE_URL` configuravel para home, CTA, login, protected redirect, assets e ausencia de linguagem interna.

## Migrations / APIs / RLS

Nenhuma migration criada ou modificada. Nenhuma API, RLS, autorizacao, banco de dados ou regra financeira foi alterada.

## Testes

- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS com warning conhecido em `src/components/design-system/data-table.tsx`.
- `npm run build`: PASS.
- `npx playwright test e2e/pre-demo-release-smoke.spec.ts e2e/site-institucional.spec.ts e2e/website-wave-6-visual.spec.ts`: 9/9 PASS.
- `npm run test:a11y`: 5/5 PASS.
- `npm run test:e2e`: 123/123 PASS.
- `git diff --check`: PASS.

## Pendencias

- Informar candidate URL Vercel e deployment ID/commit SHA para smoke real.
- Rodar smoke contra `BASE_URL` do deployment.
- Validar login/auth/logout e jornada demo completa no URL real.
- Validar WebKit/Safari-like.
- Product Owner revisar visualmente e declarar, ou nao, `DEMO READY`.

## Proximo passo recomendado

Criar/identificar um preview Vercel correspondente ao commit auditado e executar o smoke pre-demo no URL real. Nao iniciar STG-10 nem migracao RESULTA antes do gate humano.
