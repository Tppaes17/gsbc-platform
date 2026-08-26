export const nivelConfiancaOptions = [
  { value: "confirmado", label: "Confirmado" },
  { value: "provavel", label: "Provável" },
  { value: "nao_confirmado", label: "Não confirmado" },
  { value: "conflitante", label: "Conflitante" },
  { value: "desatualizado", label: "Desatualizado" },
] as const;

export const dossieStatusOptions = [
  { value: "novo", label: "Novo" },
  { value: "pesquisa_iniciada", label: "Pesquisa iniciada" },
  { value: "cadastro_validado", label: "Cadastro validado" },
  { value: "conflito_identificado", label: "Conflito identificado" },
  { value: "revisao_cadastral", label: "Revisão cadastral" },
] as const;

export const scoreClassificacaoOptions = [
  { value: "excelente", label: "Excelente" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
  { value: "insuficiente", label: "Insuficiente" },
] as const;

export function classificarScore(score: number): (typeof scoreClassificacaoOptions)[number]["value"] {
  if (score >= 90) return "excelente";
  if (score >= 75) return "alta";
  if (score >= 60) return "media";
  if (score >= 40) return "baixa";
  return "insuficiente";
}
