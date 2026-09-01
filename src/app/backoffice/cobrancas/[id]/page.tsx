import { notFound } from "next/navigation";
import Link from "next/link";
import { DetailHeader } from "@/components/design-system/detail-header";
import {
  EntityRelationshipSection,
  EntitySummaryStrip,
  EntityWorkspace,
  EntityWorkspaceNav,
  EntityWorkspaceSection,
} from "@/components/design-system/entity-workspace";
import { formatBrl } from "@/components/design-system/financial-cell";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { isEscalationApprover } from "@/lib/auth/permissions";
import { isAiConfigured } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { valorReferenciaCobranca } from "@/lib/finance/referencia";
import { PagamentosList } from "../../financeiro/pagamentos-list";
import { RegistrarPagamentoAction } from "../../financeiro/pagamento-action";
import { PaymentChargesSection } from "./payment-charges-section";
import { CollectionsCopilotSection } from "./collections-copilot-section";
import { ContestacaoSection } from "./contestacao-section";
import { EscalonamentoSection } from "./escalonamento-section";
import { EditCobrancaForm } from "./edit-cobranca-form";
import { CONTESTACAO_EVENTO_LABEL, ESCALONAMENTO_EVENTO_LABEL, STATUS_TONE, statusLabel } from "./labels";
import { IniciarNegociacaoAction } from "./negociacao-action";
import { NotificacaoAction } from "./notificacao-action";
import { NotificacoesList } from "./notificacoes-list";
import { ReguaCobrancaSection } from "./regua-cobranca-section";
import { StatusAction } from "./status-action";

const DOCUMENTOS_BUCKET = "documentos-empresas";

export default async function CobrancaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select(
      "*, empresas(id, razao_social, nome_fantasia), obrigacoes(descricao, instrumento_id), tenants(name), users!cobrancas_responsavel_id_fkey(full_name)",
    )
    .eq("id", id)
    .single();

  if (!cobranca) {
    notFound();
  }

  const empresa = Array.isArray(cobranca.empresas)
    ? cobranca.empresas[0]
    : cobranca.empresas;
  const obrigacao = Array.isArray(cobranca.obrigacoes)
    ? cobranca.obrigacoes[0]
    : cobranca.obrigacoes;

  const [
    { data: eventos },
    { data: gsbcMembers },
    { data: negociacaoExistente },
    { data: pagamentosRaw },
    { data: conciliacoesRaw },
    { data: contatoPrincipal },
    { data: notificacoes },
    { data: paymentCharges },
  ] = await Promise.all([
    supabase
      .from("cobranca_eventos")
      .select("id, from_status, to_status, reason, created_at, users(full_name)")
      .eq("cobranca_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("user_id, users!memberships_user_id_fkey(full_name), tenants!inner(type)")
      .eq("tenants.type", "platform")
      .eq("status", "active"),
    supabase
      .from("negociacoes")
      .select("id, status, valor_atual")
      .eq("cobranca_id", id)
      .maybeSingle(),
    supabase
      .from("pagamentos")
      .select("id, valor, data_pagamento, forma_pagamento, observacao, users!pagamentos_registrado_por_fkey(full_name)")
      .eq("cobranca_id", id)
      .order("data_pagamento", { ascending: false }),
    supabase
      .from("payment_reconciliations")
      .select("id, pagamento_id, status, gross_amount, provider_fee_amount, net_amount")
      .eq("cobranca_id", id),
    supabase
      .from("empresa_contatos")
      .select("email, principal")
      .eq("empresa_id", cobranca.empresa_id)
      .not("email", "is", null)
      .order("principal", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notificacoes")
      .select("id, destinatario_email, assunto, status, erro, created_at")
      .eq("cobranca_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_charges")
      .select("id, tipo, status, external_id, qr_code, linha_digitavel, expires_at, created_at")
      .eq("cobranca_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const { data: enrollmentRows } = await supabase
    .from("collection_enrollments")
    .select("id, status, current_step_ordem, enrolled_at, paused_reason, strategy_id")
    .eq("cobranca_id", id)
    .order("enrolled_at", { ascending: false })
    .limit(1);

  const enrollment = enrollmentRows?.[0] ?? null;

  const { data: contestacaoRows } = await supabase
    .from("contestacoes")
    .select("id, tipo, status, motivo, valor_alegado, aberta_em")
    .eq("cobranca_id", id)
    .order("aberta_em", { ascending: false })
    .limit(1);

  const contestacao = contestacaoRows?.[0] ?? null;

  const [{ data: contestacaoEventosRaw }, { data: contestacaoEvidenciasRaw }] = await Promise.all([
    contestacao
      ? supabase
          .from("contestacao_eventos")
          .select("id, tipo, descricao, valor, created_at, users(full_name)")
          .eq("contestacao_id", contestacao.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    contestacao
      ? supabase
          .from("contestacao_evidencias")
          .select(
            "id, tipo, comentario, fundamento, created_at, users(full_name), documentos(nome_arquivo, storage_path)",
          )
          .eq("contestacao_id", contestacao.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const contestacaoEventos: TimelineItem[] = (contestacaoEventosRaw ?? []).map((ev) => {
    const author = Array.isArray(ev.users) ? ev.users[0] : ev.users;
    const descricaoPartes = [ev.descricao, author ? `por ${author.full_name}` : null].filter(
      Boolean,
    );
    return {
      id: ev.id,
      label: CONTESTACAO_EVENTO_LABEL[ev.tipo] ?? ev.tipo,
      description: descricaoPartes.join(" · ") || undefined,
      timestamp: ev.created_at,
    };
  });

  const contestacaoEvidencias = await Promise.all(
    (contestacaoEvidenciasRaw ?? []).map(async (ev) => {
      const autor = Array.isArray(ev.users) ? ev.users[0] : ev.users;
      const documento = Array.isArray(ev.documentos) ? ev.documentos[0] : ev.documentos;
      let documentoUrl: string | null = null;
      if (documento) {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTOS_BUCKET)
          .createSignedUrl(documento.storage_path, 300);
        documentoUrl = signed?.signedUrl ?? null;
      }
      return {
        id: ev.id,
        tipo: ev.tipo,
        comentario: ev.comentario,
        fundamento: ev.fundamento,
        created_at: ev.created_at,
        userNome: autor?.full_name ?? null,
        documentoNome: documento?.nome_arquivo ?? null,
        documentoUrl,
      };
    }),
  );

  const { data: escalonamentoRows } = await supabase
    .from("escalonamentos")
    .select("id, status, motivo, motivo_decisao, iniciado_em, aprovado_em, concluido_em")
    .eq("cobranca_id", id)
    .order("iniciado_em", { ascending: false })
    .limit(1);

  const escalonamento = escalonamentoRows?.[0] ?? null;

  const [
    { data: escalonamentoEventosRaw },
    { data: escalonamentoDocumentosRaw },
    { data: escalonamentoEnviosRaw },
  ] = await Promise.all([
    escalonamento
      ? supabase
          .from("escalonamento_eventos")
          .select("id, tipo, descricao, created_at, users(full_name)")
          .eq("escalonamento_id", escalonamento.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    escalonamento
      ? supabase
          .from("escalonamento_documentos")
          .select("id, template_versao, created_at, documentos(nome_arquivo, storage_path)")
          .eq("escalonamento_id", escalonamento.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    escalonamento
      ? supabase
          .from("escalonamento_envios")
          .select(
            "id, canal, destinatario, delivery_status, erro, evidencia_referencia, observacao, delivery_policy_version, policy_relevant_timestamp, delivery_valid, enviado_em, documentos(storage_path)",
          )
          .eq("escalonamento_id", escalonamento.id)
          .order("enviado_em", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const escalonamentoEventos: TimelineItem[] = (escalonamentoEventosRaw ?? []).map((ev) => {
    const author = Array.isArray(ev.users) ? ev.users[0] : ev.users;
    const descricaoPartes = [ev.descricao, author ? `por ${author.full_name}` : null].filter(
      Boolean,
    );
    return {
      id: ev.id,
      label: ESCALONAMENTO_EVENTO_LABEL[ev.tipo] ?? ev.tipo,
      description: descricaoPartes.join(" · ") || undefined,
      timestamp: ev.created_at,
    };
  });

  const escalonamentoDocumentos = await Promise.all(
    (escalonamentoDocumentosRaw ?? []).map(async (doc) => {
      const documento = Array.isArray(doc.documentos) ? doc.documentos[0] : doc.documentos;
      let url: string | null = null;
      if (documento) {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTOS_BUCKET)
          .createSignedUrl(documento.storage_path, 300);
        url = signed?.signedUrl ?? null;
      }
      return {
        id: doc.id,
        nomeArquivo: documento?.nome_arquivo ?? "Notificação extrajudicial.pdf",
        url,
        templateVersao: doc.template_versao,
        createdAt: doc.created_at,
      };
    }),
  );

  const escalonamentoEnvios = await Promise.all(
    (escalonamentoEnviosRaw ?? []).map(async (envio) => {
      const comprovante = Array.isArray(envio.documentos) ? envio.documentos[0] : envio.documentos;
      let comprovanteUrl: string | null = null;
      if (comprovante) {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTOS_BUCKET)
          .createSignedUrl(comprovante.storage_path, 300);
        comprovanteUrl = signed?.signedUrl ?? null;
      }
      return {
        id: envio.id,
        canal: envio.canal,
        destinatario: envio.destinatario,
        deliveryStatus: envio.delivery_status,
        erro: envio.erro,
        evidenciaReferencia: envio.evidencia_referencia,
        observacao: envio.observacao,
        deliveryPolicyVersion: envio.delivery_policy_version,
        policyRelevantTimestamp: envio.policy_relevant_timestamp,
        deliveryValid: envio.delivery_valid,
        enviadoEm: envio.enviado_em,
        comprovanteUrl,
      };
    }),
  );

  const [{ data: enrollmentSteps }, { data: execucoesRaw }] = await Promise.all([
    enrollment
      ? supabase
          .from("collection_strategy_steps")
          .select("ordem, dias_apos_inscricao, canal, descricao")
          .eq("strategy_id", enrollment.strategy_id)
          .order("ordem")
      : Promise.resolve({ data: [] as { ordem: number; dias_apos_inscricao: number; canal: string; descricao: string }[] }),
    enrollment
      ? supabase
          .from("collection_executions")
          .select(
            "id, status, scheduled_for, executed_at, last_error, collection_strategy_steps(ordem, dias_apos_inscricao, canal, descricao)",
          )
          .eq("enrollment_id", enrollment.id)
          .order("scheduled_for", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const execucoes = (execucoesRaw ?? []).map((e) => {
    const step = Array.isArray(e.collection_strategy_steps)
      ? e.collection_strategy_steps[0]
      : e.collection_strategy_steps;
    return {
      id: e.id,
      status: e.status,
      scheduled_for: e.scheduled_for,
      executed_at: e.executed_at,
      last_error: e.last_error,
      step: step ?? null,
    };
  });

  const conciliacaoPorPagamento = new Map(
    (conciliacoesRaw ?? []).map((c) => [c.pagamento_id, c]),
  );

  const pagamentos = (pagamentosRaw ?? []).map((p) => {
    const registrador = Array.isArray(p.users) ? p.users[0] : p.users;
    const conciliacao = conciliacaoPorPagamento.get(p.id);
    return {
      id: p.id,
      valor: p.valor,
      data_pagamento: p.data_pagamento,
      forma_pagamento: p.forma_pagamento,
      observacao: p.observacao,
      registradoPorNome: registrador?.full_name ?? null,
      conciliacao: conciliacao
        ? {
            status: conciliacao.status,
            valorBruto: conciliacao.gross_amount,
            taxas: conciliacao.provider_fee_amount,
            valorLiquido: conciliacao.net_amount,
            repasses: [],
          }
        : null,
    };
  });

  const timelineItems: TimelineItem[] = (eventos ?? []).map((evento) => {
    const author = Array.isArray(evento.users) ? evento.users[0] : evento.users;
    const label = evento.from_status
      ? `${statusLabel(evento.from_status)} → ${statusLabel(evento.to_status)}`
      : `Cobrança criada — ${statusLabel(evento.to_status)}`;
    const description = [evento.reason, author ? `por ${author.full_name}` : null]
      .filter(Boolean)
      .join(" · ");
    return {
      id: evento.id,
      label,
      description: description || undefined,
      timestamp: evento.created_at,
    };
  });

  const valorReferencia = valorReferenciaCobranca(cobranca.valor_cobranca, negociacaoExistente);
  const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const saldoAtual = Math.max(valorReferencia - totalPago, 0);
  const temAcordoComDesconto =
    negociacaoExistente?.status === "aceita" &&
    negociacaoExistente.valor_atual !== null &&
    negociacaoExistente.valor_atual !== cobranca.valor_cobranca;

  const responsaveis = (gsbcMembers ?? []).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    return { id: m.user_id, nome: u?.full_name ?? "—" };
  });

  // Garante que o responsável atual apareça no Select mesmo quando o
  // usuário logado não pode listar memberships do tenant GSBC (ex.: membro
  // de sindicato) — só pode ver o nome deste usuário específico via a
  // policy de users_select (regra 6: transparência sobre quem executa).
  const responsavelAtual = Array.isArray(cobranca.users)
    ? cobranca.users[0]
    : cobranca.users;
  if (
    cobranca.responsavel_id &&
    responsavelAtual &&
    !responsaveis.some((r) => r.id === cobranca.responsavel_id)
  ) {
    responsaveis.push({
      id: cobranca.responsavel_id,
      nome: responsavelAtual.full_name,
    });
  }

  const navItems = [
    { id: "overview", label: "Visão geral" },
    { id: "cadastro", label: "Cadastro" },
    { id: "financeiro", label: "Financeiro", meta: pagamentos.length },
    ...(user.isPlatformStaff ? [{ id: "cobranca-provider", label: "Cobrança digital" }] : []),
    ...(user.isPlatformStaff ? [{ id: "regua", label: "Régua" }] : []),
    { id: "contestacao", label: "Contestação", meta: contestacao ? 1 : 0 },
    { id: "escalonamento", label: "Escalonamento", meta: escalonamento ? 1 : 0 },
    { id: "notificacoes", label: "Notificações", meta: notificacoes?.length ?? 0 },
    ...(user.isPlatformStaff ? [{ id: "copilot", label: "Copilot" }] : []),
    { id: "historico", label: "Histórico", meta: timelineItems.length },
  ];

  return (
    <EntityWorkspace>
      <DetailHeader
        title={empresa?.nome_fantasia ?? empresa?.razao_social ?? "Cobrança"}
        subtitle={`${obrigacao?.descricao ?? "—"} · ${cobranca.tenants?.name ?? "—"}`}
        status={{
          label: statusLabel(cobranca.status),
          tone: STATUS_TONE[cobranca.status] ?? "neutral",
        }}
        metadata={[
          {
            label: temAcordoComDesconto ? "Valor original" : "Valor total",
            value: formatBrl(cobranca.valor_cobranca),
          },
          ...(temAcordoComDesconto
            ? [
                {
                  label: "Valor acordado (negociação)",
                  value: formatBrl(valorReferencia),
                },
              ]
            : []),
        ]}
        actions={
          user.isPlatformStaff ? (
            <StatusAction cobrancaId={cobranca.id} currentStatus={cobranca.status} />
          ) : undefined
        }
      />

      <EntityWorkspaceNav items={navItems} />

      <EntityWorkspaceSection
        id="overview"
        title="Visão geral"
        description="Contexto da cobrança sem tratá-la como dívida confirmada além do status registrado."
      >
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <EntityRelationshipSection>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Relação operacional
            </p>
            <div className="mt-2 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                {empresa ? (
                  <Link
                    href={`/backoffice/empresas/${empresa.id}`}
                    className="font-medium hover:underline"
                  >
                    {empresa.nome_fantasia ?? empresa.razao_social}
                  </Link>
                ) : (
                  <p className="font-medium">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Obrigação de origem</p>
                <p className="font-medium">{obrigacao?.descricao ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sindicato</p>
                <p className="font-medium">{cobranca.tenants?.name ?? "—"}</p>
              </div>
            </div>
          </EntityRelationshipSection>

          <EntityRelationshipSection>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Próxima ação
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {user.isPlatformStaff && !negociacaoExistente ? (
                <IniciarNegociacaoAction cobrancaId={cobranca.id} responsaveis={responsaveis} />
              ) : negociacaoExistente ? (
                <Link
                  href={`/backoffice/negociacoes/${negociacaoExistente.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  Ver negociação vinculada
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma ação disponível para este perfil.</p>
              )}
              {user.isPlatformStaff ? (
                <NotificacaoAction
                  cobrancaId={cobranca.id}
                  destinatarioEmail={contatoPrincipal?.email ?? null}
                  empresaNome={empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa"}
                  tenantNome={cobranca.tenants?.name ?? "GSBC"}
                  obrigacaoDescricao={obrigacao?.descricao ?? "—"}
                  valorCobranca={cobranca.valor_cobranca}
                  vencimento={cobranca.vencimento}
                />
              ) : null}
            </div>
          </EntityRelationshipSection>
        </div>

        <EntitySummaryStrip
          items={[
            { label: "Valor de referência", value: formatBrl(valorReferencia) },
            { label: "Pago", value: formatBrl(totalPago), tone: "positive" },
            {
              label: "Saldo",
              value: formatBrl(saldoAtual),
              tone: saldoAtual > 0 ? "warning" : "muted",
            },
            { label: "Vencimento", value: cobranca.vencimento ?? "—" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-4">
          {obrigacao?.instrumento_id ? (
            <Link
              href={`/backoffice/instrumentos/${obrigacao.instrumento_id}`}
              className="text-sm text-primary hover:underline"
            >
              Ver instrumento de origem
            </Link>
          ) : null}
        </div>
      </EntityWorkspaceSection>

      <EntityWorkspaceSection
        id="cadastro"
        title="Cadastro"
        description="Dados editáveis separados da leitura operacional."
      >
        <EditCobrancaForm
          cobranca={cobranca}
          responsaveis={responsaveis}
          readOnly={!user.isPlatformStaff}
        />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection
        id="financeiro"
        title="Financeiro"
        action={
          user.isPlatformStaff ? (
            <RegistrarPagamentoAction
              cobrancaId={cobranca.id}
              empresaNome={empresa?.nome_fantasia ?? empresa?.razao_social ?? "—"}
              obrigacaoDescricao={obrigacao?.descricao ?? "—"}
              saldoAtual={saldoAtual}
            />
          ) : undefined
        }
      >
        <PagamentosList pagamentos={pagamentos} valorReferencia={valorReferencia} />
      </EntityWorkspaceSection>

      {user.isPlatformStaff ? (
        <EntityWorkspaceSection id="cobranca-provider" title="Cobrança digital">
          <PaymentChargesSection cobrancaId={cobranca.id} charges={paymentCharges ?? []} />
        </EntityWorkspaceSection>
      ) : null}

      {user.isPlatformStaff ? (
        <EntityWorkspaceSection id="regua" title="Régua de cobrança">
          <ReguaCobrancaSection
            cobrancaId={cobranca.id}
            enrollment={enrollment}
            steps={enrollmentSteps ?? []}
            execucoes={execucoes}
          />
        </EntityWorkspaceSection>
      ) : null}

      <EntityWorkspaceSection id="contestacao" title="Contestação">
        <ContestacaoSection
          cobrancaId={cobranca.id}
          contestacao={contestacao}
          eventos={contestacaoEventos}
          evidencias={contestacaoEvidencias}
          canManage={user.isPlatformStaff}
        />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="escalonamento" title="Escalonamento">
        <EscalonamentoSection
          cobrancaId={cobranca.id}
          escalonamento={
            escalonamento
              ? {
                  id: escalonamento.id,
                  status: escalonamento.status,
                  motivo: escalonamento.motivo,
                  motivoDecisao: escalonamento.motivo_decisao,
                  iniciadoEm: escalonamento.iniciado_em,
                  aprovadoEm: escalonamento.aprovado_em,
                  concluidoEm: escalonamento.concluido_em,
                }
              : null
          }
          eventos={escalonamentoEventos}
          documentos={escalonamentoDocumentos}
          envios={escalonamentoEnvios}
          canManage={user.isPlatformStaff}
          canApprove={isEscalationApprover(user)}
        />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="notificacoes" title="Notificações">
        <NotificacoesList notificacoes={notificacoes ?? []} />
      </EntityWorkspaceSection>

      {user.isPlatformStaff ? (
        <EntityWorkspaceSection id="copilot" title="Copilot">
          <CollectionsCopilotSection cobrancaId={cobranca.id} aiConfigured={isAiConfigured()} />
        </EntityWorkspaceSection>
      ) : null}

      <EntityWorkspaceSection id="historico" title="Histórico">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline items={timelineItems} />
          </CardContent>
        </Card>
      </EntityWorkspaceSection>
    </EntityWorkspace>
  );
}
