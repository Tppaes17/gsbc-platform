import { z } from "zod";

export const sendNotificacaoSchema = z.object({
  cobrancaId: z.string().guid(),
  mensagem: z.string().trim().optional().or(z.literal("")),
});

export type SendNotificacaoInput = z.infer<typeof sendNotificacaoSchema>;
