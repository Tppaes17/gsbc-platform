import "server-only";
import { consultarCnpjOficial, type CnpjOficial } from "@/lib/cnpj/brasil-api";
import { enriquecerCnpjLeadCnpj } from "@/lib/cnpj/leadcnpj";
import { classificarScore } from "@/lib/validation/dossie-cadastral";
import type { DossieEvidenciaTipo, DossieStatus, NivelConfianca } from "@/types/database.types";

/**
 * Avaliador de CNPJ compartilhado — extraído de dossie-actions.ts
 * (Rodada 14/15) para ser reaproveitado tanto pelo fluxo de empresa
 * (dossiê vinculado, com checagem de conflito contra o cadastro GSBC)
 * quanto pelo fluxo de prospecto (Rodada 16, sem empresa vinculada).
 *
 * Cobre a identidade oficial (BrasilAPI/Receita Federal) e o
 * enriquecimento web (LeadCNPJ), com o score da seção 13 do
 * prompt-mestre. Checagem de conflito contra um cadastro GSBC existente
 * é responsabilidade de quem chama — este módulo não conhece `empresas`.
 */

export interface EvidenciaInput {
  tipo: DossieEvidenciaTipo;
  campo: string | null;
  valor: string | null;
  fonte: string;
  nivel_confianca: NivelConfianca;
  observacao: string | null;
}

export const FONTE_BRASIL_API = "BrasilAPI / Receita Federal (Minha Receita)";
export const FONTE_LEADCNPJ = "LeadCNPJ (enriquecimento web)";

export function normalizar(valor: string | null | undefined) {
  return (valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface AvaliacaoEncontrada {
  status: "encontrado";
  dadosOficiais: CnpjOficial;
  dadosEnriquecimento: Record<string, unknown> | null;
  ativa: boolean;
  evidencias: EvidenciaInput[];
  score: number;
  classificacao: ReturnType<typeof classificarScore>;
  enriquecimentoStatus: "encontrado" | "nao_configurado" | "nao_encontrado" | "erro";
}

export type AvaliacaoResultado =
  | AvaliacaoEncontrada
  | { status: "nao_encontrado" }
  | { status: "erro"; mensagem: string };

export async function avaliarCnpj(cnpjEntrada: string): Promise<AvaliacaoResultado> {
  const resultado = await consultarCnpjOficial(cnpjEntrada);

  if (resultado.status === "erro") {
    return { status: "erro", mensagem: resultado.mensagem };
  }
  if (resultado.status === "nao_encontrado") {
    return { status: "nao_encontrado" };
  }

  const dados = resultado.dados;
  const evidencias: EvidenciaInput[] = [];
  let score = 0;

  evidencias.push({
    tipo: "cnpj",
    campo: "cnpj",
    valor: dados.cnpj,
    fonte: FONTE_BRASIL_API,
    nivel_confianca: "confirmado",
    observacao: null,
  });

  const ativa = normalizar(dados.situacaoCadastral) === "ATIVA";
  score += ativa ? 30 : 0;
  evidencias.push({
    tipo: "situacao_cadastral",
    campo: "situacao_cadastral",
    valor: dados.situacaoCadastral,
    fonte: FONTE_BRASIL_API,
    nivel_confianca: "confirmado",
    observacao: ativa
      ? null
      : "CNPJ não está ativo na Receita Federal — indício identificado, não conclui irregularidade automaticamente (regra 23 do prompt-mestre).",
  });

  const qsaNomes = dados.qsa.map((s) => normalizar(s.nome));
  if (dados.qsa.length > 0) {
    evidencias.push({
      tipo: "qsa",
      campo: "quadro_societario",
      valor: dados.qsa.map((s) => s.nome).join("; "),
      fonte: FONTE_BRASIL_API,
      nivel_confianca: "confirmado",
      observacao: `${dados.qsa.length} sócio(s)/administrador(es) identificado(s) na Receita Federal.`,
    });
  } else {
    evidencias.push({
      tipo: "qsa",
      campo: "quadro_societario",
      valor: null,
      fonte: FONTE_BRASIL_API,
      nivel_confianca: "nao_confirmado",
      observacao: "QSA não disponível na Receita Federal para este CNPJ.",
    });
  }

  // --- Fase 2: enriquecimento web (LeadCNPJ) — score de confiabilidade
  // segue a tabela da seção 13 do prompt-mestre.
  let dadosEnriquecimento: Record<string, unknown> | null = null;
  let responsavelIdentificado = dados.qsa.length > 0;
  let duasFontesIndependentes = false;

  const enriquecimento = await enriquecerCnpjLeadCnpj(dados.cnpj);

  if (enriquecimento.status === "encontrado") {
    const e = enriquecimento.dados;
    dadosEnriquecimento = e.raw;

    if (e.siteOficial) {
      score += 20;
      evidencias.push({
        tipo: "site",
        campo: "site_oficial",
        valor: e.siteOficial,
        fonte: FONTE_LEADCNPJ,
        nivel_confianca: "confirmado",
        observacao: null,
      });
    }

    if (e.emails.length > 0) {
      score += 15;
      for (const email of e.emails) {
        evidencias.push({
          tipo: "email",
          campo: "email_institucional",
          valor: email,
          fonte: FONTE_LEADCNPJ,
          nivel_confianca: "confirmado",
          observacao: null,
        });
      }
    }

    if (e.telefone) {
      score += 10;
      evidencias.push({
        tipo: "telefone",
        campo: "telefone_institucional",
        valor: e.telefone,
        fonte: FONTE_LEADCNPJ,
        nivel_confianca: "confirmado",
        observacao: null,
      });
    }

    if (e.decisores.length > 0) {
      responsavelIdentificado = true;
      for (const d of e.decisores) {
        evidencias.push({
          tipo: "decisor",
          campo: "decisor",
          valor: d.cargo ? `${d.nome} — ${d.cargo}` : d.nome,
          fonte: FONTE_LEADCNPJ,
          nivel_confianca: "provavel",
          observacao: null,
        });
        if (qsaNomes.includes(normalizar(d.nome))) {
          duasFontesIndependentes = true;
        }
      }
    }

    const linkedin = e.redesSociais.find((url) => url.includes("linkedin.com"));
    if (linkedin) {
      score += 5;
      evidencias.push({
        tipo: "redes_sociais",
        campo: "linkedin",
        valor: linkedin,
        fonte: FONTE_LEADCNPJ,
        nivel_confianca: "confirmado",
        observacao: null,
      });
    }
    for (const url of e.redesSociais.filter((u) => u !== linkedin)) {
      evidencias.push({
        tipo: "redes_sociais",
        campo: "rede_social",
        valor: url,
        fonte: FONTE_LEADCNPJ,
        nivel_confianca: "provavel",
        observacao: null,
      });
    }
  } else if (enriquecimento.status === "erro") {
    evidencias.push({
      tipo: "outro",
      campo: "enriquecimento_web",
      valor: null,
      fonte: FONTE_LEADCNPJ,
      nivel_confianca: "nao_confirmado",
      observacao: `Falha ao consultar enriquecimento web: ${enriquecimento.mensagem}`,
    });
  } else if (enriquecimento.status === "nao_encontrado") {
    evidencias.push({
      tipo: "outro",
      campo: "enriquecimento_web",
      valor: null,
      fonte: FONTE_LEADCNPJ,
      nivel_confianca: "nao_confirmado",
      observacao: "Empresa não localizada na base de enriquecimento web.",
    });
  }
  // status "nao_configurado": Fase 2 ainda não tem chave de API
  // configurada — segue só com a Fase 1 (Receita Federal), sem erro.

  if (responsavelIdentificado) {
    score += 10;
  }
  if (duasFontesIndependentes) {
    score += 10;
  }

  const scoreFinal = Math.min(score, 100);

  return {
    status: "encontrado",
    dadosOficiais: dados,
    dadosEnriquecimento,
    ativa,
    evidencias,
    score: scoreFinal,
    classificacao: classificarScore(scoreFinal),
    enriquecimentoStatus: enriquecimento.status,
  };
}

export interface DecisaoStatusDossie {
  status: DossieStatus;
  descartadoMotivo: string | null;
}

/**
 * Decide o status do dossiê a partir de um resultado já "encontrado" ou
 * "nao_encontrado" de avaliarCnpj — nunca chamar com "erro" (falha de
 * rede/validação não é uma decisão sobre a empresa, quem chama decide
 * o que fazer nesse caso, normalmente não alterar nada).
 *
 * Única fonte da regra "descarta se não ativa ou não encontrada"
 * (Rodada 30) — usada tanto pela consulta manual quanto pela automática
 * no import, pra nunca dar resultado diferente dependendo de quem/quando
 * dispara a consulta.
 */
export function decidirStatusDossie(
  resultado: AvaliacaoEncontrada | { status: "nao_encontrado" },
): DecisaoStatusDossie {
  if (resultado.status === "nao_encontrado") {
    return {
      status: "descartado_receita",
      descartadoMotivo: "CNPJ não localizado na Receita Federal.",
    };
  }

  if (!resultado.ativa) {
    return {
      status: "descartado_receita",
      descartadoMotivo: `CNPJ com situação cadastral "${resultado.dadosOficiais.situacaoCadastral}" na Receita Federal (diferente de ATIVA).`,
    };
  }

  return { status: "cadastro_validado", descartadoMotivo: null };
}
