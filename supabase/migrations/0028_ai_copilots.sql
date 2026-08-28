-- GSBC — Rodada 28: AI Copilot + Agentic Collections (STG-12)
--
-- Primeira camada de IA da plataforma (docs/roadmap-stagings.md,
-- STG-12) — decisão confirmada com o usuário: só 2 dos 4 copilots do
-- roadmap entram nesta rodada, construídos completos (não os 4 rasos):
--
--   Negotiation Copilot (Autonomy Level 1 — Insight): resume a timeline
--   de uma negociação, destaca pendências, compara o valor negociado
--   contra o original. Só leitura — nenhuma escrita nova.
--
--   Collections Copilot (Autonomy Level 2 — Draft): sugere a próxima
--   ação pra uma cobrança e, quando aplicável, prepara um rascunho de
--   notificação — que um humano sempre revisa/edita antes de enviar via
--   o mesmo caminho já existente (sendNotificacaoAction, Rodada 12).
--
-- Document Copilot e Executive Copilot ficam documentados como próximo
-- passo (ver rodada doc) — regra do roadmap: "adicionar IA apenas onde
-- houver valor operacional mensurável, não criar chatbot genérico".
--
-- Nunca Level 4 (Policy-bound automation) — regra explícita do roadmap
-- ("não iniciar com Level 4") e da constituição do projeto (regra 8:
-- "IA não é autoridade... nunca pode autonomamente conceder desconto,
-- concluir enquadramento, cancelar cobrança, alterar obrigação,
-- transferir dinheiro, emitir quitação, formalizar acordo ou produzir
-- decisão jurídica definitiva"). Nenhum dos dois copilots desta rodada
-- escreve em cobrancas/negociacoes/pagamentos — só leem e, no caso do
-- Collections Copilot, alimentam (como texto editável) o envio de
-- notificação que já exigia confirmação humana antes desta rodada.

-- =========================================================================
-- ai_interacoes — log de observabilidade (spec literal do roadmap:
-- model, prompt_version, context_reference, output, user, decision,
-- accepted_rejected, timestamp). Cobre os dois copilots — `copilot`
-- diferencia qual.
-- =========================================================================
create table ai_interacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  copilot text not null check (copilot in ('negotiation', 'collections')),
  entity_type text not null check (entity_type in ('negociacao', 'cobranca')),
  entity_id uuid not null,
  model text not null,
  prompt_version integer not null,
  context_reference jsonb not null,
  output text not null,
  output_estruturado jsonb,
  status text not null default 'gerado' check (status in ('gerado', 'aceito', 'rejeitado', 'editado')),
  user_id uuid references users(id) on delete set null,
  decided_at timestamptz,
  decided_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table ai_interacoes is 'Log de observabilidade de IA (STG-12) — toda sugestão/rascunho gerado fica registrado com o que foi usado como contexto (context_reference), pra proveniência exigida pelo roadmap ("resposta relevante deve indicar dados utilizados") e pras métricas (sugestões aceitas, tempo economizado).';
comment on column ai_interacoes.context_reference is 'Snapshot jsonb dos IDs de linhas reais usadas como contexto no prompt (ex.: negociacao_eventos_ids) — a proveniência é sempre rastreável até dado real, nunca um resumo do resumo.';
comment on column ai_interacoes.output is 'Texto bruto gerado pelo modelo — nunca editado; se o usuário edita o rascunho antes de usar, o texto final editado fica em output_estruturado, o output original permanece intacto pra auditoria.';
comment on column ai_interacoes.status is 'Estado human-in-the-loop simplificado do roadmap (AI suggestion/Draft -> Approved -> Executed): gerado = sugestão/rascunho criado; aceito = usado como está; editado = usado com alterações; rejeitado = descartado. Nunca transiciona sozinho — sempre uma ação humana explícita.';

create index ai_interacoes_entity_idx on ai_interacoes (entity_type, entity_id);
create index ai_interacoes_copilot_idx on ai_interacoes (copilot, created_at);

-- RLS — staff apenas (ferramenta operacional interna, mesmo nível de
-- Central Operacional/Políticas — rascunho de IA não é dado pra
-- transparência do sindicato; o resultado FINAL de uma ação, se
-- executada, já fica visível nos lugares de sempre — negociacao_eventos,
-- notificacoes).
alter table ai_interacoes enable row level security;

create policy ai_interacoes_select on ai_interacoes for select
  using (public.is_platform_staff(auth.uid()));

create policy ai_interacoes_insert on ai_interacoes for insert
  with check (public.is_platform_staff(auth.uid()));

create policy ai_interacoes_update on ai_interacoes for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

grant select, insert, update on public.ai_interacoes to authenticated;
