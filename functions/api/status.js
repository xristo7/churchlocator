const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type, authorization"
  }
});

export function onRequestOptions() {
  return json({ ok: true });
}

export function onRequestGet({ env }) {
  return json({
    ok: true,
    app: "my-way-of-evangelism-api",
    role: "Shared synchronization API for public website, church portal, and owner dashboard",
    storage: {
      d1Bound: Boolean(env.DB),
      binding: "DB"
    },
    applications: [
      {
        name: "Public Website",
        route: "/",
        authentication: "none",
        users: ["seekers", "visitors", "new believers"]
      },
      {
        name: "Church Portal",
        route: "/church-portal",
        authentication: "required",
        users: ["church owners", "pastors", "church staff"]
      },
      {
        name: "Owner Dashboard",
        route: "/owner-dashboard",
        authentication: "required",
        users: ["platform owners", "super admins"]
      },
      {
        name: "API Application",
        route: "/api/*",
        authentication: "token/session by endpoint",
        users: ["public website", "church portal", "owner dashboard"]
      }
    ],
    endpoints: [
      "GET /api/status",
      "GET /api/churches",
      "POST /api/churches",
      "GET /api/admin/churches",
      "POST /api/admin/churches",
      "PUT /api/admin/churches",
      "DELETE /api/admin/churches",
      "POST /api/church-application",
      "POST /api/livestream-activation",
      "POST /api/visitor",
      "POST /api/prayer"
    ]
  });
}
