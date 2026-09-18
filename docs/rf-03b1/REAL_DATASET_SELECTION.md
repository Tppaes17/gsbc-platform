# RF-03B.1 Real Dataset Selection

| Field | Selected evidence |
| --- | --- |
| Filename | `Empresas1.zip` |
| Dataset group | EMPRESAS |
| Reference period | 2026-09 |
| Official URL | `https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/2026-09/Empresas1.zip` |
| Manifest bytes | 77,897,750 |
| Last-Modified | Mon, 14 Sep 2026 14:59:35 GMT |
| ETag | `"7a5524025ba34598e2659a6b06db38e3"` |
| Media type | `application/zip` |
| Privacy | Public company registry data; no QSA/Socios selected |
| Parser | Windows-1252 semicolon-delimited streaming `parseCompany` |

`Cnaes.zip` was rejected as too small to represent ingestion capacity. `Empresas0.zip` and Establishment files were rejected as unnecessarily large for the first bounded run. `Empresas1.zip` exercises real company parsing and canonical normalization at controlled size without selecting QSA personal data.

The HTTP HEAD response matched size, ETag, Last-Modified and media type before download. One ZIP only was authorized and downloaded.
