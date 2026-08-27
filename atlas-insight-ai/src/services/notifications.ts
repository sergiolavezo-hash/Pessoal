import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Transactional notifications for signup effectivation ("cadastro
 * efetivado"). Two channels, both optional and both fail-soft — a broken
 * email provider must never block a signup:
 *
 *  1. Welcome email to the new user — via Resend (RESEND_API_KEY).
 *  2. New-signup notification to the Atlas inbox — via the same
 *     FormSubmit endpoint the marketing site uses (SIGNUP_NOTIFY_ENDPOINT).
 */

export interface SignupInfo {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
}

async function sendWelcomeEmail(info: SignupInfo): Promise<boolean> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) return false;
  const from = env.EMAIL_FROM ?? "Atlas Insight AI <no-reply@atlas-partner.com>";
  const firstName = info.name.split(" ")[0] || "olá";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [info.email],
        subject: "Seu cadastro no Atlas Insight AI foi efetivado ✦",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#16161A">
            <p style="font-size:18px;font-weight:bold">ATLAS<span style="color:#00A78F">.</span> Insight AI</p>
            <h2 style="margin:16px 0 8px">Bem-vindo(a), ${escapeHtml(firstName)}!</h2>
            <p>Seu cadastro foi confirmado com sucesso. Sua conta já está ativa com o
            <strong>teste gratuito</strong>: 14 dias ou 1 execução de dashboard — o que
            acabar primeiro.</p>
            <p>Próximos passos dentro da plataforma:</p>
            <ol>
              <li>Conecte uma fonte de dados (BigQuery, PostgreSQL, SQL Server ou um arquivo CSV/XLSX);</li>
              <li>Deixe a IA entender seus dados (perfil, relacionamentos e modelo semântico);</li>
              <li>Descreva o painel que você quer — e receba seu dashboard pronto.</li>
            </ol>
            <p>Qualquer dúvida, basta responder este e-mail.</p>
            <p style="color:#888;font-size:12px;margin-top:24px">Atlas Tecnologia · atlas-partner.com</p>
          </div>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function notifyAtlasTeam(info: SignupInfo): Promise<boolean> {
  const env = serverEnv();
  if (!env.SIGNUP_NOTIFY_ENDPOINT) return false;
  try {
    const res = await fetch(env.SIGNUP_NOTIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "🎉 Novo cadastro efetivado — Atlas Insight AI",
        Produto: "Atlas Insight AI",
        Nome: info.name,
        Email: info.email,
        Telefone: info.phone ?? "—",
        Empresa: info.company ?? "—",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendSignupEffectiveNotifications(
  info: SignupInfo
): Promise<{ welcome: boolean; team: boolean }> {
  const [welcome, team] = await Promise.all([sendWelcomeEmail(info), notifyAtlasTeam(info)]);
  return { welcome, team };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
