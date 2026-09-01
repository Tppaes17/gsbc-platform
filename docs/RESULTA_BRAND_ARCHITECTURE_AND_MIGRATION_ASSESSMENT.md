# RESULTA Brand Architecture And Migration Assessment

Data: 2026-09-02  
Modo: READ-ONLY ASSESSMENT — NO IMPLEMENTATION  
Gate: `BRAND ARCHITECTURE READY WITH CONDITIONS`  
STG-10: HOLD  
Marca em avaliacao: RESULTA  
Descriptor em avaliacao: Assessoria e Inteligencia Institucional  
Slogan em avaliacao: Informacao estrategica e gestao de valor.

## 1. Executive Summary

A migracao GSBC -> RESULTA e tecnicamente viavel, mas nao deve ser executada como search-and-replace. O repositorio contem pelo menos 856 ocorrencias textuais relacionadas a GSBC/RESULTA em 233 arquivos, distribuidas entre UI publica, login, shell autenticado, mensagens operacionais, documentos historicos, migrations, seeds, testes, tipos gerados, templates de notificacao/PDF, e configuracao local.

Conclusao: a arquitetura de migracao esta pronta para decisao com condicoes. As condicoes bloqueadoras para execucao sao: definir a arquitetura de marca, separar marca comercial de razao social/CNPJ/nome contratual, obter sistema oficial de logo/vetor, validar dominio/e-mail/trademark, decidir data efetiva e regras de preservacao historica.

## 2. Decision Context

A marca RESULTA foi aprovada empresarialmente, mas o SaaS atual permanece uma plataforma vertical para entidades sindicais. A migracao deve substituir a identidade de mercado sem ampliar silenciosamente o dominio do produto, sem reescrever historico e sem fragilizar o deployment pre-demo GSBC ja saneado.

## 3. Stable Baseline

Baseline local observado:

- Branch: `main`.
- Working tree no inicio do assessment: limpo.
- Ultimo commit observado: remediacao pre-demo publicada anteriormente.
- `docs/PRE_DEMO_RELEASE_AUDIT_AND_WEBSITE_REMEDIATION_REPORT.md` existe e registra que o deployment candidate ainda precisava de URL verificavel.
- Nenhum codigo, asset, migration, RLS, API, env, Vercel, Supabase ou documento historico foi alterado neste assessment alem da criacao deste relatorio.

## 4. Brand Constitution

Decisoes a formalizar:

- RESULTA como marca corporativa/master brand.
- Nome canonico do SaaS sob RESULTA.
- Papel residual de GSBC: historico, codename interno, nome de entidade juridica ou marca descontinuada.
- Descriptor e slogan como linguagem institucional, nao substitutos da proposta concreta do produto.

## 5. Open Business Decisions

- RESULTA e marca corporativa, produto SaaS, ambas ou guarda-chuva?
- Qual e o nome publico do SaaS?
- GSBC desaparece da UI imediatamente ou permanece em registros historicos/contratuais?
- A razao social/CNPJ mudam ou apenas a marca comercial?
- Qual data efetiva de uso da marca em documentos, e-mails e notificacoes?
- Quais dominios e enderecos de e-mail serao usados?
- Ha verificacao de disponibilidade de marca/trademark?

## 6. Legal Entity Separation

| Item | Atual | Futuro possivel | Decisao necessaria |
| --- | --- | --- | --- |
| Marca comercial | GSBC | RESULTA | BUSINESS DECISION REQUIRED |
| Produto SaaS | GSBC / plataforma GSBC | RESULTA Platform, RESULTA Gestao ou nome vertical | BUSINESS DECISION REQUIRED |
| Razao social | Desconhecida no repo | Nao presumir alteracao | LEGAL INPUT REQUIRED |
| CNPJ | Desconhecido no repo | Nao presumir alteracao | LEGAL INPUT REQUIRED |
| Nome contratual | GSBC em textos/docs | Pode exigir aditivo | LEGAL REVIEW |
| Nome em cobranca/notificacao | GSBC em templates e mensagens | RESULTA ou razao social vigente | LEGAL REVIEW |

## 7. Product Scope Guard

RESULTA pode soar mais ampla que GSBC, mas o produto atual ainda suporta entidades sindicais, compliance, receita, cobranca, negociacao, conciliacao, governanca e auditoria. A migracao nao deve prometer gestao institucional generica para qualquer vertical sem implementacao, dados, permissoes, jornadas e provas de dominio.

## 8. Alternatives

| Alternativa | Clareza | Escalabilidade | Percepcao SaaS | Servicos | Risco juridico | Impacto tecnico | Custo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A — RESULTA substitui GSBC integralmente como marca e produto | Alta no curto prazo | Media | Alta | Pode confundir produto/consultoria | Alto se razao social/documentos nao mudarem | Alto; muitas ocorrencias user-facing e legais | Alto |
| B — RESULTA master brand + produto vertical | Alta com boa nomenclatura | Alta | Alta | Permite descriptor institucional | Medio | Medio; separa UI publica/shell de historico | Medio |
| C — RESULTA como produto, entidade juridica inalterada | Media | Media | Alta | Pode reduzir clareza institucional | Medio/alto | Medio | Medio |

## 9. Recommendation

Recomendacao tecnica: adotar a Alternativa B, com RESULTA como corporate/master commercial brand e um nome de produto SaaS concreto sob ela. Exemplo de tese a decidir: `RESULTA Platform` para o produto ou `RESULTA Gestao Sindical` para preservar o recorte vertical. A decisao final e empresarial/juridica.

## 10. GSBC Future Role

Recomendacao: manter GSBC inicialmente como identificador historico/interno onde ja esta gravado em migrations, audit, event types, seeds historicos, docs de rodadas e contratos/documentos emitidos. Migrar user-facing futuro por versionamento, nao por reescrita retroativa.

## 11. Product Name

Candidatos:

- `RESULTA`: simples, mas pode confundir marca corporativa com produto.
- `RESULTA Platform`: bom para SaaS, menos especifico sobre sindicatos.
- `RESULTA Gestao`: mais operacional, ainda amplo.
- `RESULTA Gestao Sindical`: mais fiel ao dominio atual, menos expansivo.

Decisao: BUSINESS DECISION REQUIRED.

## 12. Descriptor

`Assessoria e Inteligencia Institucional` funciona melhor como descriptor corporativo/servicos. Nao deve substituir a mensagem concreta do SaaS.

## 13. Slogan

`Informacao estrategica e gestao de valor.` funciona como assinatura institucional. Nao deve ser usado sozinho como headline principal do produto, pois nao explica compliance, receita, cobranca, conciliacao, governanca ou auditoria.

## 14. Positioning

Mensagem concreta recomendada para preservar escopo:

> Plataforma de compliance, receita e operacao para entidades sindicais, com governanca, cobranca, conciliacao e auditoria.

## 15. Repository Inventory

Varredura textual READ-ONLY:

| Area | Arquivos com ocorrencias | Observacao |
| --- | ---: | --- |
| `docs` | 85 | Majoritariamente historico e fonte canonica GSBC |
| `src` | 76 | UI, auth, shell, dominio, templates, IA, e-mails |
| `supabase` | 43 | Migrations, seed, RLS, tipos financeiros e historicos |
| `e2e` | 21 | Asserts, fixtures, usuarios demo, labels esperados |
| `package.json` / lock | 2 | Nome interno `gsbc-platform` |
| Root docs antigos | 5 | README/resumos/PRODUCT variantes |
| `.env.example` | 1 | Comentario Supabase/projeto GSBC |

Total textual aproximado: 856 matches em 233 arquivos, excluindo `node_modules`, `.next`, `test-results` e coverage.

## 16. User-Facing

Migrar futuramente por waves:

- Website publico: `src/app/(site)/*`.
- Header/footer/logo: `src/components/site/*`.
- Login/auth copy: `src/app/login/page.tsx`, `src/app/portal/login/page.tsx`.
- Shell autenticado: `src/app/backoffice/layout.tsx`, `src/components/backoffice/topbar.tsx`, `src/components/backoffice/mobile-sidebar.tsx`.
- Mensagens operacionais visiveis em backoffice.
- E-mails, notificacoes e documentos gerados apos data efetiva.
- Metadata, favicon/app icon e assets publicos.
- Screenshots publicos reais recapturados apos implementacao.

## 17. Internal

Manter inicialmente:

- `package.json` name `gsbc-platform`.
- Repositorio/projeto Vercel/Supabase quando ja linkados.
- Role codes como `gsbc_super_admin`.
- Enum/event type `proposta_gsbc`.
- Campos financeiros como `gsbc_percent`.
- `beneficiary_type = 'gsbc'`.
- Migrations historicas.
- Tipos gerados derivados do banco.
- Test fixtures historicas ate wave B7.

## 18. Classification Matrix

| Occurrence | File/System | User-facing? | Class | Risk | Dependency | Future Action |
| --- | --- | ---: | --- | --- | --- | --- |
| Logo GSBC | `src/components/site/logo.tsx`, `public/brand/logo-gsbc.png` | Sim | REPLACE | Alto | BRAND ASSET INPUT | B1/B2 trocar por sistema oficial |
| Metadata global | `src/app/layout.tsx` | Sim | REPLACE | Medio | Product name | B2 atualizar title/description |
| Home publica | `src/app/(site)/page.tsx` | Sim | REPLACE | Alto | Brand constitution | B2 reescrever mantendo escopo |
| Paginas publicas secundarias | `src/app/(site)/*` | Sim | REPLACE | Alto | Brand/product scope | B2 migrar e retestar claims |
| Footer e contato | `src/components/site/site-footer.tsx`, `src/app/(site)/contato/page.tsx` | Sim | EXTERNAL DEPENDENCY | Alto | Dominio/e-mail/DNS | B6 antes de trocar e-mail |
| Login backoffice | `src/app/login/page.tsx` | Sim | REPLACE | Alto | Auth freeze | B3 trocar copy/logo sem mexer auth |
| Portal login | `src/app/portal/login/page.tsx` | Sim | REPLACE | Medio | Product/legal wording | B3 |
| Shell brand | `src/app/backoffice/layout.tsx`, `topbar.tsx`, `mobile-sidebar.tsx` | Sim | REPLACE | Medio | Product name | B3 |
| Mensagens "equipe GSBC" | `src/app/backoffice/**/actions.ts`, tables/forms | Sim | VERSION | Alto | Legal/entity decision | B4/B5, conforme papel da operadora |
| Templates de notificacao | `src/app/backoffice/cobrancas/actions.ts`, `notificacao-action.tsx` | Sim | LEGAL REVIEW | Critico | Razao social/emissor | B5/B6 |
| PDF extrajudicial | `src/lib/escalonamento/documento-template.tsx` | Sim | LEGAL REVIEW | Critico | Juridico/contratual | B5 |
| SMTP sender fallback | `src/lib/email/send.ts`, `.env.example` | Sim externo | EXTERNAL DEPENDENCY | Alto | DNS/SPF/DKIM/DMARC/provider | B6 |
| Product screenshots | `public/product-proof/*`, manifest | Sim | REPLACE | Medio | UI migrada real | B7 recapturar, nao editar |
| Seed tenant platform | `supabase/seed.sql` | Parcial | VERSION | Medio | Data efetiva demo | B7 ou manter historico |
| Migrations historicas | `supabase/migrations/*` | Nao | DO NOT TOUCH | Critico | Historico/reprodutibilidade | Nunca reescrever |
| Role codes `gsbc_*` | DB/types/tests | Nao/indireto | KEEP INTERNAL | Alto | API/RLS contract | Manter ou migrar em plano proprio |
| `GSBC_VETO` | policies/types/tests/docs | Parcial | KEEP INTERNAL | Alto | Domain semantics | Manter ate decisao formal |
| `gsbc_percent` | DB/types/forms/tests | Parcial | KEEP INTERNAL | Critico | Revenue contracts | Nao renomear nesta migracao |
| `proposta_gsbc` | DB/types/UI/tests | Parcial | KEEP INTERNAL/VERSION | Alto | Historical events | Alias visual futuro sem renome DB |
| Docs Waves/rodadas | `docs/**` | Nao | DO NOT TOUCH | Medio | Historico | Preservar |
| README/resumos | Root/docs | Parcial | VERSION | Baixo | Timing | Atualizar docs atuais, nao historico |
| Vercel/Supabase project names | `.vercel`, `supabase/config.toml` | Nao | KEEP INTERNAL | Medio | Infra/deployment | Manter inicialmente |
| CNPJ/API user-agent | `src/lib/cnpj/brasil-api.ts` | Externo tecnico | VERSION | Baixo/medio | Provider etiquette | B6 se houver identidade tecnica nova |

## 19. Rename Risks

Riscos criticos de rename indiscriminado:

- Quebrar RLS e roles dependentes de `gsbc_*`.
- Alterar migrations historicas e perder reprodutibilidade.
- Mudar enum/event types (`proposta_gsbc`, `GSBC_VETO`) sem migracao planejada.
- Confundir split financeiro `gsbc_percent` com nova marca sem contrato.
- Reescrever notificacoes/PDFs emitidos sob marca anterior.
- Quebrar testes que provam seguranca multi-tenant.

## 20. Historical Preservation

Registros historicos devem preservar a marca vigente no momento do evento/documento quando relevante. Comunicacoes emitidas, notificacoes extrajudiciais, comprovantes, PDFs, audit events, payment metadata e contratos nao devem ser retroativamente reescritos.

## 21. Effective Date

Exigir data efetiva formal de mudanca da marca. A partir dela, novos documentos e comunicacoes podem usar RESULTA conforme regras aprovadas; antes dela, preservar GSBC.

## 22. Versioning

Recomendacao futura: introduzir `brand_version`/`branding_effective_from` para templates de comunicacao/documentos novos, sem alterar migrations antigas. Nao implementar neste assessment.

## 23. Logo

O repo tem `public/brand/logo-gsbc.png` e componente `SiteLogo`. Nao ha evidencia de master oficial RESULTA.

## 24. Vector Master

Status: BRAND ASSET INPUT REQUIRED. A migracao nao deve partir de auto-vetorizacao ou PNG improvisado como fonte master.

## 25. Small-Size

O sistema RESULTA precisa ser testado em 16/24/32/40/64 px, header, sidebar, mobile, PDF e e-mail. Favicon/app icon ainda nao podem ser definidos sem simbolo oficial.

## 26. Palette

Nao recolorir automaticamente o produto. Definir tokens de marca RESULTA separados dos tokens semanticos.

## 27. Semantic Colors

Preservar success/warning/danger/risk/SLA/financeiro. Cor de logo nao altera semantica operacional.

## 28. Gradient Rule

Se a marca tiver gradiente, ele nao autoriza aplicar gradiente como linguagem generalizada de UI. O produto deve preservar autoridade institucional, inteligencia financeira e operacao enterprise.

## 29. Website

Migracao futura deve cobrir header, logo, hero, descriptor, slogan, CTA, product proof, security copy, footer, metadata, OG e favicon. A headline deve continuar concreta; slogan abstrato nao basta.

## 30. Login

Migrar logo, title, copy e texto `conta institucional GSBC` apos B1/B3. Nao alterar Supabase Auth, cookies, callback URLs ou guards por razao de marca.

## 31. Auth Freeze

Auth permanece congelado durante migracao visual. Qualquer mudanca em callback/domains/env pertence a B6 e exige smoke no candidate deployment.

## 32. Shell

`Backoffice GSBC`, `GSBC` no sidebar/mobile e `Buscar no GSBC` devem migrar para o nome de produto aprovado. Nao alterar estrutura de permissao.

## 33. Command Center

Textos como `operacao GSBC` podem migrar para `operacao RESULTA` ou para papel funcional (`equipe da plataforma`) conforme decisao de marca/operadora.

## 34. Workspaces

Workspaces de Empresa/Cobranca devem trocar branding de prestador, mas manter entidades de dominio: Empresa, Instrumento, Obrigacao, Cobranca, Negociacao, Pagamento, Conciliacao.

## 35. Emails

Ocorrencias: fallback `GSBC <notificacoes@gsbc.com.br>`, contato `contato@gsbc.com.br`, templates de notificacao e portal. Migrar somente apos dominio/remetente aprovados.

## 36. Email Domain

EXTERNAL DEPENDENCY: dominio, mailbox, DNS SPF/DKIM/DMARC, reputacao e provider verification. Nao trocar `SMTP_FROM` sem isso.

## 37. Domains

Dominios publicos/callbacks Supabase/Vercel devem ser planejados como B6/B8. `NEXT_PUBLIC_APP_URL` nao deve mudar sem reteste de auth, portal, webhooks simulados e e-mails.

## 38. Trademark

LEGAL/TRADEMARK VERIFICATION REQUIRED. Nao declarar disponibilidade ou exclusividade de RESULTA sem verificacao.

## 39. PDFs

`src/lib/escalonamento/documento-template.tsx` contem `Documento gerado eletronicamente pela plataforma GSBC`. Por tratar notificacao/escalonamento, classificar como LEGAL REVIEW.

## 40. Notices

Notificacoes extrajudiciais precisam separar: entidade sindical emissora/credora, RESULTA/GSBC como plataforma/prestadora, eventual escritorio juridico e razao social contratual.

## 41. Collection Communications

Templates em `src/app/backoffice/cobrancas/actions.ts`, `notificacao-action.tsx` e migrations antigas devem ser versionados. Migrations antigas nao devem ser editadas; novos templates podem nascer com brand version.

## 42. Payment Institution

Campos e textos `gsbc_percent`, `beneficiary_type = 'gsbc'`, `Cobrança GSBC` e split/repasses exigem decisao contratual/financeira antes de renome. Nao alterar integracao nesta etapa.

## 43. Contracts

Contratos financeiros, PSP, clientes, parceiros, termos e DPA podem exigir aditivo. BUSINESS/LEGAL INPUT REQUIRED.

## 44. Privacy

Privacy/DPA precisam identificar controlador, operador, contato, DPO e razao social correta. Nao presumir que rebranding dispensa notificacao/aditivo.

## 45. Screenshots

Nao editar screenshots GSBC para simular RESULTA. Apos B2-B4 reais, recapturar produto RESULTA e atualizar manifest/PII/visual baselines.

## 46. Tests

Testes que assertam `GSBC` em UI devem migrar junto das waves B2-B4. Testes que provam roles, RLS, historico, finance e invariants devem manter identificadores internos ate haver plano tecnico especifico.

## 47. Fixtures

`admin.demo@gsbc.com.br`, tenant `GSBC`, role codes e fixtures de seed devem ser tratados como demo/versioned. Nao trocar enquanto auth/demo deployment estiver sendo usado sem plano de usuarios e callbacks.

## 48. Docs

Documentos historicos, waves, rodadas e auditorias devem permanecer GSBC. Docs atuais/futuros podem introduzir RESULTA com secao de transicao e data efetiva.

## 49. Repo / Package

Recomendacao: manter `gsbc-platform` no curto prazo. Renomear package/repo/infra nao melhora demo e aumenta risco de CI/deploy.

## 50. Observability

Labels/logs podem manter GSBC inicialmente. Planejar alias futuro para dashboards sem quebrar series historicas.

## 51. Vercel

Manter projeto Vercel atual inicialmente. Se houver novo dominio RESULTA, configurar como B6/B8 com preview, env e smoke.

## 52. Supabase

Manter project/config/roles/tables. Nao renomear project_id, schemas, columns, enums ou policies por branding.

## 53. External Dependencies

- Dominio web.
- Dominio de e-mail.
- SPF/DKIM/DMARC.
- Provider SMTP.
- Supabase Auth redirect URLs.
- Vercel domains/protection/preview.
- PSP/merchant descriptor.
- Contratos/clientes/parceiros.
- Registro de marca/trademark.
- Assets oficiais de marca.

## 54. Legal Review

Obrigatoria para razao social, CNPJ, documentos emitidos, notificacoes extrajudiciais, contratos, DPA/privacy, PSP/merchant, comunicacoes de cobranca e separacao entre plataforma, entidade sindical e prestador juridico.

## 55. Migration Waves

- B0 Brand Constitution: decisoes empresariais/juridicas.
- B1 Official Asset System: logo, variantes, tokens.
- B2 Public Website: website, metadata, favicon.
- B3 Auth + Application Shell: login, portal login, shell e labels.
- B4 Product Surfaces: Command Center, workspaces, grids, workflows.
- B5 Documents & Communications: PDF, e-mail, notices, templates.
- B6 External & Legal: domains, e-mail, PSP, contracts, privacy.
- B7 Tests/Screenshots/Docs: E2E, a11y, visual, manifest e docs atuais.
- B8 Candidate Deployment & Acceptance: Vercel smoke e Product Owner gate.

## 56. Rollback

Cada wave deve ser pequena, branch propria, PR proprio e rollbackavel para ultimo deployment GSBC aprovado. Nao misturar STG-10 ou refatoracao de dominio.

## 57. Test Strategy

Para cada wave aplicavel:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- E2E focado da superficie
- `npm run test:a11y`
- Smoke com `BASE_URL` no candidate deployment
- Visual QA 1440/375/320
- WebKit/Safari-like antes do gate externo

## 58. Candidate Deployment

Obrigatorio antes de qualquer uso externo: preview Vercel com URL identificada, commit SHA, env revisado, Supabase callbacks revisados, smoke real, evidencia visual e checklist PO.

## 59. Product Owner Gate

Codex nao declara `RESULTA PRODUCTION APPROVED`. Maximo tecnico futuro: `RESULTA BRAND MIGRATION TECHNICALLY READY FOR PRODUCT OWNER REVIEW`.

## 60. STG-10

Permanece HOLD. Este assessment nao autoriza, mistura ou executa Opportunity Engine.

## 61. Stop Conditions

Parar se:

- papel de RESULTA continuar indefinido;
- nome do produto impedir copy consistente;
- marca for confundida com razao social;
- master logo oficial faltar;
- dominio/e-mail forem alterados sem dependencias;
- historico puder ser sobrescrito;
- comunicacao juridica indicar emissor incorreto;
- copy ampliar escopo nao suportado;
- palette quebrar acessibilidade;
- rename exigir database/domain rename;
- STG-10 entrar no escopo.

## 62. Final Gate

`BRAND ARCHITECTURE READY WITH CONDITIONS`.

Conditions:

- BUSINESS DECISION REQUIRED para arquitetura de marca e nome do produto.
- LEGAL INPUT REQUIRED para razao social, CNPJ, contratos, notificacoes e privacidade.
- BRAND ASSET INPUT REQUIRED para sistema oficial de logo.
- EXTERNAL DEPENDENCY para dominio/e-mail/DNS/PSP/Supabase/Vercel.
- Candidate deployment pre-demo GSBC precisa permanecer rollbackavel.

## 63. Next Artifact

Proximo artefato recomendado, se Product Owner aprovar a arquitetura: `CODEX_RESULTA_BRAND_MIGRATION_EXECUTION_PLAN.md`.
