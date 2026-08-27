import { z } from "zod";

export const iniciarEscalonamentoSchema = z.object({
  cobrancaId: z.string().guid(),
  motivo: z.string().trim().min(10, "Descreva o motivo do escalonamento (mínimo 10 caracteres)."),
});

export type IniciarEscalonamentoInput = z.infer<typeof iniciarEscalonamentoSchema>;

export const decidirAprovacaoSchema = z.object({
  escalonamentoId: z.string().guid(),
  aprovado: z.enum(["true", "false"]),
  motivo: z.string().trim().min(5, "Justifique a decisão."),
});

export type DecidirAprovacaoInput = z.infer<typeof decidirAprovacaoSchema>;

export const canalEnvioOptions = [
  { value: "correio_ar", label: "Correio com AR (Aviso de Recebimento)" },
  { value: "cartorio", label: "Cartório" },
  { value: "outro", label: "Outro" },
] as const;

const canalEnvioValues = canalEnvioOptions.map((o) => o.value) as [string, ...string[]];

export const deliveryStatusOptions = [
  { value: "desconhecido", label: "Aguardando confirmação" },
  { value: "entregue", label: "Entregue (confirmado)" },
  { value: "falha", label: "Falhou / devolvido" },
] as const;

const deliveryStatusValues = deliveryStatusOptions.map((o) => o.value) as [string, ...string[]];

export const registrarEnvioFisicoSchema = z.object({
  escalonamentoId: z.string().guid(),
  canal: z.enum(canalEnvioValues),
  destinatario: z.string().trim().min(3, "Descreva o destinatário/endereço do envio."),
  deliveryStatus: z.enum(deliveryStatusValues),
});

export type RegistrarEnvioFisicoInput = z.infer<typeof registrarEnvioFisicoSchema>;

export const registrarResultadoEscalonamentoSchema = z.object({
  escalonamentoId: z.string().guid(),
  descricao: z.string().trim().min(5, "Descreva o resultado."),
});

export type RegistrarResultadoEscalonamentoInput = z.infer<
  typeof registrarResultadoEscalonamentoSchema
>;
