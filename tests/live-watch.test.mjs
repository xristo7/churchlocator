import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { handleLiveWatchApi } from '../src/live-watch.js';

function setup() {
  const db = new DatabaseSync(':memory:'); db.exec('pragma foreign_keys=on');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  const now = new Date().toISOString();
  for (const id of ['owner', 'ann', 'ben']) db.prepare('insert into users (id,email,name,password_hash,password_salt,is_creator,created_at,email_verified_at) values (?,?,?,?,?,?,?,?)').run(id, id + '@example.test', id, 'x', '', 1, now, now);
  db.prepare("insert into tenants values ('t1','owner','Grace',?)").run(now);
  db.prepare("insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values ('church-1','churches','t1','owner','published','{}',?,?),('draft-1','churches','t1','owner','draft','{}',?,?)").run(now, now, now, now);
  const prepare = sql => ({ bind(...args) { const st = db.prepare(sql); const values = args.map(v => v ?? null); const run = () => { const cols = st.columns().length; const results = cols ? st.all(...values) : []; return { results, meta: cols ? {} : st.run(...values), success: true }; }; return { run, execute: run, async first() { return st.get(...values) || null; }, async all() { return { results: st.all(...values) }; } }; } });
  const env = { DB: { prepare, async batch(list) { db.exec('begin'); try { const r = list.map(s => s.run()); db.exec('commit'); return r; } catch (e) { db.exec('rollback'); throw e; } } } };
  let current = null;
  const ctx = { json: (body, status = 200) => new Response(JSON.stringify(body), { status }), getSessionUser: async () => (current ? { id: current } : null) };
  const call = async (path, method = 'GET', body) => { const res = await handleLiveWatchApi(new Request('https://example.test/api/live-watch/' + path, { method, ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) }), env, ctx); return res.json(); };
  return { db, call, as: id => { current = id; } };
}

test('live broadcasts support like, private dislike, subscribe and report with sign-in', async () => {
  const s = setup();
  assert.deepEqual(await s.call('church/church-1'), { ok: true, likes: 0, followers: 0, liked: false, disliked: false, following: false, reported: false });
  await assert.rejects(s.call('church/church-1/rating', 'POST', { action: 'like', active: true }), { status: 401 });
  s.as('ann');
  assert.equal((await s.call('church/church-1/rating', 'POST', { action: 'like', active: true })).likes, 1);
  let state = await s.call('church/church-1/rating', 'POST', { action: 'dislike', active: true });
  assert.deepEqual([state.likes, state.liked, state.disliked], [0, false, true], 'dislike replaces like and is not counted publicly');
  assert.equal('dislikes' in state, false);
  s.as('ben');
  assert.equal((await s.call('church/church-1')).disliked, false, 'another member does not see it');
  assert.equal((await s.call('church/church-1/follow', 'PUT', { active: true })).followers, 1);
  s.as('ann');
  assert.equal((await s.call('church/church-1/follow', 'PUT', { active: true })).followers, 2);
  assert.equal((await s.call('church/church-1/follow', 'PUT', { active: false })).followers, 1);
  const first = await s.call('church/church-1/report', 'POST');
  assert.equal(first.reported, true);
  await s.call('church/church-1/report', 'POST');
  assert.equal(s.db.prepare('select count(*) n from live_reports').get().n, 1, 'a member can report once');
});

test('only published broadcasts of the matching kind are addressable', async () => {
  const s = setup();
  await assert.rejects(s.call('church/draft-1'), { status: 404 });
  await assert.rejects(s.call('store/church-1'), { status: 404 });
  await assert.rejects(s.call('nonsense/church-1'), { status: 404 });
});
