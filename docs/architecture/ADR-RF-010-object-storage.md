# ADR-RF-010 - RF Object Storage

## Question
Onde preservar ZIPs, extraidos, manifests e logs?

## Evidence
Arquivos grandes nao devem ser blobs PostgreSQL. A origem oficial nao forneceu checksum observavel e o reprocessamento depende dos objetos originais. O bucket `db-backups` existente tem limite de 500 MB e finalidade distinta; capacidade nacional, maior objeto e pico continuam desconhecidos.

## Alternatives
Filesystem efemero; Supabase Storage compartilhado; object storage S3-compatible dedicado.

## Decision
Adotar object storage privado, versionado e S3-compatible dedicado, co-localizado com worker/DB quando possivel. Exigir multipart/resume, checksum metadata, encryption, lifecycle e identidade least-privilege. Filesystem serve apenas como scratch temporario.

## Trade-offs
Introduz recurso e credencial adicionais; reduz blast radius e oferece lifecycle, multipart e recuperacao apropriados.

## Status
PROPOSED — OWNER APPROVAL REQUIRED
