# Quality Reconciliation

| Grupo | Fonte | Parsed | Staging intencional | Canônico | Rejeitado | Não staged por limite |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Estabelecimentos | 4,753,435 | 4,753,435 | 50,000 | 50,000 | 0 | 4,703,435 |
| Simples | 50,396,768 | 50,396,768 | 50,000 | 50,000 | 0 | 50,346,768 |

As diferenças são exclusivamente o limite deliberado de persistência de 50 mil linhas; o parsing foi integral. Rerun idempotente, falha de normalização e rollback transacional passaram. Reconciliation: **PASS**.
