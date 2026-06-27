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
  if (!payload?.fullName || !payload?.email || !payload?.churchId) {
    return json({ ok: false, error: "fullName, email, and churchId are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into visitor_connections
        (id, church_id, full_name, phone, email, city, message, needs, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.churchId,
      payload.fullName,
      payload.phone || "",
      payload.email,
      payload.city || "",
      payload.message || "",
      JSON.stringify(payload.needs || []),
      "new",
      createdAt
    ).run();
  }

  return json({
    ok: true,
    id,
    status: "received",
    message: "Visitor connection request received.",
    createdAt
  }, 201);
}
