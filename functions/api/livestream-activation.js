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
  if (!payload?.churchId || !payload?.livestreamUrl) {
    return json({ ok: false, error: "churchId and livestreamUrl are required" }, 400);
  }

  const activationId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into livestream_activations
        (id, church_id, livestream_url, status, payment_status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(
      activationId,
      payload.churchId,
      payload.livestreamUrl,
      "requested",
      "pending",
      createdAt
    ).run();
  }

  return json({
    ok: true,
    id: activationId,
    status: "requested",
    paymentStatus: "pending",
    createdAt
  }, 201);
}
