import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

interface EntendaCobrancaData {
  origem: string;
  instrumento: string | null;
  clausula: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  base: string | null;
  valorPrincipal: number;
  valorAtualizacao: number;
  valorTotal: number;
}

/**
 * Componente "Entenda esta cobrança" — literal do roadmap do STG-05
 * (Origem, Instrumento, Cláusula, Período, Base, Principal, Atualização,
 * Total). Nunca inventa um campo vazio como "—" com aparência de dado
 * real quando a informação não existe (regra 5 do AGENTS.md).
 */
export function EntendaCobrancaSection({ dados }: { dados: EntendaCobrancaData }) {
  const linhas: { label: string; value: string }[] = [
    { label: "Origem", value: dados.origem },
    { label: "Instrumento", value: dados.instrumento ?? "—" },
    { label: "Cláusula", value: dados.clausula ?? "—" },
    {
      label: "Período",
      value:
        dados.periodoInicio || dados.periodoFim
          ? `${formatDate(dados.periodoInicio)} a ${formatDate(dados.periodoFim)}`
          : "—",
    },
    { label: "Base de cálculo", value: dados.base ?? "—" },
    { label: "Principal", value: formatCurrency(dados.valorPrincipal) },
    { label: "Atualização (juros/multa)", value: formatCurrency(dados.valorAtualizacao) },
    { label: "Total", value: formatCurrency(dados.valorTotal) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Entenda esta cobrança</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {linhas.map((linha) => (
            <div key={linha.label} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{linha.label}</dt>
              <dd className="text-sm font-medium">{linha.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
