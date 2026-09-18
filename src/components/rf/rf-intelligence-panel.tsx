import { Database, Landmark, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RfIntelligenceResult, RfSearchStatus } from "@/lib/rf/intelligence";

const STATUS_PRESENTATION: Record<
  RfSearchStatus,
  { label: string; tone: "positive" | "warning" | "negative" | "neutral" }
> = {
  FOUND: { label: "Localizado", tone: "positive" },
  NOT_IN_CONTROLLED_DATASET: { label: "Fora do recorte", tone: "warning" },
  NOT_FOUND_IN_LOADED_RF_VERSION: { label: "Ausente na versão", tone: "negative" },
  INVALID_QUERY: { label: "Consulta inválida", tone: "negative" },
  DATASET_UNAVAILABLE: { label: "Dataset indisponível", tone: "neutral" },
};

function yesNoUnknown(value: boolean | null | undefined) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "Não informado";
}

export function RfIntelligencePanel({ result }: { result: RfIntelligenceResult }) {
  const presentation = STATUS_PRESENTATION[result.status];
  const competence = result.dataset?.competence_month
    ? new Date(`${result.dataset.competence_month}T00:00:00`).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle>RF Intelligence</CardTitle>
        </div>
        <CardDescription>
          Snapshot oficial do dataset controlado; não é consulta em tempo real.
        </CardDescription>
        <div className="col-start-2 row-span-2 row-start-1 flex flex-wrap justify-end gap-2">
          {result.freshness !== "UNKNOWN" ? (
            <StatusBadge
              label={result.freshness === "CURRENT" ? "Atual" : "Desatualizado"}
              tone={result.freshness === "CURRENT" ? "positive" : "warning"}
            />
          ) : null}
          <StatusBadge label={presentation.label} tone={presentation.tone} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{result.message}</p>

        {result.status === "FOUND" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Razão social</p>
              <p className="font-medium">{result.company?.legal_name ?? "Não informado"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nome fantasia</p>
              <p className="font-medium">{result.establishment?.trade_name ?? "Não informado"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estabelecimento</p>
              <p className="font-medium">{result.establishment?.branch_type ?? "Não informado"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Situação cadastral</p>
              <p className="font-medium">
                {result.establishment?.registration_status_code ?? "Não informado"}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Landmark className="size-3" aria-hidden="true" /> CNAE principal
              </p>
              <p className="font-medium">{result.establishment?.main_cnae_code ?? "Não informado"}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden="true" /> Localidade
              </p>
              <p className="font-medium">
                {[result.establishment?.municipality_code, result.establishment?.state]
                  .filter(Boolean)
                  .join(" / ") || "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Simples Nacional</p>
              <p className="font-medium">{yesNoUnknown(result.simplesMei?.simples_option)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MEI</p>
              <p className="font-medium">{yesNoUnknown(result.simplesMei?.mei_option)}</p>
            </div>
          </div>
        ) : null}

        {result.dataset ? (
          <div className="grid gap-3 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-3">
            <p>
              <span className="font-medium text-foreground">Fonte:</span> Receita Federal
            </p>
            <p>
              <span className="font-medium text-foreground">Versão:</span>{" "}
              {result.dataset.dataset_version}
            </p>
            <p>
              <span className="font-medium text-foreground">Referência:</span>{" "}
              {competence ?? "Não informada"}
            </p>
          </div>
        ) : null}

        <p className="border-t pt-3 text-xs text-muted-foreground">
          Estes dados cadastrais não determinam enquadramento sindical, obrigação, cobrança ou
          conclusão jurídica. Decisões operacionais exigem análise humana.
        </p>
      </CardContent>
    </Card>
  );
}
