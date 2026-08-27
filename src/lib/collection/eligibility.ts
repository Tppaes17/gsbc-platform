import "server-only";

/**
 * isStillEligible() do STG-02 — checado antes de CADA execução, nunca só
 * na inscrição. Pagamento, negociação, suspensão, cancelamento e pausa
 * manual sempre interrompem a régua; a plataforma nunca continua
 * cobrando cegamente depois de um desses eventos (regra 5.6 do AGENTS.md).
 */

const STATUS_ENCERRAM_REGUA = new Set([
  "paid",
  "agreement_reached",
  "cancelled",
  "closed",
  "legal_escalation",
]);

/**
 * 'contestada' entra aqui em vez de virar um novo parâmetro/consulta
 * própria de contestação — abrir_contestacao() (STG-04) já transiciona a
 * cobrança para este status via change_cobranca_status(), então checar o
 * status da cobrança já basta: fecha a pendência registrada nas Rodadas
 * 19/20 ("elegibilidade não considera contestação") sem duplicar consulta.
 */
const STATUS_PAUSAM_REGUA = new Set(["suspended", "contestada"]);

const NEGOCIACAO_STATUS_ABERTOS = new Set(["aberta", "em_negociacao"]);

export interface ElegibilidadeResultado {
  elegivel: boolean;
  motivo: string | null;
  /** true = a cobrança já foi resolvida, a régua deve ser encerrada (completed). false = pausa temporária, pode retomar sozinha quando a condição passar. */
  encerrarEnrollment: boolean;
}

export function avaliarElegibilidade({
  cobrancaStatus,
  tenantStatus,
  negociacaoStatus,
  enrollmentStatus,
}: {
  cobrancaStatus: string;
  tenantStatus: string;
  negociacaoStatus: string | null;
  enrollmentStatus: string;
}): ElegibilidadeResultado {
  if (enrollmentStatus === "paused") {
    return { elegivel: false, motivo: "Régua pausada manualmente.", encerrarEnrollment: false };
  }

  if (tenantStatus !== "active") {
    return { elegivel: false, motivo: "Sindicato não está ativo.", encerrarEnrollment: false };
  }

  if (STATUS_ENCERRAM_REGUA.has(cobrancaStatus)) {
    return {
      elegivel: false,
      motivo: `Cobrança em status "${cobrancaStatus}" — régua encerrada.`,
      encerrarEnrollment: true,
    };
  }

  if (STATUS_PAUSAM_REGUA.has(cobrancaStatus)) {
    return { elegivel: false, motivo: "Cobrança suspensa.", encerrarEnrollment: false };
  }

  if (negociacaoStatus && NEGOCIACAO_STATUS_ABERTOS.has(negociacaoStatus)) {
    return { elegivel: false, motivo: "Negociação em andamento.", encerrarEnrollment: false };
  }

  return { elegivel: true, motivo: null, encerrarEnrollment: false };
}
