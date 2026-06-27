const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization"
  }
});

const unauthorized = () => json({ ok: false, error: "unauthorized" }, 401);

function isAuthorized(request, env) {
  if (!env.ADMIN_API_TOKEN) return true;
  return request.headers.get("authorization") === `Bearer ${env.ADMIN_API_TOKEN}`;
}

function slugify(text) {
  return String(text || "church")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();
  if (!env.DB) return json({ ok: true, churches: [] });

  const { results } = await env.DB.prepare(`
    select
      c.id, c.name, c.city, c.country, c.website, c.phone, c.email,
      c.cover_image_url, c.livestream_enabled, c.livestream_paid,
      c.livestream_url, c.description, c.is_verified, c.created_at,
      p.pastor_name, p.pastor_title, p.pastor_bio, p.about
    from churches c
    left join church_profiles p on p.church_id = c.id
    order by c.created_at desc
  `).all();

  return json({ ok: true, churches: results });
}

export async function onRequestPost(context) {
  return upsertChurch(context);
}

export async function onRequestPut(context) {
  return upsertChurch(context);
}

async function upsertChurch({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();

  const payload = await request.json().catch(() => null);
  if (!payload?.name || !payload?.city || !payload?.pastor || !payload?.phone || !payload?.email) {
    return json({ ok: false, error: "name, city, pastor, phone, and email are required" }, 400);
  }

  const id = payload.id || slugify(payload.name);
  const createdAt = payload.createdAt || new Date().toISOString();

  if (env.DB) {
    await env.DB.batch([
      env.DB.prepare(`
        insert into churches
          (id, name, city, country, website, phone, email, cover_image_url, livestream_enabled, livestream_paid, livestream_url, description, is_verified, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          city = excluded.city,
          country = excluded.country,
          website = excluded.website,
          phone = excluded.phone,
          email = excluded.email,
          cover_image_url = excluded.cover_image_url,
          livestream_enabled = excluded.livestream_enabled,
          livestream_paid = excluded.livestream_paid,
          livestream_url = excluded.livestream_url,
          description = excluded.description,
          is_verified = excluded.is_verified
      `).bind(
        id,
        payload.name,
        payload.city,
        payload.country || "",
        payload.website || "",
        payload.phone,
        payload.email,
        payload.image || payload.coverImageUrl || "",
        Number(Boolean(payload.streamEnabled || payload.livestreamEnabled)),
        Number(Boolean(payload.streamPaid || payload.livestreamPaid)),
        payload.streamUrl || payload.livestreamUrl || "",
        payload.about || "",
        payload.verified === false ? 0 : 1,
        createdAt
      ),
      env.DB.prepare(`
        insert into church_profiles
          (church_id, about, pastor_name, pastor_title, pastor_bio)
        values (?, ?, ?, ?, ?)
        on conflict(church_id) do update set
          about = excluded.about,
          pastor_name = excluded.pastor_name,
          pastor_title = excluded.pastor_title,
          pastor_bio = excluded.pastor_bio
      `).bind(
        id,
        payload.about || "",
        payload.pastor,
        payload.pastorTitle || "Lead Pastor",
        payload.pastorBio || ""
      )
    ]);

    await env.DB.prepare("delete from ministries where church_id = ?").bind(id).run();
    for (const ministry of payload.ministries || []) {
      await env.DB.prepare(`
        insert into ministries (id, church_id, name, description)
        values (?, ?, ?, ?)
      `).bind(crypto.randomUUID(), id, ministry, "").run();
    }
  }

  return json({ ok: true, id, status: "saved", createdAt });
}

export async function onRequestDelete({ request, env }) {
  if (!isAuthorized(request, env)) return unauthorized();

  const payload = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const id = payload.id || url.searchParams.get("id");
  if (!id) return json({ ok: false, error: "id is required" }, 400);

  if (env.DB) {
    await env.DB.batch([
      env.DB.prepare("delete from service_schedules where church_id = ?").bind(id),
      env.DB.prepare("delete from ministries where church_id = ?").bind(id),
      env.DB.prepare("delete from events where church_id = ?").bind(id),
      env.DB.prepare("delete from visitor_connections where church_id = ?").bind(id),
      env.DB.prepare("delete from prayer_requests where church_id = ?").bind(id),
      env.DB.prepare("delete from church_profiles where church_id = ?").bind(id),
      env.DB.prepare("delete from livestream_activations where church_id = ?").bind(id),
      env.DB.prepare("delete from churches where id = ?").bind(id)
    ]);
  }

  return json({ ok: true, id, status: "deleted" });
}
