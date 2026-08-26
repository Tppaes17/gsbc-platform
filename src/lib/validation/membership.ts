import { z } from "zod";

export const inviteMembershipSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  fullName: z.string().trim().min(2, "Informe o nome completo."),
  // .guid() (não .uuid()) — aceita qualquer id no formato 8-4-4-4-12 sem
  // exigir os bits de versão/variante do RFC 4122. Necessário porque os ids
  // de seed são sequenciais e legíveis (ex.: 00000000-...-0001), não UUIDs
  // v4 "de verdade"; dados reais (gen_random_uuid()) continuam válidos aqui.
  tenantId: z.string().guid("Selecione um tenant válido."),
  roleId: z.string().guid("Selecione um papel válido."),
});

export type InviteMembershipInput = z.infer<typeof inviteMembershipSchema>;
