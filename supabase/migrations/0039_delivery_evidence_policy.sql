-- Pre-STG-10 remediation: DeliveryEvidencePolicy.
--
-- Policy versioning makes delivery effects explicit. Physical delivery is
-- supported as operational evidence, but deadline/legal effects remain policy
-- driven and are not inferred from AR/protocol text alone.

create table delivery_evidence_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  version integer not null,
  effective_from date not null,
  effective_to date,
  communication_type text not null check (communication_type in (
    'collection_attempt', 'extrajudicial_notice'
  )),
  channel text not null check (channel in (
    'email', 'whatsapp', 'correio_ar', 'cartorio', 'outro'
  )),
  evidence_required jsonb not null default '[]'::jsonb,
  validity_rule text not null,
  relevant_timestamp_field text not null,
  failure_behavior text not null,
  requires_human_review boolean not null default false,
  starts_operational_deadline boolean not null default false,
  starts_legal_deadline boolean not null default false,
  approved_by uuid references users(id) on delete set null,
  approved_at timestamptz,
  audit_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint delivery_evidence_policies_version_positive check (version > 0),
  constraint delivery_evidence_policies_effective_range check (
    effective_to is null or effective_to >= effective_from
  )
);

comment on table delivery_evidence_policies is
  'Política versionada de evidência de envio/entrega. Define efeitos operacionais e jurídicos por tipo de comunicação e canal; envio físico é evidência operacional até regra jurídica homologada.';

comment on column delivery_evidence_policies.tenant_id is
  'Null = política global GSBC. Tenant preenchido = override tenant-scoped explícito.';
comment on column delivery_evidence_policies.relevant_timestamp_field is
  'Campo/evento cujo timestamp é relevante para o efeito desta policy (ex.: enviado_em, delivered_at_provider, delivered_at_manual_review).';
comment on column delivery_evidence_policies.starts_legal_deadline is
  'True somente quando a policy homologada define que a evidência inicia prazo jurídico.';

create unique index delivery_evidence_policies_unique_version
  on delivery_evidence_policies (
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    communication_type,
    channel,
    version
  );

create index delivery_evidence_policies_lookup_idx
  on delivery_evidence_policies (communication_type, channel, effective_from, effective_to);

alter table delivery_evidence_policies enable row level security;

create policy delivery_evidence_policies_select on delivery_evidence_policies for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id is null
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

grant select on public.delivery_evidence_policies to authenticated;

insert into delivery_evidence_policies (
  id,
  tenant_id,
  version,
  effective_from,
  communication_type,
  channel,
  evidence_required,
  validity_rule,
  relevant_timestamp_field,
  failure_behavior,
  requires_human_review,
  starts_operational_deadline,
  starts_legal_deadline,
  audit_metadata
)
values
  (
    '39000000-0000-0000-0000-000000000001',
    null,
    1,
    '2026-08-30',
    'extrajudicial_notice',
    'email',
    '["provider_acceptance_without_failure", "recipient_email", "document_id"]'::jsonb,
    'valid_when_delivery_status_entregue_and_no_permanent_failure',
    'enviado_em',
    'falha_nao_avanca_estado_dependente;preserva_erro_e_revisao_humana',
    false,
    true,
    false,
    '{"decision": "email is operational delivery evidence for notice send; legal deadline requires later homologated policy"}'::jsonb
  ),
  (
    '39000000-0000-0000-0000-000000000002',
    null,
    1,
    '2026-08-30',
    'extrajudicial_notice',
    'correio_ar',
    '["destinatario_institucional", "referencia_externa_ou_arquivo", "delivery_status"]'::jsonb,
    'valid_when_non_failure_and_manual_evidence_present;not_legal_deadline_start',
    'enviado_em',
    'falha_devolucao_endereco_invalido_ou_evidencia_ausente_nao_avanca',
    true,
    true,
    false,
    '{"decision": "physical delivery is complementary operational evidence; AR/protocol alone does not encode universal legal deadline start"}'::jsonb
  ),
  (
    '39000000-0000-0000-0000-000000000003',
    null,
    1,
    '2026-08-30',
    'extrajudicial_notice',
    'cartorio',
    '["destinatario_institucional", "protocolo_ou_arquivo", "delivery_status"]'::jsonb,
    'valid_when_non_failure_and_manual_evidence_present;not_legal_deadline_start',
    'enviado_em',
    'falha_devolucao_endereco_invalido_ou_evidencia_ausente_nao_avanca',
    true,
    true,
    false,
    '{"decision": "cartorio/protocol is complementary operational evidence until juridical policy defines deadline effects"}'::jsonb
  ),
  (
    '39000000-0000-0000-0000-000000000004',
    null,
    1,
    '2026-08-30',
    'extrajudicial_notice',
    'outro',
    '["destinatario_institucional", "referencia_externa_ou_arquivo", "delivery_status"]'::jsonb,
    'valid_when_non_failure_and_manual_evidence_present;requires_human_review;not_legal_deadline_start',
    'enviado_em',
    'falha_ou_evidencia_insuficiente_nao_avanca',
    true,
    true,
    false,
    '{"decision": "other physical/equivalent evidence requires human review and explicit policy interpretation"}'::jsonb
  ),
  (
    '39000000-0000-0000-0000-000000000005',
    null,
    1,
    '2026-08-30',
    'collection_attempt',
    'email',
    '["provider_delivery_without_hard_bounce"]'::jsonb,
    'valid_when_provider_acceptance_without_permanent_failure',
    'attempt_completed_at',
    'hard_bounce_nao_conta_como_entrega_e_cria_revisao',
    false,
    true,
    false,
    '{"decision": "preserves DOMAIN_RULES email semantics for collection attempts"}'::jsonb
  ),
  (
    '39000000-0000-0000-0000-000000000006',
    null,
    1,
    '2026-08-30',
    'collection_attempt',
    'whatsapp',
    '["provider_status_delivered_or_equivalent"]'::jsonb,
    'valid_when_provider_status_delivered_or_equivalent_homologado',
    'attempt_completed_at',
    'falha_definitiva_nao_conta_como_entrega_e_cria_revisao',
    false,
    true,
    false,
    '{"decision": "preserves DOMAIN_RULES WhatsApp semantics; implementation pending provider"}'::jsonb
  );

alter table escalonamento_envios
  add column delivery_policy_id uuid references delivery_evidence_policies(id) on delete restrict,
  add column delivery_policy_version integer,
  add column policy_relevant_timestamp timestamptz,
  add column delivery_valid boolean not null default false;

comment on column escalonamento_envios.delivery_policy_id is
  'DeliveryEvidencePolicy aplicada no momento do registro do envio.';
comment on column escalonamento_envios.delivery_policy_version is
  'Snapshot da versão da DeliveryEvidencePolicy aplicada; mudanças futuras de policy não reescrevem o significado histórico.';
comment on column escalonamento_envios.policy_relevant_timestamp is
  'Timestamp relevante conforme a policy aplicada; atualmente enviado_em para STG-09 operacional.';
comment on column escalonamento_envios.delivery_valid is
  'Resultado operacional da policy aplicada. Não implica início de prazo jurídico quando starts_legal_deadline=false.';

drop function if exists public.registrar_envio(uuid, text, text, text, text, uuid, text, text);

create or replace function public.registrar_envio(
  p_escalonamento_id uuid,
  p_canal text,
  p_destinatario text,
  p_delivery_status text,
  p_erro text default null,
  p_comprovante_documento_id uuid default null,
  p_evidencia_referencia text default null,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_cobranca_id uuid;
  v_tenant_id uuid;
  v_id uuid;
  v_primeiro_envio_valido boolean;
  v_evidencia_referencia text;
  v_observacao text;
  v_policy record;
  v_relevant_timestamp timestamptz;
  v_delivery_valid boolean;
begin
  if not public.is_platform_staff(auth.uid()) then
    raise exception 'Apenas a equipe GSBC pode registrar um envio.';
  end if;

  select status, cobranca_id, tenant_id into v_status, v_cobranca_id, v_tenant_id
  from escalonamentos where id = p_escalonamento_id;

  if v_status is null then
    raise exception 'Escalonamento não encontrado.';
  end if;

  if v_status not in ('documento_emitido', 'enviada') then
    raise exception 'Só é possível registrar envio depois do documento emitido.';
  end if;

  if p_canal not in ('email', 'correio_ar', 'cartorio', 'outro') then
    raise exception 'Canal de envio inválido.';
  end if;

  if p_delivery_status not in ('pendente', 'entregue', 'falha', 'desconhecido') then
    raise exception 'Status de entrega inválido.';
  end if;

  if p_delivery_status = 'falha' and nullif(trim(coalesce(p_erro, '')), '') is null then
    raise exception 'Envio com falha exige descrição do erro.';
  end if;

  v_evidencia_referencia := nullif(trim(coalesce(p_evidencia_referencia, '')), '');
  v_observacao := nullif(trim(coalesce(p_observacao, '')), '');

  select *
    into v_policy
    from delivery_evidence_policies
    where communication_type = 'extrajudicial_notice'
      and channel = p_canal
      and effective_from <= current_date
      and (effective_to is null or effective_to >= current_date)
      and (tenant_id is null or tenant_id = v_tenant_id)
    order by (tenant_id is not null) desc, version desc, effective_from desc
    limit 1;

  if v_policy.id is null then
    raise exception 'DeliveryEvidencePolicy não encontrada para canal %.%', 'extrajudicial_notice', p_canal;
  end if;

  if p_canal <> 'email'
     and p_comprovante_documento_id is null
     and v_evidencia_referencia is null then
    raise exception 'Envio físico exige comprovante anexado ou referência externa auditável.';
  end if;

  v_delivery_valid := p_delivery_status <> 'falha'
    and (
      p_canal = 'email'
      or p_comprovante_documento_id is not null
      or v_evidencia_referencia is not null
    );
  v_relevant_timestamp := now();
  v_primeiro_envio_valido := v_status = 'documento_emitido' and v_delivery_valid;

  insert into escalonamento_envios (
    escalonamento_id,
    canal,
    destinatario,
    delivery_status,
    erro,
    comprovante_documento_id,
    evidencia_referencia,
    observacao,
    delivery_policy_id,
    delivery_policy_version,
    policy_relevant_timestamp,
    delivery_valid,
    registrado_por,
    enviado_em
  )
  values (
    p_escalonamento_id,
    p_canal,
    p_destinatario,
    p_delivery_status,
    p_erro,
    p_comprovante_documento_id,
    v_evidencia_referencia,
    v_observacao,
    v_policy.id,
    v_policy.version,
    v_relevant_timestamp,
    v_delivery_valid,
    auth.uid(),
    v_relevant_timestamp
  )
  returning id into v_id;

  if v_delivery_valid then
    update escalonamentos set status = 'enviada' where id = p_escalonamento_id and status <> 'enviada';
  end if;

  insert into escalonamento_eventos (escalonamento_id, tipo, descricao, user_id)
  values (
    p_escalonamento_id,
    case when v_delivery_valid then 'envio' else 'observacao' end,
    p_canal || ' -> ' || p_destinatario ||
      coalesce(' (' || v_evidencia_referencia || ')', '') ||
      ' [policy v' || v_policy.version || '; valid=' || v_delivery_valid || ']' ||
      case when p_delivery_status = 'falha' then ' - falha: ' || p_erro else '' end,
    auth.uid()
  );

  if v_primeiro_envio_valido then
    perform public.change_cobranca_status(
      v_cobranca_id,
      'legal_escalation',
      'Notificação extrajudicial enviada (escalonamento ' || p_escalonamento_id || ')'
    );
  end if;

  return v_id;
end;
$$;

grant execute on function public.registrar_envio(uuid, text, text, text, text, uuid, text, text) to authenticated;
