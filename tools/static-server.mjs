import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const root = resolve(getArg("--root", "public"));
const port = Number(getArg("--port", "4173"));
const host = getArg("--host", "127.0.0.1");

const routeMap = new Map([
  ["/owner-dashboard", "owner-dashboard.html"],
  ["/admin", "owner-dashboard.html"],
  ["/church-portal", "church-portal.html"],
  ["/portal", "church-portal.html"],
  ["/creator-hub", "church-portal.html"],
  ["/register-church", "church-portal.html"],
  ["/app", "app.html"],
  ["/member", "app.html"],
  ["/church-profile", "church-profile.html"],
  ["/church", "church-profile.html"],
  ["/livestream", "livestream.html"],
  ["/live", "livestream.html"],
  ["/churches", "churches.html"],
  ["/channels", "channels.html"],
  ["/channel", "channel-detail.html"],
  ["/channel-content", "channel-content.html"],
  ["/messages", "messages.html"],
  ["/events", "events.html"],
  ["/event-profile", "event-profile.html"],
  ["/event", "event-profile.html"],
  ["/foundation", "foundation.html"],
  ["/store", "store.html"],
  ["/product", "product-detail.html"],
  ["/cart", "cart.html"],
  ["/checkout", "checkout.html"],
  ["/store-manager", "seller-dashboard.html"],
  ["/resources", "resources.html"],
  ["/resource", "resource-detail.html"],
  ["/resource-reader", "resource-reader.html"],
  ["/donate", "donate.html"],
  ["/privacy", "privacy.html"],
  ["/terms", "privacy.html"],
  ["/safeguarding", "privacy.html"],
  ["/meditation", "meditation.html"],
  ["/sanctuary", "meditation.html"],
  ["/about", "index.html"],
  ["/volunteer", "index.html"],
  ["/prayer", "index.html"]
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".webm": "video/webm"
};

function fileForUrl(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const mapped = routeMap.get(pathname);
  const requestPath = mapped || (pathname === "/" ? "index.html" : pathname.slice(1));
  const filePath = resolve(join(root, requestPath));
  if (filePath !== root && !filePath.startsWith(root + sep)) return null;
  return filePath;
}

let currentPort = port;

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${host}:${currentPort}`);
  if (requestUrl.pathname.startsWith("/api/")) {
    try {
      const targetBase = getArg("--api", "https://my-way-of-evangelism.doxalight-inc.workers.dev");
      const targetUrl = new URL(requestUrl.pathname + requestUrl.search, targetBase);
      const headers = new Headers();
      for (const [k, v] of Object.entries(request.headers)) {
        if (k.toLowerCase() === "host") continue;
        headers.set(k, v);
      }
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(chunk);
      }
      const body = ["GET", "HEAD"].includes(request.method) ? undefined : Buffer.concat(chunks);
      const apiRes = await fetch(targetUrl, {
        method: request.method,
        headers,
        body,
        redirect: "manual"
      });
      const resHeaders = {};
      for (const [k, v] of apiRes.headers.entries()) {
        resHeaders[k] = v;
      }
      response.writeHead(apiRes.status, resHeaders);
      const resBuffer = Buffer.from(await apiRes.arrayBuffer());
      response.end(resBuffer);
      return;
    } catch (err) {
      response.writeHead(502, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: "API proxy error" }));
      return;
    }
  }

  const filePath = fileForUrl(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let resolvedPath = filePath;
  let body;
  try {
    body = await readFile(resolvedPath);
  } catch (err) {
    if (!extname(resolvedPath)) {
      try {
        resolvedPath = filePath + ".html";
        body = await readFile(resolvedPath);
      } catch {
        // Fall through to 404
      }
    }
  }

  if (body) {
    response.writeHead(200, {
      "content-type": contentTypes[extname(resolvedPath).toLowerCase()] || "application/octet-stream",
      "content-length": body.length
    });
    response.end(body);
  } else {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

function listenOnPort(p) {
  currentPort = p;
  server.listen(p, host, () => {
    console.log(`Serving ${root} at http://${host}:${p}/`);
  });
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && currentPort < port + 10) {
    console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
    listenOnPort(currentPort + 1);
  } else {
    console.error(err);
    process.exit(1);
  }
});

listenOnPort(port);
