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
  ["/register-church", "church-portal.html"],
  ["/church-profile", "church-profile.html"],
  ["/church", "church-profile.html"],
  ["/livestream", "livestream.html"],
  ["/live", "livestream.html"],
  ["/events", "events.html"],
  ["/event-profile", "event-profile.html"],
  ["/churches", "churches.html"],
  ["/about", "index.html"],
  ["/donate", "index.html"],
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
  ".ico": "image/x-icon"
};

function fileForUrl(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const mapped = routeMap.get(pathname);
  const requestPath = mapped || (pathname === "/" ? "index.html" : pathname.slice(1));
  const filePath = resolve(join(root, requestPath));
  if (filePath !== root && !filePath.startsWith(root + sep)) return null;
  return filePath;
}

const server = createServer(async (request, response) => {
  const filePath = fileForUrl(request.url || "/");
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": body.length
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
});
