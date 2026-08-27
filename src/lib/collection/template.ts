import "server-only";

export interface TemplateVariaveis {
  empresa: { razao_social: string };
  cobranca: { valor: string; vencimento: string };
  sindicato: { nome: string };
}

function ler(vars: TemplateVariaveis, caminho: string): string {
  let atual: unknown = vars;
  for (const parte of caminho.split(".")) {
    if (typeof atual !== "object" || atual === null) return "";
    atual = (atual as Record<string, unknown>)[parte];
  }
  return typeof atual === "string" ? atual : "";
}

/** Interpolação simples de `{{caminho.variavel}}` — sem lógica condicional, de propósito (regra STG-02: variáveis, não uma linguagem de template). */
export function renderizarTemplate(texto: string, vars: TemplateVariaveis): string {
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, caminho: string) => ler(vars, caminho));
}
