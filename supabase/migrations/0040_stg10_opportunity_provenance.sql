-- GSBC — STG-10 completion hardening: opportunity provenance and human-review audit context.
--
-- Revenue Opportunity Engine remains inferential: these columns make the
-- source/nature of score factors and decisions explicit without creating
-- obligations, charges, notifications or legal effects.

alter table oportunidade_fatores
  add column source_type text not null default 'derived_inference'
    check (source_type in ('observed_data', 'derived_inference', 'human_decision')),
  add column source_fields text[] not null default '{}',
  add column evidence_snapshot jsonb not null default '{}'::jsonb;

comment on column oportunidade_fatores.source_type is
  'Natureza do fator: dado observado, inferência derivada ou decisão humana. Score STG-10 deve permanecer inferencial.';
comment on column oportunidade_fatores.source_fields is
  'Campos de entrada usados no fator, para explicar proveniência sem transformar score em obrigação.';
comment on column oportunidade_fatores.evidence_snapshot is
  'Snapshot mínimo dos sinais usados no fator no momento da avaliação.';

alter table oportunidade_eventos
  add column actor_type text not null default 'human'
    check (actor_type in ('human', 'system')),
  add column decision_nature text not null default 'inference'
    check (decision_nature in ('inference', 'human_review')),
  add column before_state jsonb,
  add column after_state jsonb;

comment on column oportunidade_eventos.actor_type is
  'Origem do evento: sistema ou humano. STG-10 não executa decisão jurídica/financeira autônoma.';
comment on column oportunidade_eventos.decision_nature is
  'Distingue avaliação inferencial de revisão humana.';
comment on column oportunidade_eventos.before_state is
  'Estado anterior relevante para reconstrução de decisão humana ou reavaliação.';
comment on column oportunidade_eventos.after_state is
  'Estado posterior relevante para reconstrução de decisão humana ou reavaliação.';
