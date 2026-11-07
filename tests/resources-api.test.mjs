import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handleResourceApi } from '../src/resources.js';

function setup() {
  const db = new DatabaseSync(':memory:'); db.exec('pragma foreign_keys=on');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  const prepare = sql => ({ bind(...args) { const statement = db.prepare(sql); const values = args.map(v => v ?? null); const execute = () => { const results = statement.columns().length ? statement.all(...values) : []; const meta = results.length ? {} : statement.columns().length ? {} : statement.run(...values); return { results, meta, success: true }; }; return { execute, async first() { return statement.get(...values) || null; }, async all() { return { results: statement.all(...values) }; }, async run() { return execute(); } }; } });
  const env = { DB: { prepare } };
  const now = new Date().toISOString();
  for (const id of ['member', 'buyer', 'pastor']) db.prepare('insert into users (id,email,name,password_hash,password_salt,is_creator,created_at,email_verified_at) values (?,?,?,?,?,?,?,?)').run(id, id + '@example.test', id, 'authentication-disabled', '', 1, now, now);
  db.prepare("insert into tenants values ('t1','pastor','River City',?)").run(now);
  db.prepare("insert into tenant_memberships values ('t1','pastor','owner')").run();
  const entity = (id, kind, data, state = 'published') => db.prepare('insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values (?,?,?,?,?,?,?,?)').run(id, kind, 't1', 'pastor', state, JSON.stringify(data), now, now);
  entity('church-1', 'churches', { name: 'River City Fellowship', city: 'Edmonton', country: 'CA' });
  entity('res-free', 'resources', { title: 'The Gospel: A Clear Foundation', type: 'Video', format: 'MP4', access: 'Free', price: 0, creator: 'River City', embedUrl: 'https://www.youtube.com/embed/abc', sourceUrl: 'http://insecure.example/file.mp4' });
  entity('res-paid', 'resources', { title: 'Paid Journal', type: 'Text', format: 'EPUB', access: 'Paid', price: 8, embedUrl: 'https://www.youtube.com/embed/secret', sourceUrl: 'https://www.youtube.com/embed/secret2' });
  entity('res-draft', 'resources', { title: 'Draft', access: 'Free' }, 'pending');
  let current = null;
  const ctx = { json: (body, status = 200) => new Response(JSON.stringify(body), { status }), getSessionUser: async () => (current ? db.prepare('select * from users where id=?').get(current) : null) };
  const call = async (path, method = 'GET', body) => handleResourceApi(new Request('https://example.test/api/resources/' + path, { method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), env, ctx);
  return { db, call, as: id => { current = id; } };
}

test('resource detail resolves by id or slug and never exposes drafts', async () => {
  const s = setup();
  const byId = await (await s.call('res-free')).json();
  assert.equal(byId.resource.slug, 'the-gospel-a-clear-foundation');
  assert.equal(byId.church.name, 'River City Fellowship');
  assert.equal(byId.locked, false);
  assert.equal((await (await s.call('the-gospel-a-clear-foundation')).json()).resource.id, 'res-free');
  await assert.rejects(s.call('res-draft'), { status: 404 });
  await assert.rejects(s.call('nope'), { status: 404 });
  await assert.rejects(s.call('res-free', 'POST', {}), { status: 405 });
  await assert.rejects(s.call('res-free/library', 'POST', { on: true }), { status: 401 });
});

test('free material only exposes trusted https hosts', async () => {
  const s = setup();
  const { material } = await (await s.call('res-free')).json();
  assert.equal(material.embedUrl, 'https://www.youtube.com/embed/abc');
  assert.equal(material.fileUrl, null);
});

test('paid resources stay locked until purchased or managed by the publisher', async () => {
  const s = setup();
  let body = await (await s.call('res-paid')).json();
  assert.equal(body.locked, true); assert.equal(body.material.embedUrl, null); assert.equal(body.material.fileUrl, null); assert.equal(body.viewer.entitled, false);
  s.as('member');
  body = await (await s.call('res-paid')).json();
  assert.equal(body.locked, true);
  await assert.rejects(s.call('res-paid/library', 'POST', { on: true }), { status: 403 });
  s.as('pastor');
  body = await (await s.call('res-paid')).json();
  assert.equal(body.locked, false); assert.equal(body.viewer.entitled, true);
});

test('library and bookmarks persist per member and are reflected in counts and viewer state', async () => {
  const s = setup();
  await assert.rejects(s.call('res-free/bookmark', 'POST', { on: true }), { status: 401 });
  s.as('member');
  assert.equal((await (await s.call('res-free/library', 'POST', { on: true })).json()).inLibrary, true);
  assert.equal((await (await s.call('res-free/bookmark', 'POST', { on: true })).json()).bookmarked, true);
  await s.call('res-free/bookmark', 'POST', { on: true });
  let body = await (await s.call('res-free')).json();
  assert.deepEqual(body.viewer, { signedIn: true, liked: false, inLibrary: true, bookmarked: true, entitled: true });
  assert.equal(body.counts.bookmarks, 1);
  s.as('buyer');
  assert.equal((await (await s.call('res-free')).json()).viewer.inLibrary, false);
  s.as('member');
  await s.call('res-free/bookmark', 'POST', { on: false });
  body = await (await s.call('res-free')).json();
  assert.equal(body.viewer.bookmarked, false); assert.equal(body.counts.bookmarks, 0);
  await assert.rejects(s.call('res-free/other', 'POST', {}), { status: 404 });
  await assert.rejects(s.call('res-free/library', 'GET'), { status: 405 });
});

test('likes and comments counts come from engagements and visible comments', async () => {
  const s = setup(); const now = new Date().toISOString();
  s.db.prepare("insert into content_engagements (content_type,content_id,user_id,reaction,created_at) values ('resource','res-free','member','love',?)").run(now);
  s.db.prepare("insert into resource_comments (id,resource_id,user_id,body,status,created_at) values ('c1','res-free','member','Great','visible',?),('c2','res-free','member','Hidden','hidden',?)").run(now, now);
  s.as('member');
  const body = await (await s.call('res-free')).json();
  assert.equal(body.counts.likes, 1); assert.equal(body.counts.comments, 1); assert.equal(body.viewer.liked, true);
});
