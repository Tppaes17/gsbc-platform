import "server-only";

/**
 * Fonte oficial nível 1 (Receita Federal, via BrasilAPI/Minha Receita) —
 * gratuita, pública, sem credencial. Ver docs/rodadas/rodada-14.md.
 */

export interface QsaMembro {
  nome: string;
  qualificacao: string | null;
  dataEntrada: string | null;
}

export interface CnpjOficial {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string;
  dataSituacaoCadastral: string | null;
  dataAbertura: string | null;
  naturezaJuridica: string | null;
  cnaePrincipalCodigo: string | null;
  cnaePrincipalDescricao: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  matrizOuFilial: string | null;
  qsa: QsaMembro[];
}

export type ConsultaCnpjResultado =
  | { status: "encontrado"; dados: CnpjOficial }
  | { status: "nao_encontrado" }
  | { status: "erro"; mensagem: string };

interface BrasilApiRawResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string | null;
  data_situacao_cadastral: string | null;
  data_inicio_atividade: string | null;
  natureza_juridica: string | null;
  cnae_fiscal: number | null;
  cnae_fiscal_descricao: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ddd_telefone_1: string | null;
  email: string | null;
  porte: string | null;
  descricao_identificador_matriz_filial: string | null;
  qsa: Array<{
    nome_socio: string;
    qualificacao_socio: string | null;
    data_entrada_sociedade: string | null;
  }> | null;
}

export async function consultarCnpjOficial(
  cnpjEntrada: string,
): Promise<ConsultaCnpjResultado> {
  const cnpj = cnpjEntrada.replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return { status: "erro", mensagem: "CNPJ inválido — precisa ter 14 dígitos." };
  }

  let response: Response;
  try {
    response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GSBC-Plataforma/1.0 (inteligencia-cadastral)",
      },
      cache: "no-store",
    });
  } catch {
    return { status: "erro", mensagem: "Não foi possível conectar à BrasilAPI." };
  }

  if (response.status === 404) {
    return { status: "nao_encontrado" };
  }

  if (response.status === 400) {
    return {
      status: "erro",
      mensagem: "CNPJ inválido — não passa na validação de dígito verificador.",
    };
  }

  if (!response.ok) {
    return {
      status: "erro",
      mensagem: `BrasilAPI retornou status ${response.status}.`,
    };
  }

  let raw: BrasilApiRawResponse;
  try {
    raw = await response.json();
  } catch {
    return { status: "erro", mensagem: "Resposta da BrasilAPI não é um JSON válido." };
  }

  return {
    status: "encontrado",
    dados: {
      cnpj: raw.cnpj,
      razaoSocial: raw.razao_social,
      nomeFantasia: raw.nome_fantasia ?? null,
      situacaoCadastral: raw.descricao_situacao_cadastral ?? "DESCONHECIDA",
      dataSituacaoCadastral: raw.data_situacao_cadastral ?? null,
      dataAbertura: raw.data_inicio_atividade ?? null,
      naturezaJuridica: raw.natureza_juridica ?? null,
      cnaePrincipalCodigo: raw.cnae_fiscal !== null ? String(raw.cnae_fiscal) : null,
      cnaePrincipalDescricao: raw.cnae_fiscal_descricao ?? null,
      logradouro: raw.logradouro ?? null,
      numero: raw.numero ?? null,
      bairro: raw.bairro ?? null,
      municipio: raw.municipio ?? null,
      uf: raw.uf ?? null,
      cep: raw.cep ?? null,
      telefone: raw.ddd_telefone_1 || null,
      email: raw.email ?? null,
      porte: raw.porte ?? null,
      matrizOuFilial: raw.descricao_identificador_matriz_filial ?? null,
      qsa: (raw.qsa ?? []).map((s) => ({
        nome: s.nome_socio,
        qualificacao: s.qualificacao_socio ?? null,
        dataEntrada: s.data_entrada_sociedade ?? null,
      })),
    },
  };
}
