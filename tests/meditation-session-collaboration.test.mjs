import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleMeditationSession } from '../src/meditation-session.js';

// Brief 05.3: session-only chat, pause requests and bookmarked moments.
function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec("pragma foreign_keys=on; create table users(id text primary key, name text); insert into users values ('host','Host'),('guest','Guest'),('stranger','Stranger'); create table platform_entities(id text primary key,kind text,state text,data_json text,created_by text,tenant_id text); insert into platform_entities values ('room','meditation','published','{\"verses\":[{},{}]}','host','tenant');");
  db.exec(readFileSync(new URL('../migrations/0028_meditation_sessions.sql', import.meta.url), 'utf8'));
  db.exec("create table if not exists meditation_session_chat (id text primary key, room_id text not null, session_id text not null, user_id text not null references users(id), body text not null, created_at text not null);");
  db.exec(readFileSync(new URL('../migrations/0036_meditation_session_collaboration.sql', import.meta.url), 'utf8'));
  const env = { DB: { prepare(sql) { return { bind(...args) { return {
    async first() { return db.prepare(sql).get(...args) || null; },
    async run() { return db.prepare(sql).run(...args); },
    async all() { return { results: db.prepare(sql).all(...args) }; }
  }; } }; } } };
  async function request(user, method, path, body) {
    const req = new Request('https://example.test/api/meditation-session/' + path, { method, ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    return handleMeditationSession(req, env, { getSessionUser: async () => user ? { id: user, name: user[0].toUpperCase() + user.slice(1) } : null, json: body => body });
  }
  return { db, request };
}
const state = { playing: true, position: 12, verse: 1, audioType: 'bible' };

test('session chat is shared by the people holding the invitation and requires sign-in', async () => {
  const { db, request } = setup();
  const id = (await request('host', 'POST', 'room', state)).session.id;
  await request('guest', 'POST', `room/${id}/chat`, { body: 'Amen' });
  const seen = await request('host', 'GET', `room/${id}/chat`);
  assert.equal(seen.isHost, true);
  assert.deepEqual(seen.messages.map(m => [m.name, m.body, m.kind, m.own]), [['Guest', 'Amen', 'chat', false]]);
  await assert.rejects(request(null, 'GET', `room/${id}/chat`), { status: 401 });
  await assert.rejects(request('guest', 'GET', `room/${crypto.randomUUID()}/chat`), { status: 404 });
  await assert.rejects(request('guest', 'POST', `room/${id}/chat`, { body: '   ' }), { status: 400 });
  db.close();
});

test('a guest can ask the host to pause, once per 20 seconds; the host cannot request from themself', async () => {
  const { db, request } = setup();
  const id = (await request('host', 'POST', 'room', state)).session.id;
  const sent = await request('guest', 'POST', `room/${id}/chat`, { kind: 'pause-request', position: 42.3 });
  assert.equal(sent.message.kind, 'pause-request'); assert.equal(sent.message.position, 42.3);
  await assert.rejects(request('guest', 'POST', `room/${id}/chat`, { kind: 'pause-request', position: 43 }), { status: 429 });
  await assert.rejects(request('host', 'POST', `room/${id}/chat`, { kind: 'pause-request', position: 43 }), { status: 400 });
  const host = await request('host', 'GET', `room/${id}/chat`);
  assert.equal(host.messages[0].kind, 'pause-request'); assert.equal(host.messages[0].fromHost, false);
  db.close();
});

test('bookmarks are private to each participant and can be shared into the chat', async () => {
  const { db, request } = setup();
  const id = (await request('host', 'POST', 'room', state)).session.id;
  const mark = (await request('guest', 'POST', `room/${id}/bookmarks`, { position: 95.04, verse: 1, label: 'Perfect Peace' })).bookmark;
  assert.equal(mark.position, 95); assert.equal(mark.verse, 1);
  assert.equal((await request('guest', 'GET', `room/${id}/bookmarks`)).bookmarks.length, 1);
  assert.equal((await request('host', 'GET', `room/${id}/bookmarks`)).bookmarks.length, 0);
  await assert.rejects(request('host', 'DELETE', `room/${id}/bookmarks/${mark.id}`), { status: 404 });
  await request('guest', 'POST', `room/${id}/chat`, { kind: 'bookmark', position: mark.position, body: mark.label });
  assert.equal((await request('host', 'GET', `room/${id}/chat`)).messages[0].position, 95);
  await assert.rejects(request('guest', 'POST', `room/${id}/bookmarks`, { position: -1 }), { status: 400 });
  await request('guest', 'DELETE', `room/${id}/bookmarks/${mark.id}`);
  assert.equal((await request('guest', 'GET', `room/${id}/bookmarks`)).bookmarks.length, 0);
  db.close();
});

test('the room keeps notes beside the session and wires the session panel', () => {
  const page = readFileSync(new URL('../public/meditation.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../public/meditation.html', import.meta.url), 'utf8');
  assert.match(page, /modal\?\.classList\.add\("reflection-side-panel"\);\s*if \(modal && !modal\.open\) modal\.show\(\);/);
  assert.match(page, /MWEMeditationSessionPanel\?\.attach\(/);
  assert.match(page, /MWEMeditationSessionPanel\?\.detach\(\)/);
  assert.match(html, /meditation-session-panel\.js\?v=/);
  const panel = readFileSync(new URL('../public/meditation-session-panel.js', import.meta.url), 'utf8');
  assert.match(panel, /aria-pressed/, 'a toggle, so the app shell does not close it on outside clicks');
});
