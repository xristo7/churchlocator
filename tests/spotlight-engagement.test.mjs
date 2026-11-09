import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handleSpotlightApi } from '../src/spotlight.js';

const migrations = readdirSync(new URL('../migrations/', import.meta.url)).sort();
const sql = file => readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8');

function wrap(db) {
  const prepare = text => ({ bind(...args) { const statement = db.prepare(text); const values = args.map(v => v ?? null); const execute = () => { const results = statement.columns().length ? statement.all(...values) : []; const meta = results.length ? {} : statement.columns().length ? {} : statement.run(...values); return { results, meta, success: true }; }; return { execute, async first() { return statement.get(...values) || null; }, async all() { return { results: statement.all(...values) }; }, async run() { return execute(); } }; } });
  return { prepare, async batch(statements) { db.exec('begin'); try { const r = statements.map(s => s.execute()); db.exec('commit'); return r; } catch (e) { db.exec('rollback'); throw e; } } };
}

function seed(db) {
  const now = new Date().toISOString();
  for (const id of ['ann', 'ben', 'cy']) db.prepare('insert into users (id,email,name,password_hash,password_salt,is_creator,created_at,email_verified_at) values (?,?,?,?,?,?,?,?)').run(id, id + '@example.test', id, 'x', '', 1, now, now);
  db.prepare("insert into tenants values ('t1','ann','Grace',?)").run(now);
  db.prepare("insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values ('channel-1','channels','t1','ann','published','{\"name\":\"Grace\"}',?,?)").run(now, now);
  db.prepare("insert into spotlight_items (id,tenant_id,created_by,channel_entity_id,content_type,title,creator_name,poster_url,status,created_at,updated_at) values ('item-1','t1','ann','channel-1','short','Item','Ann','/assets/x.jpg','live',?,?)").run(now, now);
  return now;
}

function setup() {
  const db = new DatabaseSync(':memory:'); db.exec('pragma foreign_keys=on');
  for (const file of migrations) db.exec(sql(file));
  const now = seed(db); const env = { DB: wrap(db) };
  let current = null;
  const ctx = { json: (body, status = 200) => new Response(JSON.stringify(body), { status }), getSessionUser: async () => (current ? { ...db.prepare('select * from users where id=?').get(current), mfa_verified_at: now, session_created_at: now } : null) };
  const call = async (path, method = 'GET', body) => (await handleSpotlightApi(new Request('https://example.test/api/spotlight/' + path, { method, ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) }), env, ctx)).json();
  return { db, call, as: id => { current = id; } };
}

test('dislike is a private, per-member rating that needs sign-in', async () => {
  const s = setup();
  await assert.rejects(s.call('engagement/item-1', 'POST', { action: 'dislike', active: true }), { status: 401 });
  s.as('ben');
  const on = await s.call('engagement/item-1', 'POST', { action: 'dislike', active: true });
  assert.equal(on.active, true); assert.equal(on.item.disliked, true);
  assert.equal('dislikes' in on.item, false, 'no public dislike total');
  s.as('cy');
  assert.equal((await s.call('item/item-1')).item.disliked, false, 'another member does not see it');
  s.as('ben');
  const off = await s.call('engagement/item-1', 'POST', { action: 'dislike', active: false });
  assert.equal(off.item.disliked, false);
  const toggled = await s.call('engagement/item-1', 'POST', { action: 'dislike' });
  assert.equal(toggled.active, true);
});

test('like and dislike replace each other; save is independent', async () => {
  const s = setup(); s.as('ben');
  await s.call('engagement/item-1', 'POST', { action: 'like', active: true });
  let item = (await s.call('engagement/item-1', 'POST', { action: 'dislike', active: true })).item;
  assert.deepEqual([item.liked, item.disliked, item.likes], [false, true, 0]);
  item = (await s.call('engagement/item-1', 'POST', { action: 'like', active: true })).item;
  assert.deepEqual([item.liked, item.disliked, item.likes], [true, false, 1]);
  item = (await s.call('engagement/item-1', 'POST', { action: 'save', active: true })).item;
  assert.deepEqual([item.liked, item.saved, item.disliked], [true, true, false]);
  await assert.rejects(s.call('engagement/item-1', 'POST', { action: 'bogus' }), { status: 400 });
});

test('followers count the channel on the item and in the follow response, and stay null in the feed', async () => {
  const s = setup();
  assert.equal((await s.call('item/item-1')).item.followers, 0);
  assert.equal((await s.call('feed')).items[0].followers, null);
  s.as('ben');
  assert.equal((await s.call('channel-follow/channel-1', 'PUT', { active: true })).followers, 1);
  s.as('cy');
  assert.equal((await s.call('channel-follow/channel-1', 'PUT', { active: true })).followers, 2);
  assert.equal((await s.call('item/item-1')).item.followers, 2);
  assert.equal((await s.call('channel-follow/channel-1', 'PUT', { active: false })).followers, 1);
  s.as('ben');
  const item = (await s.call('item/item-1')).item;
  assert.deepEqual([item.followers, item.following], [1, true]);
});

test('migration 0032 keeps existing engagement rows and then accepts dislike', () => {
  const db = new DatabaseSync(':memory:'); db.exec('pragma foreign_keys=on');
  for (const file of migrations.filter(f => f < '0032')) db.exec(sql(file));
  const now = seed(db);
  for (const action of ['like', 'save', 'follow', 'report']) db.prepare('insert into spotlight_engagements values (?,?,?,?)').run('item-1', 'ben', action, now);
  assert.throws(() => db.prepare("insert into spotlight_engagements values ('item-1','cy','dislike',?)").run(now));
  db.exec(sql('0032_watch_dislike_engagements.sql'));
  assert.deepEqual(db.prepare('select action from spotlight_engagements where user_id=? order by action').all('ben').map(r => r.action), ['follow', 'like', 'report', 'save']);
  db.prepare("insert into spotlight_engagements values ('item-1','cy','dislike',?)").run(now);
  assert.equal(db.prepare("select count(*) n from sqlite_master where type='index' and name='spotlight_engagements_item'").get().n, 1);
});
