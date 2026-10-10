// Pluggable transactional email sender for password resets.
// Supported providers (first configured wins):
//   1. Cloudflare Email Service: a `send_email` binding named EMAIL (env.EMAIL.send({...})).
//   2. Resend: secret RESEND_API_KEY.
// Both need EMAIL_FROM (e.g. "My Way <no-reply@yourdomain>") on a verified sending domain.
// With no provider, non-production environments log the link server-side for testing only.

export function emailProvider(env) {
  if (env.EMAIL && typeof env.EMAIL.send === "function" && env.EMAIL_FROM) return "cloudflare";
  if (env.RESEND_API_KEY && env.EMAIL_FROM) return "resend";
  return "none";
}

export function resetEmailContent(link, appName = "My Way of Evangelism") {
  const subject = `Reset your ${appName} password`;
  const text = `Someone asked to reset the password for your ${appName} account.\n\nReset it here (link expires in 45 minutes, single use):\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password won't change.`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a">
<h2 style="margin:0 0 12px">Reset your password</h2>
<p style="color:#334155;line-height:1.55">Someone asked to reset the password for your ${appName} account. This link expires in 45 minutes and can be used once.</p>
<p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block">Choose a new password</a></p>
<p style="color:#64748b;font-size:13px;line-height:1.5">If you didn't ask for this, ignore this email; your password won't change.</p></div>`;
  return { subject, text, html };
}

export async function sendPasswordResetEmail(env, to, link) {
  const provider = emailProvider(env);
  const { subject, text, html } = resetEmailContent(link, env.APP_NAME || undefined);
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
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return { sent: true, provider };
  }
  if (env.ENVIRONMENT !== "production") {
    console.log(`[password-reset] No email provider configured. Reset link for ${to}: ${link}`);
    return { sent: false, provider, logged: true };
  }
  console.warn("[password-reset] No email provider configured in production; reset email not sent.");
  return { sent: false, provider };
}
