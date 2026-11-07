import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handleSpotlightApi } from '../src/spotlight.js';

const MP4 = Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]);
const WEBM = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const key = 'k'.repeat(40);

function setup() {
  const db = new DatabaseSync(':memory:'); db.exec('pragma foreign_keys=on');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  const prepare = sql => ({ bind(...args) { const statement = db.prepare(sql); const values = args.map(v => v ?? null); const execute = () => { const results = statement.columns().length ? statement.all(...values) : []; const meta = results.length ? {} : statement.columns().length ? {} : statement.run(...values); return { results, meta, success: true }; }; return { execute, async first() { return statement.get(...values) || null; }, async all() { return { results: statement.all(...values) }; }, async run() { return execute(); } }; } });
  const stored = new Map();
  const env = { DB: { prepare, async batch(statements) { db.exec('begin'); try { const r = statements.map(s => s.execute()); db.exec('commit'); return r; } catch (e) { db.exec('rollback'); throw e; } } }, MEDIA: { async put(k, body, options) { stored.set(k, { body, options }); } } };
  const now = new Date().toISOString();
  db.prepare('insert into users (id,email,name,password_hash,password_salt,is_creator,created_at,email_verified_at) values (?,?,?,?,?,?,?,?)').run('creator', 'c@example.test', 'Creator', 'x', '', 1, now, now);
  db.prepare('insert into users (id,email,name,password_hash,password_salt,is_creator,created_at,email_verified_at) values (?,?,?,?,?,?,?,?)').run('plain', 'p@example.test', 'Plain', 'x', '', 0, now, now);
  db.prepare("insert into tenants values ('t1','creator','Grace',?)").run(now);
  db.prepare("insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values ('channel-1','channels','t1','creator','published','{\"name\":\"Grace\"}',?,?)").run(now, now);
  db.prepare("insert into spotlight_items (id,tenant_id,created_by,channel_entity_id,content_type,title,creator_name,poster_url,status,created_at,updated_at) values ('live-1','t1','creator','channel-1','short','Live item','Creator','/assets/x.jpg','live',?,?),('draft-1','t1','creator','channel-1','short','Draft item','Creator','/assets/x.jpg','draft',?,?)").run(now, now, now, now);
  let current = null;
  const ctx = { json: (body, status = 200) => new Response(JSON.stringify(body), { status }), getSessionUser: async () => (current ? { ...db.prepare('select * from users where id=?').get(current), mfa_verified_at: now, session_created_at: now } : null) };
  const call = (path, method = 'GET', body) => handleSpotlightApi(new Request('https://example.test/api/spotlight/' + path, { method, ...(body instanceof FormData ? { body } : body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) }), env, ctx);
  return { db, env, stored, call, as: id => { current = id; } };
}
const form = (video, poster) => { const f = new FormData(); if (video) f.append('video', new Blob([video]), 'v.bin'); if (poster) f.append('poster', new Blob([poster]), 'p.bin'); return f; };

test('upload requires a signed-in creator and stores MP4 or WebM with an optional poster', async () => {
  const s = setup();
  await assert.rejects(s.call('upload', 'POST', form(MP4)), { status: 401 });
  s.as('plain');
  await assert.rejects(s.call('upload', 'POST', form(MP4)), { status: 403 });
  s.as('creator');
  const mp4 = await (await s.call('upload', 'POST', form(MP4, JPEG))).json();
  assert.equal(mp4.ok, true); assert.match(mp4.videoUrl, /^\/media\/church-video\/[0-9a-f-]{36}\.mp4$/); assert.match(mp4.posterUrl, /^\/media\/creator-media\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(s.stored.get(mp4.videoUrl.slice(7)).options.httpMetadata.contentType, 'video/mp4');
  const webm = await (await s.call('upload', 'POST', form(WEBM))).json();
  assert.match(webm.videoUrl, /\.webm$/); assert.equal(webm.posterUrl, null);
});

test('upload rejects non-video files, bad posters and wrong methods', async () => {
  const s = setup(); s.as('creator');
  await assert.rejects(s.call('upload', 'POST', form(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]))), { status: 400 });
  await assert.rejects(s.call('upload', 'POST', form(MP4, Uint8Array.from([9, 9, 9, 9, 9, 9, 9, 9]))), { status: 400 });
  await assert.rejects(s.call('upload', 'POST', form(null)), { status: 400 });
  await assert.rejects(s.call('upload', 'GET'), { status: 405 });
});

test('playback counts one view per playback key and ignores unpublished items', async () => {
  const s = setup();
  const first = await (await s.call('playback/live-1', 'POST', { playbackKey: key })).json();
  assert.deepEqual([first.recorded, first.views], [true, 1]);
  const repeat = await (await s.call('playback/live-1', 'POST', { playbackKey: key })).json();
  assert.deepEqual([repeat.recorded, repeat.views], [false, 1]);
  const other = await (await s.call('playback/live-1', 'POST', { playbackKey: 'o'.repeat(40) })).json();
  assert.deepEqual([other.recorded, other.views], [true, 2]);
  await assert.rejects(s.call('playback/draft-1', 'POST', { playbackKey: key }), { status: 404 });
  await assert.rejects(s.call('playback/live-1', 'POST', { playbackKey: 'short' }), { status: 400 });
  await assert.rejects(s.call('playback/live-1', 'GET'), { status: 405 });
  assert.equal(s.db.prepare("select view_count from spotlight_items where id='live-1'").get().view_count, 2);
});

test('a creator can save and edit an uploaded video as its full content source', async () => {
  const s=setup();s.as('creator');
  s.db.exec("insert into tenant_memberships values ('t1','creator','owner')");
  const upload=await(await s.call('upload','POST',form(MP4,JPEG))).json();
  const body={channelEntityId:'channel-1',contentType:'long-preview',title:'Uploaded story',posterUrl:upload.posterUrl,mediaUrl:upload.videoUrl,fullContentUrl:upload.videoUrl,previewStartSeconds:1,previewEndSeconds:3,durationSeconds:8};
  const saved=await(await s.call('workspace','POST',body)).json();
  assert.equal(saved.item.fullContentUrl,upload.videoUrl);
  const edited=await(await s.call('workspace/'+saved.item.id,'PUT',{...body,title:'Edited story',revision:saved.item.revision})).json();
  assert.equal(edited.item.title,'Edited story');assert.equal(edited.item.fullContentUrl,upload.videoUrl);
  await assert.rejects(s.call('workspace','POST',{...body,fullContentUrl:'/assets/not-a-full-video.mp4'}),{status:400});
});
