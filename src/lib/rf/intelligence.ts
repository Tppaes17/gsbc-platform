import { parseCnpj } from "@/lib/cnpj/cnpj";
import { createClient } from "@/lib/supabase/server";
import {
  assessRfFreshness,
  classifyRfLookup,
  type RfCompanySnapshot,
  type RfDatasetSnapshot,
  type RfEstablishmentSnapshot,
  type RfFreshness,
  type RfLookupPayload,
  type RfSearchStatus,
  type RfSimplesSnapshot,
} from "@/lib/rf/semantics";

export type { RfFreshness, RfSearchStatus } from "@/lib/rf/semantics";

export interface RfIntelligenceResult {
  status: RfSearchStatus;
  query: string;
  message: string;
  freshness: RfFreshness;
  dataset: RfDatasetSnapshot | null;
  establishment: RfEstablishmentSnapshot | null;
  company: RfCompanySnapshot | null;
  simplesMei: RfSimplesSnapshot | null;
}

const STATUS_MESSAGE: Record<RfSearchStatus, string> = {
  FOUND: "Registro localizado no dataset controlado da Receita Federal.",
  NOT_IN_CONTROLLED_DATASET:
    "Este CNPJ não faz parte do recorte controlado carregado. Isso não significa que seja inexistente na Receita Federal.",
  NOT_FOUND_IN_LOADED_RF_VERSION:
    "O CNPJ era esperado neste recorte, mas não foi localizado na versão RF carregada.",
  INVALID_QUERY: "O CNPJ informado é inválido.",
  DATASET_UNAVAILABLE: "Nenhuma versão controlada da Receita Federal está publicada para consulta.",
};

export async function lookupControlledRfCnpj(input: unknown): Promise<RfIntelligenceResult> {
  const parsed = parseCnpj(input);
  if (!parsed.ok) {
    return {
      status: "INVALID_QUERY",
      query: String(input ?? ""),
      message: `${STATUS_MESSAGE.INVALID_QUERY} ${parsed.message}`,
      freshness: "UNKNOWN",
      dataset: null,
      establishment: null,
      company: null,
      simplesMei: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rf_controlled_company_lookup", {
    p_cnpj: parsed.canonical,
  });

  if (error || !data || typeof data !== "object") {
    return {
      status: "DATASET_UNAVAILABLE",
      query: parsed.canonical,
      message: STATUS_MESSAGE.DATASET_UNAVAILABLE,
      freshness: "UNKNOWN",
      dataset: null,
      establishment: null,
      company: null,
      simplesMei: null,
    };
  }

  const payload = data as unknown as RfLookupPayload;
  const status = classifyRfLookup(payload, parsed.canonical);
  return {
    status,
    query: parsed.canonical,
    message: STATUS_MESSAGE[status],
    freshness: assessRfFreshness(payload.dataset?.competence_month),
    dataset: payload.dataset,
    establishment: payload.establishment,
    company: payload.company,
    simplesMei: payload.simples_mei,
  };
}
