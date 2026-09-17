# ADR-RF-010 - RF Object Storage

## Question
Onde preservar ZIPs, extraidos, manifests e logs?

## Evidence
Arquivos grandes nao devem ser blobs PostgreSQL. A origem oficial nao forneceu checksum observavel e o reprocessamento depende dos objetos originais.

## Alternatives
Filesystem efemero; Supabase Storage compartilhado; object storage S3-compatible dedicado.

## Decision
Adotar object storage privado S3-compatible dedicado. Filesystem serve apenas como scratch temporario.

## Trade-offs
Introduz recurso e credencial adicionais; reduz blast radius e oferece lifecycle, multipart e recuperacao apropriados.

## Status
Proposed - provider, retention and cost pending approval.
