export function formatCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(value: string | null) {
  if (!value) return "a definir";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}
