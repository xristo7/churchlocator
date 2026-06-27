const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, authorization"
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders
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

async function readJson(request) {
  return request.json().catch(() => null);
}

async function handleStatus(env) {
  return json({
    ok: true,
    app: "my-way-of-evangelism-api",
    role: "Shared synchronization API for public website, church portal, and owner dashboard",
    storage: {
      d1Bound: Boolean(env.DB),
      binding: "DB"
    },
    applications: [
      { name: "Public Website", route: "/", authentication: "none" },
      { name: "Church Portal", route: "/church-portal", authentication: "required" },
      { name: "Owner Dashboard", route: "/owner-dashboard", authentication: "required" },
      { name: "API Application", route: "/api/*", authentication: "token/session by endpoint" }
    ]
  });
}

async function handlePublicChurches(request, env) {
  if (request.method === "GET") {
    if (!env.DB) return json({ ok: true, churches: [] });

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

  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const payload = await readJson(request);
  if (!payload?.name || !payload?.city || !payload?.pastor || !payload?.phone || !payload?.email) {
    return json({ ok: false, error: "name, city, pastor, phone, and email are required" }, 400);
  }

  const id = payload.id || slugify(payload.name);
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
  }

  return json({ ok: true, id, status: "pending-verification", createdAt }, 201);
}

async function handleAdminChurches(request, env) {
  if (!isAuthorized(request, env)) return unauthorized();

  if (request.method === "GET") {
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

  if (request.method === "POST" || request.method === "PUT") {
    return upsertChurch(request, env);
  }

  if (request.method === "DELETE") {
    const payload = await readJson(request) || {};
    const id = payload.id || new URL(request.url).searchParams.get("id");
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

  return json({ ok: false, error: "method not allowed" }, 405);
}

async function upsertChurch(request, env) {
  const payload = await readJson(request);
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
  }

  return json({ ok: true, id, status: "saved", createdAt });
}

async function handleChurchApplication(request, env) {
  const payload = await readJson(request);
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

async function handleLivestreamActivation(request, env) {
  const payload = await readJson(request);
  if (!payload?.churchId || !payload?.livestreamUrl) {
    return json({ ok: false, error: "churchId and livestreamUrl are required" }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (env.DB) {
    await env.DB.prepare(`
      insert into livestream_activations
        (id, church_id, livestream_url, status, payment_status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(id, payload.churchId, payload.livestreamUrl, "requested", "pending", createdAt).run();
  }

  return json({ ok: true, id, status: "requested", paymentStatus: "pending", createdAt }, 201);
}

async function handleVisitor(request, env) {
  const payload = await readJson(request);
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

  return json({ ok: true, id, status: "received", message: "Visitor connection request received.", createdAt }, 201);
}

async function handlePrayer(request, env) {
  const payload = await readJson(request);
  if (!payload?.request) return json({ ok: false, error: "request is required" }, 400);

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

function assetRequest(request) {
  const url = new URL(request.url);
  const routes = new Map([
    ["/church-portal", "/church-portal.html"],
    ["/owner-dashboard", "/owner-dashboard.html"],
    ["/admin", "/owner-dashboard.html"],
    ["/livestream", "/livestream.html"],
    ["/church-profile", "/church-profile.html"]
  ]);

  if (routes.has(url.pathname)) {
    url.pathname = routes.get(url.pathname);
    return new Request(url.toString(), request);
  }

  return request;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");

  if (request.method === "OPTIONS") return json({ ok: true });
  if (path === "/api/status" && request.method === "GET") return handleStatus(env);
  if (path === "/api/churches") return handlePublicChurches(request, env);
  if (path === "/api/admin/churches") return handleAdminChurches(request, env);

  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (path === "/api/church-application") return handleChurchApplication(request, env);
  if (path === "/api/livestream-activation") return handleLivestreamActivation(request, env);
  if (path === "/api/visitor") return handleVisitor(request, env);
  if (path === "/api/prayer") return handlePrayer(request, env);

  return json({ ok: false, error: "not found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(assetRequest(request));
  }
};
