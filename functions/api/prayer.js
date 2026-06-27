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
  if (!payload?.request) {
    return json({ ok: false, error: "request is required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into prayer_requests (id, request_text, is_anonymous, status, created_at)
      values (?, ?, ?, ?, ?)
    `).bind(id, payload.request, Number(Boolean(payload.isAnonymous)), "new", createdAt).run();
  }

  return json({ ok: true, id, status: "received", createdAt }, 201);
}
