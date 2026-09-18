# Join And Query Benchmark

Foram criadas Empresas sintéticas coerentes apenas para as raízes oficiais da amostra. Os joins Empresa-Estabelecimento e Empresa-Simples retornaram 50,000 linhas cada, sem órfãos.

| Consulta | p50 | p95 | máximo |
| --- | ---: | ---: | ---: |
| Estabelecimento/CNPJ | 0.007 ms | 0.035 ms | 33.121 ms |
| Simples/raiz | 0.007 ms | 0.044 ms | 0.152 ms |

`EXPLAIN ANALYZE` confirmou uso dos índices únicos de CNPJ/raiz e PK de Empresa; execução pontual foi 0.732 ms para Estabelecimento e 0.296 ms para Simples. São resultados locais de 50 mil linhas, não SLO nacional. Estratégia recomendada: PostgreSQL B-tree/composite primeiro; nenhum search engine externo foi justificado.
