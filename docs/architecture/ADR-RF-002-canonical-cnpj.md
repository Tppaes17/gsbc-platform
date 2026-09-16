# ADR-RF-002 — Canonical CNPJ

## Question

Como representar CNPJ numerico e alfanumerico na base RF-CNPJ?

## Evidence

- RF-01 fechou `RF00-P0-001` com helper canonico de CNPJ.
- O exemplo oficial alfanumerico e `00.000.000/E08G-12`.
- O Master Spec proibe armazenamento numerico de CNPJ.

## Alternatives

- Armazenar CNPJ mascarado.
- Armazenar raiz/ordem/DV e montar CNPJ sob demanda.
- Armazenar canonical sem pontuacao e campos componentes quando a fonte os separa.

## Decision

Armazenar `cnpj_canonical` como `text` uppercase sem pontuacao, com check `^[A-Z0-9]{12}[0-9]{2}$`. Para estabelecimentos, preservar tambem `cnpj_root`, `cnpj_order` e `cnpj_dv`.

## Trade-offs

- Evita duplicidade por mascara/case.
- Mantem compatibilidade com os metadados oficiais, que separam raiz/ordem/DV.

## Status

Accepted in RF-02.
