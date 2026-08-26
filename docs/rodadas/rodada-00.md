# GSBC — Rodada 0

## Objetivo
Diagnóstico do projeto existente, conforme protocolo do prompt-mestre (seção 86),
antes de qualquer implementação.

## Estado inicial
O diretório de trabalho (`/Users/thiagopisciottipaes/Documents/GSBC 2 - Claude`)
estava **completamente vazio**: sem repositório git, sem código-fonte, sem
`package.json`, sem documentação prévia.

### A. Stack identificada
Nenhuma. Não havia projeto para identificar framework, banco, autenticação ou
dependências.

### B. Arquitetura atual
Inexistente.

### C. Banco
Inexistente — sem tabelas, migrations, RLS, triggers ou functions.

### D. Segurança
Inexistente — sem login, autorização, proteção de rotas ou secrets a auditar.

### E. Estado funcional dos módulos
Todos os módulos: **Inexistente**.

### F. Débito técnico
Nenhum (nada foi construído ainda).

### G. Riscos
Nenhum risco herdado. O risco desta fase é de **decisão inicial mal
fundamentada** (stack errada, modelo de multi-tenancy errado) — mitigado
confirmando com o usuário antes de codificar (ver decisões abaixo).

### H. Recomendação
Conforme seção 87 do prompt-mestre: "se o projeto ainda estiver praticamente
vazio, inicie a Fundação SaaS." Não há nada a preservar ou adaptar — seguir
diretamente para a Rodada 1 (Fundação SaaS: autenticação, tenants, usuários,
roles, permissões, segurança, auditoria, design system, organizações/sindicatos).

## Decisões confirmadas com o usuário antes de iniciar
Por envolverem escolha comercial/técnica estrutural (regra 72), três perguntas
foram feitas antes de qualquer código:

1. **Stack de backend/dados**: Next.js + Supabase (recomendado pelo documento,
   confirmado pelo usuário).
2. **Versionamento**: inicializar `git init` imediatamente.
3. **Hospedagem alvo**: Vercel (frontend) + Supabase (dados/auth/storage).

Ver [ADR-002](../architecture/ADR-002-supabase-platform.md) para o
detalhamento da decisão de plataforma.

## Próxima rodada recomendada
Rodada 1 — Fundação SaaS (ver `rodada-01.md`).
