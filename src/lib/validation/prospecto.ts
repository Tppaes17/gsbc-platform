import { z } from "zod";

/**
 * Template de upload de prospectos (Rodada 16) — colunas exatas
 * encontradas nas duas planilhas de referência do usuário ("6190601 -
 * Provedor.xlsx" e "6110803 - SCM.xlsx", aba "Leads_rel"), um formato de
 * exportação de provedor de dados B2B filtrado por CNAE. As 14 colunas
 * são idênticas nos dois arquivos.
 */
export const PROSPECTO_COLUNAS_ESPERADAS = [
  "CNPJ",
  "Razão Social",
  "Cnaes Descrição",
  "Cnaes Secundarios",
  "Capital Social",
  "Capital Social Convertido",
  "E-mail",
  "Logradouro",
  "Número",
  "Complemento",
  "Bairro",
  "Município",
  "UF",
  "CEP",
] as const;

export function normalizarCnpjPlanilha(valor: unknown): string | null {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  return digitos.length === 14 ? digitos : null;
}

function textoOuNulo(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

export interface ProspectoPlanilhaRow {
  cnpj: string;
  razaoSocial: string;
  cnaeDescricao: string | null;
  cnaeSecundarios: string | null;
  capitalSocial: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
}

export interface LinhaComErro {
  linha: number;
  erro: string;
}

/**
 * Valida e normaliza uma linha bruta da planilha (chaves = cabeçalhos
 * exatos de PROSPECTO_COLUNAS_ESPERADAS, valores = o que o SheetJS leu).
 * Retorna a linha normalizada ou uma mensagem de erro — nunca lança,
 * para permitir "importar o que der certo, listar o resto" (regra do
 * módulo: um CNPJ malformado numa linha não derruba o upload inteiro).
 */
export function validarLinhaProspecto(
  raw: Record<string, unknown>,
  numeroLinha: number,
): { ok: true; linha: ProspectoPlanilhaRow } | { ok: false; erro: LinhaComErro } {
  const cnpj = normalizarCnpjPlanilha(raw["CNPJ"]);
  if (!cnpj) {
    return {
      ok: false,
      erro: { linha: numeroLinha, erro: `CNPJ ausente ou inválido: "${raw["CNPJ"] ?? ""}"` },
    };
  }

  const razaoSocial = textoOuNulo(raw["Razão Social"]);
  if (!razaoSocial) {
    return {
      ok: false,
      erro: { linha: numeroLinha, erro: "Razão Social ausente." },
    };
  }

  return {
    ok: true,
    linha: {
      cnpj,
      razaoSocial,
      cnaeDescricao: textoOuNulo(raw["Cnaes Descrição"]),
      cnaeSecundarios: textoOuNulo(raw["Cnaes Secundarios"]),
      capitalSocial: textoOuNulo(raw["Capital Social Convertido"] ?? raw["Capital Social"]),
      email: textoOuNulo(raw["E-mail"]),
      logradouro: textoOuNulo(raw["Logradouro"]),
      numero: textoOuNulo(raw["Número"]),
      complemento: textoOuNulo(raw["Complemento"]),
      bairro: textoOuNulo(raw["Bairro"]),
      municipio: textoOuNulo(raw["Município"]),
      uf: textoOuNulo(raw["UF"]),
      cep: textoOuNulo(raw["CEP"]),
    },
  };
}

export const importacaoArquivoSchema = z.object({
  nomeArquivo: z.string().trim().min(1, "Nome do arquivo é obrigatório."),
});
