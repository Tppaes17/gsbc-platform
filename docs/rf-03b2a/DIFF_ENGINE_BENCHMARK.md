# Diff Engine Benchmark

Fixtures cobrem first seen, remoção de snapshot, status cadastral, CNAE, endereço, município, UF, nome fantasia, status/datas de Simples e MEI e reversão. Eventos são determinísticos e preservam versões. Remoção mantém `legal_conclusion=false` e `requires_review=true`: ausência nunca é interpretada como baixa jurídica.

Manifesto incompleto, quality gate reprovado e anomalia de remoção em massa bloqueiam o diff. Resultado: **PASS** após ampliação dos testes RF lifecycle.
