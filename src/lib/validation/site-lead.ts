import { z } from "zod";

export const siteLeadSchema = z.object({
  origem: z.enum(["diagnostico", "contato"]),
  nome: z.string().trim().min(2, "Informe o nome completo."),
  sindicatoNome: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z.string().trim().optional(),
  mensagem: z.string().trim().optional(),
});

export type SiteLeadInput = z.infer<typeof siteLeadSchema>;
