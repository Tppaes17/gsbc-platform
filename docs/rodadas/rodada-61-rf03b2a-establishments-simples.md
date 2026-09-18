# Rodada 61 — RF-03B.2A Establishments & Simples

Benchmark oficial bounded executado localmente com um ZIP de Estabelecimentos e um de Simples. Parsing integral: 4,753,435 e 50,396,768 linhas, sem rejeições; 50 mil linhas por grupo foram carregadas em transação descartável. Joins, consultas indexadas, idempotência, falhas de load/normalização e cleanup passaram.

O diff engine ganhou cobertura explícita para município, UF e datas de Simples/MEI. Nenhuma migration, API, RLS, produção, QSA, publish ou deploy foi alterado. A projeção indica piso de ~238 GB por competência para os grupos medidos e envelope peak de 1.8-3.0 TB. Próximo passo recomendado: RF-03B.2B mediante autorização do owner.
