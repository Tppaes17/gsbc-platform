export const ACAO_SUGERIDA_OPTIONS = [
  { value: "enviar_notificacao", label: "Enviar notificação" },
  { value: "iniciar_negociacao", label: "Iniciar negociação" },
  { value: "aguardar", label: "Aguardar" },
  { value: "escalar", label: "Escalar (jurídico/notificação extrajudicial)" },
  { value: "nenhuma_acao_necessaria", label: "Nenhuma ação necessária" },
] as const;

export const ACAO_VALUES = ACAO_SUGERIDA_OPTIONS.map((o) => o.value);
