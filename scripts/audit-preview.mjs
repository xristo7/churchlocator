// Read-only preview using the Worker's actual response headers and routes.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import worker from '../src/worker.js';
const root = path.resolve(import.meta.dirname, '../public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const env = { ENVIRONMENT: 'test', ASSETS: { async fetch(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const target = path.resolve(root, '.' + pathname);
  if (!target.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
  try { return new Response(await fs.readFile(target), { headers: { 'content-type': mime[path.extname(target)] || 'application/octet-stream' } }); }
  catch { return new Response('Not found', { status: 404 }); }
} } };
const server = http.createServer(async (req, res) => {
  try {
    const response = await worker.fetch(new Request('http://127.0.0.1:4189' + req.url, { method: req.method, headers: req.headers }), env);
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end('Audit preview error'); }
});
server.listen(4189, '127.0.0.1', () => console.log('Read-only Worker header preview: http://127.0.0.1:4189'));
