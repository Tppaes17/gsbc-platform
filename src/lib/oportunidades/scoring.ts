/**
 * Opportunity Score determinístico (STG-10) — primeira versão, sem ML
 * (regra explícita do roadmap: "primeiro acumular dados"). Mesmo padrão
 * de avaliarCnpj() (Rodada 14): pontos aditivos por dimensão, cada um
 * pareado com uma explicação legível — a explicabilidade nasce da
 * própria estrutura do cálculo, não é uma camada separada.
 *
 * Inferência nunca é obrigação jurídica confirmada (regra explícita do
 * roadmap) — todo campo derivado aqui é rotulado como estimativa/fit,
 * nunca apresentado como fato.
 */

export type Dimensao =
  | "fit_territorial"
  | "fit_atividade"
  | "qualidade_evidencias"
  | "completude"
  | "potencial_economico"
  | "recencia"
  | "qualidade_contato";

export const PESO_MAXIMO: Record<Dimensao, number> = {
  fit_territorial: 20,
  fit_atividade: 20,
  qualidade_evidencias: 10,
  completude: 15,
  potencial_economico: 20,
  recencia: 5,
  qualidade_contato: 10,
};

export interface FatorScore {
  dimensao: Dimensao;
  pontos: number;
  pesoMaximo: number;
  explicacao: string;
  sourceType: "observed_data" | "derived_inference";
  sourceFields: string[];
  evidenceSnapshot: Record<string, unknown>;
}

export interface ProspectoParaAvaliacao {
  uf: string | null;
  municipio: string | null;
  cnaeDescricao: string | null;
  temDadosOficiais: boolean;
  temRazaoSocial: boolean;
  temSituacaoCadastral: boolean;
  temQsa: boolean;
  temEmail: boolean;
  temTelefone: boolean;
  ultimaConsultaEm: string | null;
  quantidadeFontesDistintas: number;
}

export interface SindicatoCandidato {
  tenantId: string;
  tenantNome: string;
  categoria: string | null;
  baseTerritorial: string | null;
}

export interface CandidatoAvaliado {
  tenantId: string;
  tenantNome: string;
  fitTerritorial: number;
  fitAtividade: number;
  combinado: number;
}

const UF_NOMES: Record<string, string[]> = {
  AC: ["acre"],
  AL: ["alagoas"],
  AP: ["amapa"],
  AM: ["amazonas"],
  BA: ["bahia"],
  CE: ["ceara"],
  DF: ["distrito federal", "brasilia"],
  ES: ["espirito santo"],
  GO: ["goias"],
  MA: ["maranhao"],
  MT: ["mato grosso"],
  MS: ["mato grosso do sul"],
  MG: ["minas gerais"],
  PA: ["para"],
  PB: ["paraiba"],
  PR: ["parana"],
  PE: ["pernambuco"],
  PI: ["piaui"],
  RJ: ["rio de janeiro"],
  RN: ["rio grande do norte"],
  RS: ["rio grande do sul"],
  RO: ["rondonia"],
  RR: ["roraima"],
  SC: ["santa catarina"],
  SP: ["sao paulo"],
  SE: ["sergipe"],
  TO: ["tocantins"],
};

const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "para",
  "com",
  "outras",
  "outros",
  "atividades",
  "atividade",
  "geral",
  "gerais",
  "nao",
  "especificadas",
  "especificados",
]);

function normalizar(valor: string | null | undefined) {
  return (valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t.toLowerCase()));
}

function calcularFitTerritorial(prospecto: ProspectoParaAvaliacao, sindicato: SindicatoCandidato): number {
  if (!prospecto.uf || !sindicato.baseTerritorial) return 0;
  const baseNorm = normalizar(sindicato.baseTerritorial);
  const ufUpper = prospecto.uf.toUpperCase();

  const nomesUf = UF_NOMES[ufUpper] ?? [];
  const ufComoNome = nomesUf.some((nome) => baseNorm.includes(normalizar(nome)));
  const ufComoSigla = new RegExp(`\\b${ufUpper}\\b`).test(normalizar(sindicato.baseTerritorial).toUpperCase());

  if (ufComoNome || ufComoSigla) return 1;

  if (prospecto.municipio) {
    const municipioNorm = normalizar(prospecto.municipio);
    if (municipioNorm.length >= 4 && baseNorm.includes(municipioNorm)) return 0.5;
  }

  return 0;
}

function calcularFitAtividade(prospecto: ProspectoParaAvaliacao, sindicato: SindicatoCandidato): number {
  if (!prospecto.cnaeDescricao || !sindicato.categoria) return 0;
  const tokensCnae = new Set(tokenizar(prospecto.cnaeDescricao));
  const tokensCategoria = new Set(tokenizar(sindicato.categoria));
  if (tokensCnae.size === 0 || tokensCategoria.size === 0) return 0;

  let intersecao = 0;
  for (const t of tokensCnae) {
    if (tokensCategoria.has(t)) intersecao++;
  }
  return Math.min(intersecao / Math.min(tokensCnae.size, tokensCategoria.size), 1);
}

/**
 * Fase 1: avalia o fit de cada sindicato candidato e escolhe o melhor —
 * nenhum acesso a banco aqui, só comparação de texto. A lista completa
 * (`candidatosAvaliados`) fica pra transparência: por que ESTE sindicato
 * foi escolhido sobre os demais.
 */
export function escolherCandidato(
  prospecto: ProspectoParaAvaliacao,
  sindicatos: SindicatoCandidato[],
): { candidatosAvaliados: CandidatoAvaliado[]; melhor: CandidatoAvaliado | null } {
  const candidatosAvaliados: CandidatoAvaliado[] = sindicatos
    .map((s) => {
      const fitTerritorial = calcularFitTerritorial(prospecto, s);
      const fitAtividade = calcularFitAtividade(prospecto, s);
      return {
        tenantId: s.tenantId,
        tenantNome: s.tenantNome,
        fitTerritorial,
        fitAtividade,
        combinado: fitTerritorial + fitAtividade,
      };
    })
    .sort((a, b) => b.combinado - a.combinado);

  const melhor = candidatosAvaliados.find((c) => c.combinado > 0) ?? null;

  return { candidatosAvaliados, melhor };
}

export interface InstrumentoPotencial {
  id: string;
  titulo: string;
  tipo: string;
  vigenciaFim: string | null;
}

export interface HistoricoObrigacoesCandidato {
  quantidade: number;
  media: number | null;
}

export interface ResultadoAvaliacaoOportunidade {
  tenantCandidatoId: string | null;
  tenantCandidatoNome: string | null;
  candidatosAvaliados: CandidatoAvaliado[];
  instrumentosPotenciais: InstrumentoPotencial[];
  estimativaValor: number | null;
  estimativaMetodologia: string;
  fatores: FatorScore[];
  score: number;
  prioridade: "alta" | "media" | "baixa";
  confianca: "alta" | "media" | "baixa";
}

function classificarFaixa(valor: number, max: number): "alta" | "media" | "baixa" {
  const pct = (valor / max) * 100;
  if (pct >= 70) return "alta";
  if (pct >= 40) return "media";
  return "baixa";
}

/**
 * Fase 2: com o candidato já escolhido (ou não) e os dados de
 * instrumentos/histórico já buscados pela Server Action, calcula o
 * score final — aditivo, capado, cada dimensão com sua explicação.
 */
export function calcularScoreOportunidade(params: {
  prospecto: ProspectoParaAvaliacao;
  candidatosAvaliados: CandidatoAvaliado[];
  melhor: CandidatoAvaliado | null;
  instrumentosPotenciais: InstrumentoPotencial[];
  historico: HistoricoObrigacoesCandidato | null;
}): ResultadoAvaliacaoOportunidade {
  const { prospecto, candidatosAvaliados, melhor, instrumentosPotenciais, historico } = params;
  const fatores: FatorScore[] = [];

  // --- fit territorial ---
  const pontosFitTerritorial = melhor ? Math.round(PESO_MAXIMO.fit_territorial * melhor.fitTerritorial) : 0;
  fatores.push({
    dimensao: "fit_territorial",
    pontos: pontosFitTerritorial,
    pesoMaximo: PESO_MAXIMO.fit_territorial,
    sourceType: "derived_inference",
    sourceFields: ["prospecto.uf", "prospecto.municipio", "sindicato.baseTerritorial"],
    evidenceSnapshot: {
      uf: prospecto.uf,
      municipio: prospecto.municipio,
      tenantCandidatoId: melhor?.tenantId ?? null,
      tenantCandidatoNome: melhor?.tenantNome ?? null,
      fitTerritorial: melhor?.fitTerritorial ?? 0,
    },
    explicacao: !prospecto.uf
      ? "Sem UF nos dados cadastrais do prospecto — fit territorial não pôde ser avaliado."
      : melhor && melhor.fitTerritorial === 1
        ? `UF/região do prospecto (${prospecto.uf}) encontrada na base territorial de "${melhor.tenantNome}".`
        : melhor && melhor.fitTerritorial === 0.5
          ? `Município do prospecto encontrado na base territorial de "${melhor.tenantNome}" (correspondência parcial, sem confirmação de UF).`
          : "Nenhuma correspondência territorial encontrada entre o prospecto e os sindicatos cadastrados — comparação por texto livre, aproximada (regra confirmada com o usuário).",
  });

  // --- fit atividade ---
  const pontosFitAtividade = melhor ? Math.round(PESO_MAXIMO.fit_atividade * melhor.fitAtividade) : 0;
  fatores.push({
    dimensao: "fit_atividade",
    pontos: pontosFitAtividade,
    pesoMaximo: PESO_MAXIMO.fit_atividade,
    sourceType: "derived_inference",
    sourceFields: ["prospecto.cnaeDescricao", "sindicato.categoria"],
    evidenceSnapshot: {
      cnaeDescricao: prospecto.cnaeDescricao,
      tenantCandidatoId: melhor?.tenantId ?? null,
      tenantCandidatoNome: melhor?.tenantNome ?? null,
      fitAtividade: melhor?.fitAtividade ?? 0,
    },
    explicacao: !prospecto.cnaeDescricao
      ? "Sem CNAE nos dados cadastrais do prospecto — fit de atividade não pôde ser avaliado."
      : melhor && melhor.fitAtividade > 0
        ? `Descrição do CNAE tem sobreposição de termos com a categoria de "${melhor.tenantNome}" (${Math.round(melhor.fitAtividade * 100)}% de correspondência aproximada).`
        : "Nenhuma sobreposição de termos encontrada entre o CNAE do prospecto e a categoria dos sindicatos cadastrados.",
  });

  // --- qualidade das evidências ---
  const pontosEvidencias =
    prospecto.quantidadeFontesDistintas >= 2 ? 10 : prospecto.quantidadeFontesDistintas === 1 ? 5 : 0;
  fatores.push({
    dimensao: "qualidade_evidencias",
    pontos: pontosEvidencias,
    pesoMaximo: PESO_MAXIMO.qualidade_evidencias,
    sourceType: "observed_data",
    sourceFields: ["dossie_evidencias.fonte"],
    evidenceSnapshot: { quantidadeFontesDistintas: prospecto.quantidadeFontesDistintas },
    explicacao:
      prospecto.quantidadeFontesDistintas === 0
        ? "Nenhuma evidência registrada ainda para este prospecto."
        : `${prospecto.quantidadeFontesDistintas} fonte(s) distinta(s) de evidência registrada(s).`,
  });

  // --- completude ---
  const checks: [boolean, string][] = [
    [prospecto.temRazaoSocial, "razão social"],
    [Boolean(prospecto.uf), "UF/endereço"],
    [Boolean(prospecto.cnaeDescricao), "CNAE"],
    [prospecto.temSituacaoCadastral, "situação cadastral"],
    [prospecto.temQsa, "quadro societário (QSA)"],
  ];
  const presentes = checks.filter(([ok]) => ok).map(([, nome]) => nome);
  const ausentes = checks.filter(([ok]) => !ok).map(([, nome]) => nome);
  const pontosCompletude = Math.round((presentes.length / checks.length) * PESO_MAXIMO.completude);
  fatores.push({
    dimensao: "completude",
    pontos: pontosCompletude,
    pesoMaximo: PESO_MAXIMO.completude,
    sourceType: "observed_data",
    sourceFields: [
      "dados_oficiais.razaoSocial",
      "dados_oficiais.uf",
      "dados_oficiais.cnaePrincipalDescricao",
      "dados_oficiais.situacaoCadastral",
      "dados_oficiais.qsa",
    ],
    evidenceSnapshot: { presentes, ausentes },
    explicacao: `Dados presentes: ${presentes.length > 0 ? presentes.join(", ") : "nenhum"}.${ausentes.length > 0 ? ` Faltando: ${ausentes.join(", ")}.` : ""}`,
  });

  // --- potencial econômico ---
  let pontosPotencialEconomico = 0;
  let estimativaValor: number | null = null;
  let estimativaMetodologia: string;
  if (!melhor) {
    estimativaMetodologia = "Não disponível: nenhum sindicato candidato identificado.";
  } else if (!historico || historico.quantidade === 0) {
    estimativaMetodologia = `Não disponível: sem histórico de obrigações registradas para "${melhor.tenantNome}".`;
  } else {
    estimativaValor = historico.media;
    pontosPotencialEconomico = historico.quantidade >= 2 ? 20 : 10;
    estimativaMetodologia = `Média de valor_referencia de ${historico.quantidade} obrigação(ões) já registrada(s) para "${melhor.tenantNome}".`;
  }
  fatores.push({
    dimensao: "potencial_economico",
    pontos: pontosPotencialEconomico,
    pesoMaximo: PESO_MAXIMO.potencial_economico,
    sourceType: "derived_inference",
    sourceFields: ["obrigacoes.valor_referencia", "oportunidades.tenant_candidato_id"],
    evidenceSnapshot: {
      tenantCandidatoId: melhor?.tenantId ?? null,
      tenantCandidatoNome: melhor?.tenantNome ?? null,
      historicoQuantidade: historico?.quantidade ?? 0,
      estimativaValor,
    },
    explicacao: estimativaMetodologia,
  });

  // --- recência ---
  let pontosRecencia = 0;
  let explicacaoRecencia: string;
  if (!prospecto.ultimaConsultaEm) {
    explicacaoRecencia = "Dados cadastrais nunca foram consultados oficialmente.";
  } else {
    const dias = (Date.now() - new Date(prospecto.ultimaConsultaEm).getTime()) / (1000 * 60 * 60 * 24);
    if (dias <= 30) pontosRecencia = 5;
    else if (dias <= 90) pontosRecencia = 3;
    else if (dias <= 180) pontosRecencia = 1;
    explicacaoRecencia = `Última consulta cadastral há ${Math.round(dias)} dia(s).`;
  }
  fatores.push({
    dimensao: "recencia",
    pontos: pontosRecencia,
    pesoMaximo: PESO_MAXIMO.recencia,
    sourceType: "observed_data",
    sourceFields: ["dossies_cadastrais.ultima_consulta_em"],
    evidenceSnapshot: { ultimaConsultaEm: prospecto.ultimaConsultaEm },
    explicacao: explicacaoRecencia,
  });

  // --- qualidade de contato ---
  const pontosContato = (prospecto.temEmail ? 5 : 0) + (prospecto.temTelefone ? 5 : 0);
  fatores.push({
    dimensao: "qualidade_contato",
    pontos: pontosContato,
    pesoMaximo: PESO_MAXIMO.qualidade_contato,
    sourceType: "observed_data",
    sourceFields: ["dados_oficiais.email", "dados_oficiais.telefone", "dossie_evidencias.email", "dossie_evidencias.telefone"],
    evidenceSnapshot: { temEmail: prospecto.temEmail, temTelefone: prospecto.temTelefone },
    explicacao:
      prospecto.temEmail && prospecto.temTelefone
        ? "E-mail e telefone de contato encontrados."
        : prospecto.temEmail
          ? "Apenas e-mail de contato encontrado — sem telefone."
          : prospecto.temTelefone
            ? "Apenas telefone de contato encontrado — sem e-mail."
            : "Nenhum contato (e-mail/telefone) encontrado ainda.",
  });

  const scoreTotal = Math.min(
    fatores.reduce((acc, f) => acc + f.pontos, 0),
    100,
  );

  const subScoreConfianca =
    pontosEvidencias + pontosCompletude + pontosRecencia + pontosContato;
  const maxConfianca =
    PESO_MAXIMO.qualidade_evidencias + PESO_MAXIMO.completude + PESO_MAXIMO.recencia + PESO_MAXIMO.qualidade_contato;

  return {
    tenantCandidatoId: melhor?.tenantId ?? null,
    tenantCandidatoNome: melhor?.tenantNome ?? null,
    candidatosAvaliados,
    instrumentosPotenciais,
    estimativaValor,
    estimativaMetodologia,
    fatores,
    score: scoreTotal,
    prioridade: classificarFaixa(scoreTotal, 100),
    confianca: classificarFaixa(subScoreConfianca, maxConfianca),
  };
}
