import "server-only";

/**
 * Fonte de enriquecimento web (Fase 2 — Rodada 15): LeadCNPJ
 * (https://leadcnpj.com.br), fonte nível 2 da hierarquia do
 * prompt-mestre (não substitui a Receita Federal como identidade —
 * complementa com site/e-mails/telefone/decisores).
 *
 * IMPORTANTE: os nomes de campo abaixo (`enriquecimento.google.*`,
 * `enriquecimento.website.*`, `enriquecimento.decisores`) foram lidos da
 * documentação pública, não confirmados contra uma resposta real (a API
 * exige uma chave paga que ainda não temos configurada). Na primeira
 * consulta real, comparar a resposta bruta com o que está aqui e
 * corrigir os caminhos se divergirem — mesmo processo usado para
 * calibrar o cliente da BrasilAPI na Rodada 14.
 */

export interface LeadCnpjDecisor {
  nome: string;
  cargo: string | null;
}

export interface LeadCnpjEnriquecimento {
  siteOficial: string | null;
  emails: string[];
  telefone: string | null;
  redesSociais: string[];
  decisores: LeadCnpjDecisor[];
  scoreCompletude: number | null;
  raw: Record<string, unknown>;
}

export type ConsultaLeadCnpjResultado =
  | { status: "encontrado"; dados: LeadCnpjEnriquecimento }
  | { status: "nao_configurado" }
  | { status: "nao_encontrado" }
  | { status: "erro"; mensagem: string };

function primeiraString(...valores: unknown[]): string | null {
  for (const v of valores) {
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

function primeiraLista(...valores: unknown[]): unknown[] {
  for (const v of valores) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

export async function enriquecerCnpjLeadCnpj(
  cnpjEntrada: string,
): Promise<ConsultaLeadCnpjResultado> {
  const apiKey = process.env.LEADCNPJ_API_KEY;
  if (!apiKey) {
    return { status: "nao_configurado" };
  }

  const cnpj = cnpjEntrada.replace(/\D/g, "");
  if (cnpj.length !== 14) {
    return { status: "erro", mensagem: "CNPJ inválido — precisa ter 14 dígitos." };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://leadcnpj.com.br/api/v1/empresa/${cnpj}?enriquecer=true`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  } catch {
    return { status: "erro", mensagem: "Não foi possível conectar à LeadCNPJ." };
  }

  if (response.status === 404) {
    return { status: "nao_encontrado" };
  }

  if (!response.ok) {
    return {
      status: "erro",
      mensagem: `LeadCNPJ retornou status ${response.status}.`,
    };
  }

  let raw: Record<string, unknown>;
  try {
    raw = await response.json();
  } catch {
    return { status: "erro", mensagem: "Resposta da LeadCNPJ não é um JSON válido." };
  }

  const data = (raw.data ?? {}) as Record<string, unknown>;
  const contato = (data.contato ?? {}) as Record<string, unknown>;
  const enriquecimento = (data.enriquecimento ?? {}) as Record<string, unknown>;
  const google = (enriquecimento.google ?? {}) as Record<string, unknown>;
  const website = (enriquecimento.website ?? {}) as Record<string, unknown>;

  const emails = Array.from(
    new Set(
      [
        primeiraString(contato.email),
        ...primeiraLista(website.emails, enriquecimento.emails).filter(
          (v): v is string => typeof v === "string",
        ),
      ].filter((v): v is string => !!v),
    ),
  );

  const decisoresRaw = primeiraLista(enriquecimento.decisores, data.decisores);
  const decisores: LeadCnpjDecisor[] = decisoresRaw
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => ({
      nome: primeiraString(s.nome, s.nome_socio) ?? "—",
      cargo: primeiraString(s.cargo, s.qualificacao),
    }));

  const redesSociais = primeiraLista(
    enriquecimento.redes_sociais,
    website.redes_sociais,
    enriquecimento.social_media,
  ).filter((v): v is string => typeof v === "string");

  return {
    status: "encontrado",
    dados: {
      siteOficial: primeiraString(google.site_oficial, website.url, google.website),
      emails,
      telefone: primeiraString(contato.telefone, contato.whatsapp),
      redesSociais,
      decisores,
      scoreCompletude:
        typeof enriquecimento.score_completude === "number"
          ? enriquecimento.score_completude
          : null,
      raw,
    },
  };
}
