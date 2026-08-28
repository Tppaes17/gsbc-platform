import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // O Supabase Auth local (supabase/config.toml) só permite redirect pra
  // 127.0.0.1:3000 além de localhost:3000 — necessário pro fluxo de
  // convite/magic link do Portal (STG-05) funcionar em dev acessando via
  // 127.0.0.1. Sem isso o Next.js bloqueia os assets do dev server nessa
  // origem (proteção contra DNS rebinding).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
