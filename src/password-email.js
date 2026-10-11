// Transactional email for My Way: branded templates + pluggable sender.
// Providers (first configured wins):
//   1. Cloudflare Email Service: `send_email` binding named EMAIL (env.EMAIL.send({...})).
//   2. Resend: secret RESEND_API_KEY.
// Both need EMAIL_FROM, e.g. "My Way <no-reply@yourdomain>" on a verified domain.
// With no provider, non-production environments log the message server-side for testing only.

const BLUE = "#2563eb";
const GOLD = "#e5a93c";
const INK = "#0f172a";
const MUTED = "#64748b";

export function emailProvider(env) {
  if (env.EMAIL && typeof env.EMAIL.send === "function" && env.EMAIL_FROM) return "cloudflare";
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return "resend";
  return "none";
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// Table-based, inline-CSS layout that renders in Gmail, Outlook and Apple Mail, with a dark-mode hint.
export function renderBrandedEmail({ origin = "", preheader = "", title, intro, code = "", ctaLabel = "", ctaUrl = "", note = "", appName = "My Way of Evangelism" }) {
  const logo = origin ? `${origin.replace(/\/+$/, "")}/assets/email-logo.png` : "";
  const codeBlock = code ? `
          <tr><td style="padding:8px 32px 8px 32px" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="mw-code" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px 28px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;line-height:40px;letter-spacing:10px;font-weight:700;color:${INK}">${esc(code)}</td></tr></table>
          </td></tr>` : "";
  const cta = ctaUrl ? `
          <tr><td style="padding:12px 32px 8px 32px" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${BLUE}" style="border-radius:12px;background:${BLUE}">
              <a href="${esc(ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${esc(ctaLabel)}</a>
            </td></tr></table>
          </td></tr>
          <tr><td style="padding:8px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:${MUTED};word-break:break-all" align="center">Or paste this link into your browser:<br><a href="${esc(ctaUrl)}" style="color:${BLUE}">${esc(ctaUrl)}</a></td></tr>` : "";
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .mw-bg { background:#020617 !important; } .mw-card { background:#0f172a !important; border-color:#1e293b !important; }
    .mw-ink { color:#f1f5f9 !important; } .mw-muted { color:#94a3b8 !important; }
    .mw-code { background:#172554 !important; border-color:#1e3a8a !important; color:#f1f5f9 !important; }
  }
  @media only screen and (max-width:520px) { .mw-pad { padding-left:20px !important; padding-right:20px !important; } }
</style></head>
<body style="margin:0;padding:0;background:#f1f5f9" class="mw-bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mw-bg" style="background:#f1f5f9">
  <tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
      <tr><td align="center" style="padding:0 0 20px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          ${logo ? `<td style="padding-right:10px"><img src="${esc(logo)}" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px"></td>` : ""}
          <td class="mw-ink" style="font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;color:${INK}">My Way</td>
        </tr></table>
      </td></tr>
      <tr><td class="mw-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="height:6px;line-height:6px;font-size:0;border-radius:20px 20px 0 0;background:${BLUE};background-image:linear-gradient(90deg,${BLUE},${GOLD})">&nbsp;</td></tr>
          <tr><td class="mw-pad mw-ink" style="padding:28px 32px 8px 32px;font-family:Helvetica,Arial,sans-serif;font-size:24px;line-height:30px;font-weight:800;color:${INK}">${esc(title)}</td></tr>
          <tr><td class="mw-pad mw-muted" style="padding:4px 32px 12px 32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#334155">${esc(intro)}</td></tr>
          ${codeBlock}${cta}
          <tr><td class="mw-pad mw-muted" style="padding:20px 32px 28px 32px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${MUTED}">${esc(note)}</td></tr>
        </table>
      </td></tr>
      <tr><td align="center" class="mw-muted" style="padding:20px 12px 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:${MUTED}">
        ${esc(appName)} &middot; Helping seekers find a church family.<br>You received this because of activity on your account. We'll never ask for your password by email.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
  return html;
}

export function resetEmailContent(link, appName = "My Way of Evangelism", origin = "") {
  const subject = `Reset your ${appName} password`;
  const text = `Reset your password\n\nSomeone asked to reset the password for your ${appName} account. This link expires in 45 minutes and can be used once:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password won't change.\n\n— ${appName}`;
  const html = renderBrandedEmail({ origin, appName, preheader: "Your password reset link (expires in 45 minutes)", title: "Reset your password",
    intro: `Someone asked to reset the password for your ${appName} account. Tap the button below to choose a new one. This link expires in 45 minutes and can be used once.`,
    ctaLabel: "Choose a new password", ctaUrl: link, note: "If you didn't ask for this, you can safely ignore this email. Your password won't change." });
  return { subject, text, html };
}

export function verificationEmailContent(code, appName = "My Way of Evangelism", origin = "", minutes = 15) {
  const subject = `${code} is your ${appName} verification code`;
  const text = `Verify your email\n\nWelcome to ${appName}! Enter this code to finish creating your account:\n\n${code}\n\nThe code expires in ${minutes} minutes. If you didn't sign up, ignore this email.\n\n— ${appName}`;
  const html = renderBrandedEmail({ origin, appName, preheader: `Your verification code is ${code}`, title: "Verify your email",
    intro: `Welcome to ${appName}! Enter this code in the app to finish creating your account.`, code,
    note: `The code expires in ${minutes} minutes. If you didn't create an account, you can ignore this email.` });
  return { subject, text, html };
}

async function deliver(env, to, { subject, text, html }, kind) {
  const provider = emailProvider(env);
  if (provider === "cloudflare") {
    await env.EMAIL.send({ to, from: env.EMAIL_FROM, subject, text, html });
    return { sent: true, provider };
  }
  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend responded ${res.status}: ${body?.message || "send failed"}`);
    console.log(`[${kind}] accepted by Resend id=${body?.id || "?"}`);
    return { sent: true, provider, id: body?.id };
  }
  if (env.ENVIRONMENT !== "production") {
    console.log(`[${kind}] No email provider configured. Message for ${to}: ${text}`);
    return { sent: false, provider, logged: true };
  }
  console.warn(`[${kind}] No email provider configured in production; email not sent.`);
  return { sent: false, provider };
}

const originOf = env => { try { return new URL(String(env.PUBLIC_ORIGIN || "")).origin; } catch { return ""; } };

export async function sendPasswordResetEmail(env, to, link) {
  return deliver(env, to, resetEmailContent(link, env.APP_NAME || undefined, originOf(env)), "password-reset");
}

export async function sendVerificationEmail(env, to, code, minutes) {
  return deliver(env, to, verificationEmailContent(code, env.APP_NAME || undefined, originOf(env), minutes), "email-verification");
}
