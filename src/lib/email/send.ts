import "server-only";
import nodemailer from "nodemailer";

/**
 * Em dev local, SMTP_HOST/SMTP_PORT apontam para o Inbucket do
 * `supabase start` — os e-mails ficam visíveis em http://127.0.0.1:54324
 * e nunca saem de verdade. Em produção, essas variáveis apontam para um
 * provedor SMTP real (configuração de ambiente, não hardcoded aqui).
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;

  if (!host || !port) {
    throw new Error("SMTP_HOST/SMTP_PORT não configurados.");
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: false,
  });
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "GSBC <notificacoes@gsbc.com.br>",
    to,
    subject,
    text,
    html,
  });
}
