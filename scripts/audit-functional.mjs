// Local audit only: no network, no production database, no application writes.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';
import { securityHeaders } from '../src/security.js';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.audit');
fs.mkdirSync(output, { recursive: true });
const evidence = { timestamp: new Date().toISOString(), runtime: process.version, inventory: [], syntax: [], inlineSyntax: [], missingReferences: [], externalScripts: [], probes: [] };
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'node_modules', '.wrangler', '.audit', '.private', 'artifacts', 'cloudflare-recovery'].includes(entry.name)) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const files = walk(root);
for (const file of files) {
  if (!/\.(js|mjs|html|css|sql|md|json|jsonc|ya?ml)$/.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll('\\', '/');
  evidence.inventory.push({ file: relative, lines: source.split('\n').length, sha256: crypto.createHash('sha256').update(source).digest('hex') });
  if (/^(src|public|migrations|functions|tests)\//.test(relative) || ['wrangler.jsonc', 'package.json', '.github/workflows/deploy.yml'].includes(relative)) {
    const snapshot = path.join(output, 'snapshot', relative);
    fs.mkdirSync(path.dirname(snapshot), { recursive: true }); fs.writeFileSync(snapshot, source);
  }
  if (/\.(js|mjs)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    evidence.syntax.push({ file: relative, ok: result.status === 0, error: result.stderr.trim() });
  }
  if (file.endsWith('.html')) {
    for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(match[1]) || /type\s*=\s*["'](?:application\/ld\+json|application\/json)/i.test(match[1])) continue;
      try { new vm.Script(match[2], { filename: relative }); evidence.inlineSyntax.push({ file: relative, ok: true }); }
      catch (error) { evidence.inlineSyntax.push({ file: relative, ok: false, error: error.message }); }
    }
    for (const match of source.matchAll(/\b(src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const value = match[2];
      if (/^(?:https?:)?\/\//.test(value) && match[1].toLowerCase() === 'src' && source.slice(Math.max(0, match.index - 50), match.index).match(/<script\b[^>]*$/i)) {
        evidence.externalScripts.push({ file: relative, url: value });
      }
      if (/^(?:[a-z]+:|\/\/|#|\{)/i.test(value)) continue;
      const pathname = value.split(/[?#]/)[0];
      if (!pathname || !/\.[a-z0-9]+$/i.test(pathname)) continue;
      const target = pathname.startsWith('/') ? path.join(root, 'public', pathname) : path.resolve(path.dirname(file), pathname);
      if (!fs.existsSync(target)) evidence.missingReferences.push({ file: relative, reference: value });
    }
  }
}

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec('pragma foreign_keys=on');
  for (const file of fs.readdirSync(path.join(root, 'migrations')).filter(x => x.endsWith('.sql')).sort()) db.exec(fs.readFileSync(path.join(root, 'migrations', file), 'utf8'));
  const statements = [];
  function prepare(sql) {
    function bind(...args) {
      return {
        async run() { statements.push(sql); const result = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
        async first() { statements.push(sql); return db.prepare(sql).get(...args) || null; },
        async all() { statements.push(sql); return { success: true, results: db.prepare(sql).all(...args) }; }
      };
    }
    return { bind, ...bind() };
  }
  return { db, statements, prepare, async batch(items) { db.exec('begin'); try { const results = []; for (const item of items) results.push(await item.run()); db.exec('commit'); return results; } catch (error) { db.exec('rollback'); throw error; } } };
}
const DB = database();
const limiter = { async limit() { return { success: true }; } };
const env = { DB, ENVIRONMENT: 'test', ADMIN_API_TOKEN: 'audit-only-not-a-real-secret', AUTH_RATE_LIMITER: limiter, WRITE_RATE_LIMITER: limiter, ASSETS: { async fetch(request) { return new Response('audit asset', { status: 200 }); } } };
async function request(pathname, body, extra = {}, method = body === undefined ? 'GET' : 'POST', bindings = env) {
  return worker.fetch(new Request('https://audit.invalid' + pathname, { method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), bindings);
}
async function probe(name, callback) {
  try { evidence.probes.push({ name, ...await callback() }); }
  catch (error) { evidence.probes.push({ name, error: error.message }); }
}
function seedEvent(id, price = 0, capacity = 2) { DB.db.prepare('insert into events(id,title,starts_at,ticket_price_cents,total_tickets) values(?,?,?,?,?)').run(id, id, '2020-01-01T00:00:00Z', price, capacity); }
await probe('real migration chain and foreign keys', async () => ({ ok: DB.db.prepare('pragma foreign_key_check').all().length === 0, tables: DB.db.prepare("select name from sqlite_master where type='table'").all().map(x => x.name) }));
let cookie;
await probe('v2 registration, hashed session, login, creator upgrade, logout', async () => {
  const response = await request('/api/auth/register', { name: 'Audit Member', email: 'audit@example.invalid', password: 'Audit-password-2026!' });
  cookie = response.headers.get('set-cookie')?.split(';')[0];
  const registered = await response.json();
  const session = await (await request('/api/auth/session', undefined, { cookie })).json();
  const token = DB.db.prepare('select token from sessions').get()?.token;
  const upgrade = await request('/api/creator/upgrade', {}, { cookie });
  const login = await request('/api/auth/login', { email: 'audit@example.invalid', password: 'Audit-password-2026!' });
  const logout = await request('/api/auth/logout', {}, { cookie });
  const after = await (await request('/api/auth/session', undefined, { cookie })).json();
  return { ok: response.status === 201 && session.user?.email === registered.user.email && token?.startsWith('v2:') && upgrade.status === 200 && login.status === 200 && logout.status === 200 && after.user === null, registrationStatus: response.status, upgradeStatus: upgrade.status, hashedSession: token?.startsWith('v2:'), cookieAttributes: response.headers.get('set-cookie').split(';').slice(1) };
});
await probe('anonymous protected asset delivery', async () => {
  const routes = ['/app', '/app.html', '/member', '/owner-dashboard', '/owner-dashboard.html', '/admin', '/admin.html', '/church-portal', '/creator-workspace.html', '/seller-dashboard.html', '/messages.html', '/resource-reader.html'];
  const results = []; for (const route of routes) results.push({ route, status: (await request(route)).status });
  return { protectedAtWorkerBoundary: results.every(x => [401,403,302,303].includes(x.status)), results, limitation: 'ASSETS stand-in; verifies Worker authorization branch, not external Cloudflare Access configuration' };
});
await probe('administrator session is not accepted by church save without bearer', async () => ({ status: (await request('/api/admin/churches', { name: 'Audit', city: 'Test', pastor: 'Test', phone: '123', email: 'audit@example.invalid' }, { cookie })).status }));
await probe('anonymous church accepts unverified payment claims', async () => {
  const response = await request('/api/churches', { id: 'audit-church', name: 'Audit Church', city: 'Audit', pastor: 'Audit Pastor', phone: '123', email: 'not-an-email', livestreamPaid: true });
  return { status: response.status, record: DB.db.prepare('select is_verified,livestream_paid,email from churches where id=?').get('audit-church') };
});
await probe('church creation partial persistence after profile failure', async () => {
  DB.db.exec("create trigger audit_profile_failure before insert on church_profiles when new.church_id='partial-church' begin select raise(abort,'audit injected failure'); end;");
  const response = await request('/api/churches', { id: 'partial-church', name: 'Partial', city: 'Audit', pastor: 'Audit', phone: '123', email: 'audit@example.invalid' });
  return { status: response.status, orphanExists: !!DB.db.prepare('select id from churches where id=?').get('partial-church'), profileExists: !!DB.db.prepare('select church_id from church_profiles where church_id=?').get('partial-church') };
});
await probe('admin church fields round-trip', async () => {
  const response = await request('/api/admin/churches', { id: 'audit-rich', name: 'Rich', city: 'Test', country: 'Test', pastor: 'Pastor', phone: '123', email: 'audit@example.invalid', photo: 'https://example.invalid/photo.jpg', postal: '12345', denomination: 'Audit', language: 'Audit', worship: 'Audit', livestream: { enabled: true, paid: true, url: 'https://example.invalid/live' } }, { authorization: `Bearer ${env.ADMIN_API_TOKEN}` });
  return { status: response.status, record: DB.db.prepare('select cover_image_url,postal_code,denomination,language,worship_style,livestream_enabled,livestream_paid,livestream_url,is_verified from churches where id=?').get('audit-rich') };
});
seedEvent('audit-free'); seedEvent('audit-paid', 500); seedEvent('audit-negative', -100);
await probe('free event capacity and paid rejection', async () => {
  const body = { eventId: 'audit-free', fullName: 'Audit', email: 'audit@example.invalid', ticketQuantity: 2 };
  const first = await request('/api/event-register', body); const second = await request('/api/event-register', body); const paid = await request('/api/event-register', { ...body, eventId: 'audit-paid' });
  return { ok: first.status === 201 && second.status === 409 && paid.status === 409, statuses: [first.status, second.status, paid.status], ticketsSold: DB.db.prepare('select tickets_sold from events where id=?').get('audit-free').tickets_sold };
});
await probe('duplicate event request consumes capacity again', async () => {
  seedEvent('audit-repeat', 0, 10); const body = { eventId: 'audit-repeat', fullName: 'Audit', email: 'audit@example.invalid', ticketQuantity: 1 };
  const first = await request('/api/event-register', body); const second = await request('/api/event-register', body);
  return { statuses: [first.status, second.status], ticketsSold: DB.db.prepare('select tickets_sold from events where id=?').get('audit-repeat').tickets_sold };
});
await probe('ordinary event save resets sold count and permits overselling', async () => {
  const response = await request('/api/events', { id: 'audit-free', title: 'Edited title', startsAt: '2030-01-01T00:00:00Z', totalTickets: 2 }, { authorization: `Bearer ${env.ADMIN_API_TOKEN}` });
  const reset = DB.db.prepare('select tickets_sold from events where id=?').get('audit-free').tickets_sold;
  const registration = await request('/api/event-register', { eventId: 'audit-free', fullName: 'Audit', email: 'audit@example.invalid', ticketQuantity: 2 });
  return { saveStatus: response.status, afterSave: reset, newRegistrationStatus: registration.status, actualTickets: DB.db.prepare('select sum(ticket_quantity) as n from event_registrations where event_id=?').get('audit-free').n, capacity: 2 };
});
await probe('registration updates and deletes desynchronize counter', async () => {
  const id = DB.db.prepare('select id from event_registrations where event_id=? limit 1').get('audit-repeat').id;
  DB.db.prepare('update event_registrations set ticket_quantity=100 where id=?').run(id);
  const afterUpdate = DB.db.prepare('select tickets_sold from events where id=?').get('audit-repeat').tickets_sold;
  const quantity = DB.db.prepare('select sum(ticket_quantity) as n from event_registrations where event_id=?').get('audit-repeat').n;
  DB.db.prepare('delete from event_registrations where event_id=?').run('audit-repeat');
  return { afterUpdate, actualQuantity: quantity, afterDelete: DB.db.prepare('select tickets_sold from events where id=?').get('audit-repeat').tickets_sold };
});
await probe('ended event registration accepted', async () => ({ status: (await request('/api/event-register', { eventId: 'audit-repeat', fullName: 'Audit', email: 'audit@example.invalid' })).status }));
await probe('event mutation accepts invalid dates and negative financial fields', async () => {
  const response = await request('/api/events', { id: 'audit-invalid-event', title: 'Audit', startsAt: 'not-a-date', endsAt: 'before-start', ticketPriceCents: -5.5, totalTickets: -1, ticketsSold: -20, currency: 'INVALID' }, { authorization: `Bearer ${env.ADMIN_API_TOKEN}` });
  return { status: response.status, record: DB.db.prepare('select starts_at,ticket_price_cents,total_tickets,tickets_sold,currency from events where id=?').get('audit-invalid-event') };
});
await probe('service booking for fictitious service and invalid date', async () => {
  const response = await request('/api/services/book', { serviceId: 'does-not-exist', serviceTitle: 'Fictitious', providerName: 'Impersonated', requestedDate: 'not-a-date', estimatedAmount: '-999999', customerName: 'Audit', customerEmail: 'audit@example.invalid' });
  return { status: response.status, stored: DB.db.prepare('select service_id,requested_date,estimated_amount,user_id from service_bookings').all() };
});
await probe('health with failed database', async () => ({ status: (await request('/api/status', undefined, {}, 'GET', { ...env, DB: { prepare() { throw new Error('database unavailable'); } } })).status }));
await probe('twelve-character single-factor password accepted', async () => ({ status: (await request('/api/auth/register', { name: 'Policy Audit', email: 'policy@example.invalid', password: 'abcdefghijkl' })).status }));
await probe('security rejection and failure handling', async () => ({ crossOrigin: (await request('/api/prayer', { request: 'Audit' }, { origin: 'https://other.invalid' })).status, rateLimited: (await request('/api/prayer', { request: 'Audit' }, {}, 'POST', { ...env, WRITE_RATE_LIMITER: { async limit() { return { success: false }; } } })).status, missingLimiter: (await request('/api/prayer', { request: 'Audit' }, {}, 'POST', { ...env, ENVIRONMENT: 'production', WRITE_RATE_LIMITER: undefined })).status, missingDB: (await request('/api/prayer', { request: 'Audit' }, {}, 'POST', { ...env, DB: undefined })).status }));

function browser(fetchImpl = async () => new Response('{}', { status: 503 })) {
  const storage = new Map(); const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
  const context = vm.createContext({ localStorage, fetch: fetchImpl, Response, Date, Math, Intl, URL, console, setTimeout, clearTimeout }); context.window = context;
  vm.runInContext(fs.readFileSync(path.join(root, 'public/platform-modules.js'), 'utf8'), context);
  return { context, localStorage, api: context.FaithLinkModules };
}
await probe('booking frontend reports success on backend rejection', async () => {
  const { api } = browser();
  try { const result = await api.bookService({ serviceId: 'audit', serviceTitle: 'Audit', customerEmail: 'audit@example.invalid' }); return { ok: false, reportedOk: result.ok, reportedStatus: result.status }; }
  catch (error) { return { ok: true, rejected: true, message: error.message }; }
});
await probe('deleted sample products reappear', async () => { const { api } = browser(); const id = api.getProducts()[0].id; api.removeProduct(id); return { deletedId: id, reappeared: api.getProducts().some(x => x.id === id) }; });
await probe('cart accepts fractional and excessive quantities', async () => { const { api } = browser(); const id = api.getProducts()[0].id; api.addToCart(id); api.setCartQuantity(id, 1.5); const fractional = api.getCart()[0].quantity; api.setCartQuantity(id, 1e9); return { fractional, excessive: api.getCart()[0].quantity }; });
await probe('messages remain visible after account switch and do not reach another browser', async () => { const first = browser(); first.localStorage.setItem('mwe.userEmail', 'one@example.invalid'); first.api.sendMessage({ body: 'Audit private message', threadId: 'audit' }); first.localStorage.setItem('mwe.userEmail', 'two@example.invalid'); return { visibleAfterSwitch: first.api.getMessages().some(x => x.body === 'Audit private message'), deliveredToOtherBrowser: browser().api.getMessages().some(x => x.body === 'Audit private message') }; });
await probe('browser collections have no cross-device source of truth', async () => { const first = browser(); const second = browser(); first.api.addChannel({ name: 'Audit Only Channel' }); return { savedLocally: first.api.getChannels().some(x => x.name === 'Audit Only Channel'), visibleInOtherBrowser: second.api.getChannels().some(x => x.name === 'Audit Only Channel') }; });
await probe('content policy blocks declared external scripts', async () => ({ scriptPolicy: securityHeaders['content-security-policy'].split(';').find(x => x.trim().startsWith('script-src')), externalScriptCount: evidence.externalScripts.length }));
DB.db.close();
fs.writeFileSync(path.join(output, 'functional-audit-evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ files: evidence.inventory.length, syntaxFailures: evidence.syntax.filter(x => !x.ok), inlineSyntaxFailures: evidence.inlineSyntax.filter(x => !x.ok), missingReferences: evidence.missingReferences, probes: evidence.probes }, null, 2));
