# RF-03A.1 Official Source Evidence

Observed at: `2026-09-17T12:55:18Z`

## Official References

| Reference | Status | What it proves |
|---|---|---|
| `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/cadastros` | Accessible | Receita identifies CNPJ as an official open dataset and links to the PBDA catalog. |
| `https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj` | HTTP 200 | The official catalog page exists. Its resource inventory is client-rendered and was not exposed in the static response. |
| `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf` | Accessible | Official field/layout documentation for the CNPJ open dataset. |
| `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico/cnpj-alfa` | Accessible | Official alphanumeric CNPJ program and rollout information. |
| `https://www.gov.br/fazenda/pt-br/assuntos/noticias/2026/julho/receita-federal-gera-o-primeiro-cnpj-em-formato-alfanumerico` | Accessible | Confirms the first alphanumeric CNPJ was issued on 2026-07-31. |
| `https://www.gov.br/receitafederal/dados/nota_cocad_no_47_2024.pdf` | Accessible | States that Receita updates the CNPJ open-data page monthly. |

## Endpoint Probes

DNS for `arquivos.receitafederal.gov.br` resolved to `161.148.168.43`.

| Endpoint/method | Observed result |
|---|---|
| `HEAD https://arquivos.receitafederal.gov.br/` | Connection reset by peer; HTTP code unavailable. |
| `HEAD https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9` | Connection reset by peer; HTTP code unavailable. |
| `HEAD https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/` | Connection reset by peer; HTTP code unavailable. |
| `GET Range: bytes=0-1023` on the official share | Connection reset by peer before response headers. |
| `HEAD https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/` | Connection timeout after 5 seconds. |
| `HEAD` official dados.gov.br catalog page | HTTP 200. |
| `HEAD /api/publico/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj` | HTTP 401 with `WWW-Authenticate: Bearer`. |

No authentication bypass, scraping workaround or unofficial mirror was used.

## Required Evidence Record

```text
official domain: arquivos.receitafederal.gov.br / dados.gov.br
endpoint: https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9
access method: HTTPS share; catalog page links to official dataset
HTTP status: official share reset before HTTP response; catalog page 200; catalog API 401
listing mechanism: NOT VERIFIED
observed timestamp: 2026-09-17T12:55:18Z
dataset/reference period: UNKNOWN
file count: UNKNOWN
filenames: UNKNOWN
individual sizes: UNKNOWN
aggregate compressed size: UNKNOWN
last-modified/etag: UNAVAILABLE
checksum availability: UNAVAILABLE
```

## Publication Stability

The official monthly cadence is documented, but no stable resource listing was observable. The production discovery rule must therefore be:

1. Discover T1 and persist the complete ordered manifest and response metadata.
2. Wait a configurable stability interval.
3. Discover T2 from the same official mechanism.
4. Compare reference period, file set, byte sizes and ETag/Last-Modified/checksum when available.
5. Start ingestion only when T1 and T2 are identical and all mandatory categories are present.
6. A changed or incomplete manifest remains pending and can never replace the active dataset.

The interval is `PROPOSED — OWNER APPROVAL REQUIRED`; there is no evidence for a safe fixed number of hours yet.

## Conclusion

`OFFICIAL SOURCE NOT VERIFIED`

The publisher and catalog are official, but an authoritative machine-readable listing, current reference period, file inventory, sizes and integrity metadata were not retrievable from this execution environment.
