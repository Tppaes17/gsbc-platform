import "server-only";
import { sendEmail } from "@/lib/email/send";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import { avaliarElegibilidade } from "./eligibility";
import { renderizarTemplate } from "./template";

type AdminClient = ReturnType<typeof createAdminClient>;
type EnrollmentRow = Database["public"]["Tables"]["collection_enrollments"]["Row"];
type ExecutionRow = Database["public"]["Tables"]["collection_executions"]["Row"];
type StepRow = Database["public"]["Tables"]["collection_strategy_steps"]["Row"];

const MAX_TENTATIVAS_EMAIL = 3;
const RETRY_DELAY_MINUTOS = 60;

export interface SweepResultado {
  enrollmentsAvaliados: number;
  execucoesProcessadas: number;
  emailsEnviados: number;
  falhas: number;
  puladosPorElegibilidade: number;
  enrollmentsConcluidos: number;
  erros: string[];
}

function novoResultado(): SweepResultado {
  return {
    enrollmentsAvaliados: 0,
    execucoesProcessadas: 0,
    emailsEnviados: 0,
    falhas: 0,
    puladosPorElegibilidade: 0,
    enrollmentsConcluidos: 0,
    erros: [],
  };
}

/**
 * Varredura da régua de cobrança — chamada pelo cron (Vercel Cron) e,
 * localmente, também disponível para verificação manual/e2e sem esperar
 * o relógio de verdade. Roda com service role: não há sessão de usuário
 * num cron job, então RLS não se aplica — a autorização aqui é "é o
 * próprio motor rodando", não um usuário autenticado.
 */
export async function runCollectionSweep(): Promise<SweepResultado> {
  const supabase = createAdminClient();
  const resultado = novoResultado();

  const { data: enrollments } = await supabase
    .from("collection_enrollments")
    .select("*")
    .eq("status", "active");

  for (const enrollment of enrollments ?? []) {
    resultado.enrollmentsAvaliados++;
    try {
      await processarEnrollment(supabase, enrollment, resultado);
    } catch (err) {
      resultado.erros.push(
        `enrollment ${enrollment.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return resultado;
}

async function processarEnrollment(
  supabase: AdminClient,
  enrollment: EnrollmentRow,
  resultado: SweepResultado,
) {
  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("id, status, valor_cobranca, vencimento")
    .eq("id", enrollment.cobranca_id)
    .single();
  if (!cobranca) return;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, status")
    .eq("id", enrollment.tenant_id)
    .single();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("razao_social, nome_fantasia")
    .eq("id", enrollment.empresa_id)
    .single();

  const { data: negociacao } = await supabase
    .from("negociacoes")
    .select("status")
    .eq("cobranca_id", enrollment.cobranca_id)
    .maybeSingle();

  const elegibilidade = avaliarElegibilidade({
    cobrancaStatus: cobranca.status,
    tenantStatus: tenant?.status ?? "suspended",
    negociacaoStatus: negociacao?.status ?? null,
    enrollmentStatus: enrollment.status,
  });

  if (!elegibilidade.elegivel) {
    resultado.puladosPorElegibilidade++;
    if (elegibilidade.encerrarEnrollment) {
      await supabase
        .from("collection_enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", enrollment.id);
      resultado.enrollmentsConcluidos++;
    }
    return;
  }

  const { data: step } = await supabase
    .from("collection_strategy_steps")
    .select("*")
    .eq("strategy_id", enrollment.strategy_id)
    .eq("ordem", enrollment.current_step_ordem)
    .maybeSingle();

  if (!step) {
    await supabase
      .from("collection_enrollments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", enrollment.id);
    resultado.enrollmentsConcluidos++;
    return;
  }

  const scheduledFor = new Date(enrollment.enrolled_at);
  scheduledFor.setUTCDate(scheduledFor.getUTCDate() + step.dias_apos_inscricao);
  if (scheduledFor.getTime() > Date.now()) {
    return;
  }

  const execucao = await obterOuCriarExecucao(supabase, enrollment.id, step.id, scheduledFor);
  if (!execucao) return;

  resultado.execucoesProcessadas++;
  await supabase.from("collection_executions").update({ status: "processing" }).eq("id", execucao.id);

  const empresaNome = empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa";
  const vars = {
    empresa: { razao_social: empresaNome },
    cobranca: {
      valor: formatCurrencyBRL(cobranca.valor_cobranca ?? 0),
      vencimento: formatDateBR(cobranca.vencimento),
    },
    sindicato: { nome: tenant?.name ?? "GSBC" },
  };

  if (step.canal === "email") {
    const sucesso = await executarStepEmail({
      supabase,
      enrollment,
      cobranca,
      execucao,
      step,
      vars,
      resultado,
    });
    if (!sucesso) return; // não avança — falha/retry tratados dentro
  } else if (step.canal === "tarefa_humana") {
    await supabase
      .from("collection_executions")
      .update({
        status: "completed",
        executed_at: new Date().toISOString(),
        resultado: { tipo: "tarefa_humana", descricao: step.descricao },
      })
      .eq("id", execucao.id);
  } else if (step.canal === "wait") {
    await supabase
      .from("collection_executions")
      .update({ status: "completed", executed_at: new Date().toISOString() })
      .eq("id", execucao.id);
  } else if (step.canal === "escalonamento") {
    await supabase
      .from("collection_executions")
      .update({
        status: "completed",
        executed_at: new Date().toISOString(),
        resultado: { tipo: "escalonamento", descricao: step.descricao },
      })
      .eq("id", execucao.id);
    await supabase.from("collection_enrollments").update({ status: "escalated" }).eq("id", enrollment.id);
    resultado.enrollmentsConcluidos++;
    return;
  }

  await supabase
    .from("collection_enrollments")
    .update({ current_step_ordem: enrollment.current_step_ordem + 1 })
    .eq("id", enrollment.id);
}

async function executarStepEmail({
  supabase,
  enrollment,
  cobranca,
  execucao,
  step,
  vars,
  resultado,
}: {
  supabase: AdminClient;
  enrollment: EnrollmentRow;
  cobranca: { id: string; status: string };
  execucao: ExecutionRow;
  step: StepRow;
  vars: Parameters<typeof renderizarTemplate>[1];
  resultado: SweepResultado;
}): Promise<boolean> {
  if (!step.template_id) {
    await marcarFalhaTerminal(supabase, execucao.id, "Template ausente para step de e-mail.");
    resultado.falhas++;
    return false;
  }

  const { data: template } = await supabase
    .from("collection_templates")
    .select("*")
    .eq("id", step.template_id)
    .single();

  if (!template) {
    await marcarFalhaTerminal(supabase, execucao.id, "Template não encontrado.");
    resultado.falhas++;
    return false;
  }

  const { data: contatos } = await supabase
    .from("empresa_contatos")
    .select("email, principal")
    .eq("empresa_id", enrollment.empresa_id)
    .not("email", "is", null)
    .order("principal", { ascending: false })
    .limit(1);

  const destinatario = contatos?.[0]?.email;

  if (!destinatario) {
    await marcarFalhaTerminal(supabase, execucao.id, "Empresa sem contato com e-mail cadastrado.");
    resultado.falhas++;
    return false;
  }

  const assunto = renderizarTemplate(template.assunto ?? "", vars);
  const text = renderizarTemplate(template.corpo_texto, vars);
  const html = renderizarTemplate(template.corpo_html, vars);

  try {
    await sendEmail({ to: destinatario, subject: assunto, text, html });

    await supabase.from("notificacoes").insert({
      tenant_id: enrollment.tenant_id,
      empresa_id: enrollment.empresa_id,
      cobranca_id: enrollment.cobranca_id,
      destinatario_email: destinatario,
      assunto,
      status: "enviada",
    });

    await supabase
      .from("collection_executions")
      .update({
        status: "sent",
        executed_at: new Date().toISOString(),
        resultado: { destinatario, template_id: template.id },
      })
      .eq("id", execucao.id);

    if (cobranca.status === "approved") {
      await supabase.rpc("change_cobranca_status", {
        p_cobranca_id: cobranca.id,
        p_new_status: "notified",
        p_reason: "Régua de cobrança: e-mail inicial enviado.",
      });
    }

    resultado.emailsEnviados++;
    return true;
  } catch (err) {
    const mensagemErro = err instanceof Error ? err.message : String(err);
    const tentativas = execucao.attempt_count + 1;

    await supabase.from("notificacoes").insert({
      tenant_id: enrollment.tenant_id,
      empresa_id: enrollment.empresa_id,
      cobranca_id: enrollment.cobranca_id,
      destinatario_email: destinatario,
      assunto,
      status: "falha",
      erro: mensagemErro,
    });

    resultado.falhas++;

    if (tentativas >= MAX_TENTATIVAS_EMAIL) {
      await supabase
        .from("collection_executions")
        .update({
          status: "failed",
          attempt_count: tentativas,
          last_error: mensagemErro,
          executed_at: new Date().toISOString(),
        })
        .eq("id", execucao.id);

      await supabase
        .from("collection_enrollments")
        .update({
          status: "paused",
          paused_at: new Date().toISOString(),
          paused_reason: `Falha no envio após ${tentativas} tentativas: ${mensagemErro}`,
        })
        .eq("id", enrollment.id);
    } else {
      const novoAgendamento = new Date(Date.now() + RETRY_DELAY_MINUTOS * 60_000);
      await supabase
        .from("collection_executions")
        .update({
          status: "scheduled",
          attempt_count: tentativas,
          last_error: mensagemErro,
          scheduled_for: novoAgendamento.toISOString(),
        })
        .eq("id", execucao.id);
    }

    return false;
  }
}

async function marcarFalhaTerminal(supabase: AdminClient, execucaoId: string, mensagem: string) {
  await supabase
    .from("collection_executions")
    .update({ status: "failed", last_error: mensagem, executed_at: new Date().toISOString() })
    .eq("id", execucaoId);
}

/**
 * Idempotência (regra STG-02): unique(enrollment_id, step_id) garante que
 * sweeps sobrepostos nunca processem o mesmo step duas vezes. Se a
 * inserção colidir, outro sweep já está cuidando (ou cuidou) desse step —
 * este retorna null e simplesmente não faz nada nesta rodada.
 */
async function obterOuCriarExecucao(
  supabase: AdminClient,
  enrollmentId: string,
  stepId: string,
  scheduledFor: Date,
): Promise<ExecutionRow | null> {
  const { data: existente } = await supabase
    .from("collection_executions")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("step_id", stepId)
    .maybeSingle();

  if (existente) {
    if (existente.status !== "scheduled") return null;
    if (new Date(existente.scheduled_for).getTime() > Date.now()) return null;
    return existente;
  }

  const { data: inserida, error } = await supabase
    .from("collection_executions")
    .insert({
      enrollment_id: enrollmentId,
      step_id: stepId,
      scheduled_for: scheduledFor.toISOString(),
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error || !inserida) {
    const { data: apósCorrida } = await supabase
      .from("collection_executions")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("step_id", stepId)
      .maybeSingle();
    if (
      apósCorrida &&
      apósCorrida.status === "scheduled" &&
      new Date(apósCorrida.scheduled_for).getTime() <= Date.now()
    ) {
      return apósCorrida;
    }
    return null;
  }

  return inserida;
}
