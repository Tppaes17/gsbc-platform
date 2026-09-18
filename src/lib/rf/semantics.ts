export type RfSearchStatus =
  | "FOUND"
  | "NOT_IN_CONTROLLED_DATASET"
  | "NOT_FOUND_IN_LOADED_RF_VERSION"
  | "INVALID_QUERY"
  | "DATASET_UNAVAILABLE";

export type RfFreshness = "CURRENT" | "STALE" | "UNKNOWN";

export interface RfDatasetSnapshot {
  id: string;
  dataset_version: string;
  competence_month: string;
  source: string;
  source_url: string | null;
  manifest_hash: string;
  published_at: string;
  metadata: Record<string, unknown>;
}

export interface RfEstablishmentSnapshot {
  id: string;
  cnpj_canonical: string;
  branch_type: string;
  trade_name: string | null;
  registration_status_code: string | null;
  registration_status_date: string | null;
  activity_start_date: string | null;
  main_cnae_code: string | null;
  state: string | null;
  municipality_code: string | null;
  source: string;
  imported_at: string;
}

export interface RfCompanySnapshot {
  id: string;
  cnpj_root: string;
  legal_name: string;
  legal_nature_code: string | null;
  share_capital: number | null;
  company_size_code: string | null;
}

export interface RfSimplesSnapshot {
  simples_option: boolean | null;
  simples_option_start_date: string | null;
  simples_option_end_date: string | null;
  mei_option: boolean | null;
  mei_option_start_date: string | null;
  mei_option_end_date: string | null;
}

export interface RfLookupPayload {
  dataset: RfDatasetSnapshot | null;
  establishment: RfEstablishmentSnapshot | null;
  company: RfCompanySnapshot | null;
  simples_mei: RfSimplesSnapshot | null;
}

function controlledSelectionContains(metadata: Record<string, unknown>, cnpj: string): boolean {
  const selection = metadata.controlled_selection;
  if (!selection || typeof selection !== "object") return false;

  const values = selection as { cnpjs?: unknown; cnpj_roots?: unknown };
  const cnpjs = Array.isArray(values.cnpjs) ? values.cnpjs.map(String) : [];
  const roots = Array.isArray(values.cnpj_roots) ? values.cnpj_roots.map(String) : [];
  return cnpjs.includes(cnpj) || roots.includes(cnpj.slice(0, 8));
}

export function classifyRfLookup(payload: RfLookupPayload, cnpj: string): RfSearchStatus {
  if (!payload.dataset) return "DATASET_UNAVAILABLE";
  if (payload.establishment) return "FOUND";
  return controlledSelectionContains(payload.dataset.metadata, cnpj)
    ? "NOT_FOUND_IN_LOADED_RF_VERSION"
    : "NOT_IN_CONTROLLED_DATASET";
}

export function assessRfFreshness(
  competenceMonth: string | null | undefined,
  now = new Date(),
): RfFreshness {
  if (!competenceMonth) return "UNKNOWN";
  const competence = new Date(`${competenceMonth.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(competence.getTime()) || competence > now) return "UNKNOWN";
  const ageDays = (now.getTime() - competence.getTime()) / 86_400_000;
  return ageDays <= 62 ? "CURRENT" : "STALE";
}

