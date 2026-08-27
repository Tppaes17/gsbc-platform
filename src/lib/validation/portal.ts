import { z } from "zod";

export const portalLoginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export type PortalLoginInput = z.infer<typeof portalLoginSchema>;
