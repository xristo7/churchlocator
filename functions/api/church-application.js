const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  }
});

export function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  if (!payload?.churchName || !payload?.pastorName || !payload?.adminEmail) {
    return json({ ok: false, error: "churchName, pastorName, and adminEmail are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into church_applications
        (id, church_name, pastor_name, website, social, admin_email, statement_of_faith, phone, email, cover_image_url, livestream_url, livestream_paid, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.churchName,
      payload.pastorName,
      payload.website || "",
      payload.social || "",
      payload.adminEmail,
      payload.faith || "",
      payload.phone || "",
      payload.email || "",
      payload.coverImageUrl || "",
      payload.livestreamUrl || "",
      Number(Boolean(payload.livestreamPaid)),
      "pending",
      createdAt
    ).run();
  }

  return json({ ok: true, id, status: "pending-review", createdAt }, 201);
}
