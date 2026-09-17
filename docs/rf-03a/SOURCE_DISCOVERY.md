# RF-03A Source Discovery

Data da verificacao: 2026-09-17.

## Official Source

Fonte indicada pelo Product Owner e pelo Master Spec:

`https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9`

Resultado: **EXTERNAL SOURCE NOT VERIFIED**.

Evidencias:

- a pagina e identificada nos indices web como compartilhamento oficial `CNPJ - SERPRO+`;
- `curl HEAD`, `OPTIONS` e `PROPFIND` no compartilhamento/WebDAV falharam por `connection reset by peer`;
- tentativa pelo navegador isolado falhou com `ERR_CONNECTION_RESET`;
- o host legado `dadosabertos.rfb.gov.br` expirou por timeout;
- nao foi possivel observar diretamente listing, competencia corrente, conjunto completo de arquivos, tamanhos, datas, ETags ou checksums oficiais;
- nao foi possivel provar se uma publicacao mensal estava completa ou parcial.

Os portais oficiais e o PDF de metadados permaneceram consultaveis:

- `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/cadastros`
- `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf/view`
- `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico/cnpj-alfa`

O layout oficial confirma arquivo orientado a carga em RDBMS, delimitador `;` e entidades separadas. Ele prevalece sobre qualquer espelho ou implementacao de terceiros.

## Controlled Sample

Como a origem direta nao estava consumivel a partir do ambiente de execucao, foi usada apenas para prova mecanica uma copia espelhada e explicitamente nao autoritativa:

`https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos/2026-04-12/Cnaes.zip`

Headers observados:

```text
HTTP 200
Content-Type: application/zip
Content-Length: 22078
Last-Modified: Fri, 17 Apr 2026 19:54:52 GMT
ETag: "563e-64fad527b1b00"
Accept-Ranges: bytes
```

Artefato observado:

```text
Archive: Cnaes.zip
Entry: F.K03200$Z.D60411.CNAECSV
Compressed: 22,078 bytes
Extracted: 88,215 bytes
Rows: 1,359
SHA-256 local: 5c20d0c74a39b764af47ff76de36b063a14955ed3107f13c66c8ddfbca8026c2
Official checksum: unavailable
```

Essa amostra nao estabelece proveniencia oficial, competencia corrente nem completude nacional. Ela nao pode ser publicada nem promovida para uso de produto.

## Discovery Contract

O discovery de producao devera:

1. consultar a origem oficial sem assumir nome ou quantidade de arquivos;
2. identificar competencia e estado de publicacao;
3. classificar todos os arquivos por entidade;
4. capturar tamanho, ETag, Last-Modified e checksum oficial quando houver;
5. detectar ausencia, duplicidade e publicacao parcial;
6. gerar hash deterministico sem campos volateis;
7. bloquear download/carga quando o conjunto esperado estiver incompleto.

Gate de fonte: **FAIL / NOT VERIFIED**.
