# GSBC Public Product Screenshot Manifest

Status: política simples para screenshots públicos do produto.  
Owner: Product Owner + Engenharia/Design GSBC.  
Última revisão: 2026-09-01.

## Política

- Usar somente dados demo, sintéticos ou explicitamente autorizados.
- Revisar cada screenshot antes de publicação para evitar PII real, secrets, stack traces, env names, chaves, IDs internos sem função comercial e mensagens de debug.
- Registrar rota/origem, finalidade, data de captura e condição de refresh.
- Recapturar quando a UI mudar materialmente, quando o dado exibido deixar de representar a feature ou antes de qualquer uso comercial externo relevante.
- Não usar screenshot para vender feature futura; cada imagem deve provar uma capacidade existente.

## Manifest

| Asset                                                     | Source route                                                 | Purpose                                                         | Demo data verified | Privacy reviewed | Captured   | Refresh trigger                                                                  | Owner                             |
| --------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- | ------------------ | ---------------- | ---------- | -------------------------------------------------------------------------------- | --------------------------------- |
| `public/product-proof/executive-command-center.png`       | `/backoffice`                                                | Provar visão executiva de receita, risco e operação.            | Sim                | Sim              | 2026-09-01 | Mudança material no Command Center ou antes de uso comercial externo.            | Product Owner + Engenharia/Design |
| `public/product-proof/empresa-workspace.png`              | `/backoffice/empresas/40000000-0000-0000-0000-000000000001`  | Provar workspace de empresa com contexto, relações e histórico. | Sim                | Sim              | 2026-09-01 | Mudança material no Empresa Workspace ou antes de uso comercial externo.         | Product Owner + Engenharia/Design |
| `public/product-proof/cobrancas-enterprise-grid.png`      | `/backoffice/cobrancas`                                      | Provar grade operacional enterprise e densidade de cobrança.    | Sim                | Sim              | 2026-09-01 | Mudança material na grade de cobranças ou antes de uso comercial externo.        | Product Owner + Engenharia/Design |
| `public/product-proof/critical-workflow-payment.png`      | `/backoffice/cobrancas/60000000-0000-0000-0000-000000000001` | Provar preview de consequência em ação financeira crítica.      | Sim                | Sim              | 2026-09-01 | Mudança material no fluxo de pagamento manual ou antes de uso comercial externo. | Product Owner + Engenharia/Design |
| `public/product-proof/critical-workflow-notification.png` | `/backoffice/cobrancas/60000000-0000-0000-0000-000000000001` | Provar preview de consequência em notificação externa.          | Sim                | Sim              | 2026-09-01 | Mudança material no fluxo de notificação ou antes de uso comercial externo.      | Product Owner + Engenharia/Design |
| `public/product-proof/login-transition.png`               | `/backoffice`                                                | Apoiar continuidade visual website -> login -> backoffice.      | Sim                | Sim              | 2026-09-01 | Mudança material no Command Center/login ou antes de uso comercial externo.      | Product Owner + Engenharia/Design |

## Evidências De Captura

Evidências visuais de Wave 6: `test-results/design-wave-6-website/`.  
Evidências visuais de aceitação Wave 7: `test-results/design-wave-7-final/`.
