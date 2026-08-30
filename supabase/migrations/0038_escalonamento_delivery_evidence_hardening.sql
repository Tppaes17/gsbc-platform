-- STG-09 hardening: delivery failure must not advance legal escalation, and
-- physical evidence may be recorded by an auditable external reference when no
-- file is available yet.

alter table public.escalonamento_envios
  add column if not exists evidencia_referencia text,
  add column if not exists observacao text;

comment on column public.escalonamento_envios.evidencia_referencia is
  'Referência externa auditável da evidência de envio físico (ex.: código AR, protocolo de cartório), quando ainda não há documento anexado.';

comment on column public.escalonamento_envios.observacao is
  'Observação operacional sobre a evidência de envio, preservada junto ao evento.';

drop function if exists public.registrar_envio(uuid, text, text, text, text, uuid);

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
  v_id uuid;
  v_primeiro_envio_valido boolean;
  v_evidencia_referencia text;
  v_observacao text;
begin
  if not public.is_platform_staff(auth.uid()) then
    raise exception 'Apenas a equipe GSBC pode registrar um envio.';
  end if;

  select status, cobranca_id into v_status, v_cobranca_id
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

  if p_canal <> 'email'
     and p_comprovante_documento_id is null
     and v_evidencia_referencia is null then
    raise exception 'Envio físico exige comprovante anexado ou referência externa auditável.';
  end if;

  v_primeiro_envio_valido := v_status = 'documento_emitido' and p_delivery_status <> 'falha';

  insert into escalonamento_envios (
    escalonamento_id,
    canal,
    destinatario,
    delivery_status,
    erro,
    comprovante_documento_id,
    evidencia_referencia,
    observacao,
    registrado_por
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
    auth.uid()
  )
  returning id into v_id;

  if p_delivery_status <> 'falha' then
    update escalonamentos set status = 'enviada' where id = p_escalonamento_id and status <> 'enviada';
  end if;

  insert into escalonamento_eventos (escalonamento_id, tipo, descricao, user_id)
  values (
    p_escalonamento_id,
    case when p_delivery_status = 'falha' then 'observacao' else 'envio' end,
    p_canal || ' -> ' || p_destinatario ||
      coalesce(' (' || v_evidencia_referencia || ')', '') ||
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
