import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Supabase Auth local (supabase/config.toml) só permite redirect pra
  // 127.0.0.1:3000 além de localhost:3000 — necessário pro fluxo de
  // convite/magic link do Portal (STG-05) funcionar em dev acessando via
  // 127.0.0.1. Sem isso o Next.js bloqueia os assets do dev server nessa
  // origem (proteção contra DNS rebinding).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
