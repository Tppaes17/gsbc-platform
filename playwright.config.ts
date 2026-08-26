import { defineConfig, devices } from "@playwright/test";

/**
 * Regras do jogo (ver e2e/README.md):
 * - Supabase local precisa estar rodando (`supabase start`).
 * - Specs de fluxo mutável (ex.: financeiro-e-notificacoes) exigem dados
 *   recém-semeados — rode `supabase db reset` antes.
 * - `npm run dev` deve estar de pé em http://localhost:3000, ou ajuste
 *   BASE_URL.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
