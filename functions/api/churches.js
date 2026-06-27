const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  }
});

export function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return json({ ok: true, churches: [] });
  }

  const { results } = await env.DB.prepare(`
    select
      c.id, c.name, c.city, c.country, c.postal_code, c.denomination,
      c.language, c.website, c.phone, c.email, c.cover_image_url,
      c.livestream_enabled, c.livestream_paid, c.livestream_url,
      p.pastor_name, p.pastor_title, p.pastor_bio, p.about
    from churches c
    left join church_profiles p on p.church_id = c.id
    where c.is_verified = 1
    order by c.name
  `).all();

  return json({ ok: true, churches: results });
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  if (!payload?.name || !payload?.city || !payload?.pastor || !payload?.phone || !payload?.email) {
    return json({ ok: false, error: "name, city, pastor, phone, and email are required" }, 400);
  }

  const id = payload.id || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into churches
        (id, name, city, country, website, phone, email, cover_image_url, livestream_enabled, livestream_paid, livestream_url, is_verified, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.name,
      payload.city,
      payload.country || "",
      payload.website || "",
      payload.phone,
      payload.email,
      payload.coverImageUrl || "",
      Number(Boolean(payload.livestreamEnabled)),
      Number(Boolean(payload.livestreamPaid)),
      payload.livestreamUrl || "",
      0,
      createdAt
    ).run();

    await env.DB.prepare(`
      insert into church_profiles
        (church_id, about, pastor_name, pastor_title, pastor_bio)
      values (?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.about || "",
      payload.pastor,
      payload.pastorTitle || "Lead Pastor",
      payload.pastorBio || ""
    ).run();

    for (const ministry of payload.ministries || []) {
      await env.DB.prepare(`
        insert into ministries (id, church_id, name, description)
        values (?, ?, ?, ?)
      `).bind(crypto.randomUUID(), id, ministry, "").run();
    }
  }

  return json({ ok: true, id, status: "pending-verification", createdAt }, 201);
}
