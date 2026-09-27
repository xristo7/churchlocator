import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { ApiError } from '../src/security.js';
import {
  handleSimulatedLiveApi, zonedTimeToUtc, isValidTimezone, expandSlot, streamPlays, findConflicts, computeNowPlaying
} from '../src/simulated-live.js';
import { handleMediaRequest, parseByteRange } from '../src/worker.js';

const T = iso => Date.parse(iso);
const START = T('2026-10-01T09:00:00Z'); // Thursday

class FakeR2 {
  constructor() { this.objects = new Map(); this.uploads = new Map(); this.counter = 0; }
  async put(key, value, opts = {}) {
    const bytes = value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : new Uint8Array(value);
    this.objects.set(key, { bytes, opts });
  }
  async head(key) { const o = this.objects.get(key); return o ? { size: o.bytes.length, httpMetadata: o.opts.httpMetadata, httpEtag: '"etag"' } : null; }
  async get(key, options = {}) {
    const o = this.objects.get(key); if (!o) return null;
    const bytes = options.range ? o.bytes.slice(options.range.offset, options.range.offset + options.range.length) : o.bytes;
    return { body: bytes, size: bytes.length, httpMetadata: o.opts.httpMetadata, httpEtag: '"etag"' };
  }
  async delete(key) { this.objects.delete(key); }
  async createMultipartUpload(key, opts) { const uploadId = 'upload-' + (++this.counter); this.uploads.set(uploadId, { key, opts, parts: new Map(), aborted: false }); return { uploadId, key }; }
  resumeMultipartUpload(key, uploadId) {
    const upload = this.uploads.get(uploadId);
    return {
      uploadPart: async (partNumber, body) => {
        const bytes = body instanceof Uint8Array ? body : new Uint8Array(await new Response(body).arrayBuffer());
        upload.parts.set(partNumber, bytes); return { partNumber, etag: 'etag-' + partNumber };
      },
      complete: async parts => {
        const chunks = parts.map(p => upload.parts.get(p.partNumber)), size = chunks.reduce((n, c) => n + c.length, 0);
        const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
        this.objects.set(key, { bytes, opts: upload.opts }); return { size };
      },
      abort: async () => { upload.aborted = true; }
    };
  }
}

function setup() {
  const db = new DatabaseSync(':memory:'); db.exec('pragma foreign_keys=on');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  const prepare = sql => ({ bind(...args) { const statement = db.prepare(sql); const values = args.map(v => v ?? null); const execute = () => { const results = statement.columns().length ? statement.all(...values) : []; const meta = statement.columns().length ? {} : statement.run(...values); return { results, meta, success: true }; }; return { execute, async first() { return statement.get(...values) || null; }, async all() { return { results: statement.all(...values) }; }, async run() { return execute(); } }; } });
  const media = new FakeR2();
  const env = { DB: { prepare, async batch(statements) { db.exec('begin'); try { const result = statements.map(s => s.execute()); db.exec('commit'); return result; } catch (e) { db.exec('rollback'); throw e; } } }, MEDIA: media, SIMULATED_LIVE_PART_BYTES: '16' };
  const now = new Date().toISOString();
  for (const id of ['alice', 'bob', 'editor', 'viewer', 'owner']) db.prepare('insert into users (id,email,name,password_hash,password_salt,is_creator,created_at,email_verified_at,totp_secret_encrypted) values (?,?,?,?,?,?,?,?,?)').run(id, id + '@example.test', id, 'authentication-disabled', '', 1, now, now, id === 'owner' ? 'encrypted-mfa' : null);
  db.prepare("insert into platform_roles values ('owner','owner')").run();
  db.prepare("insert into tenants values ('t-alice','alice','Alice',?)").run(now);
  db.prepare("insert into tenants values ('t-bob','bob','Bob',?)").run(now);
  db.prepare("insert into tenant_memberships values ('t-alice','alice','owner'),('t-alice','editor','editor'),('t-alice','viewer','viewer'),('t-bob','bob','owner')").run();
  for (const [id, name, tenant] of [['church-1', 'Grace Kampala', 't-alice'], ['church-2', 'Hope Chapel', 't-bob']]) {
    db.prepare('insert into churches (id,name,city,country,created_at) values (?,?,?,?,?)').run(id, name, 'Kampala', 'Uganda', now);
    db.prepare("insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values (?, 'churches', ?, ?, 'published', '{}', ?, ?)").run(id, tenant, tenant === 't-alice' ? 'alice' : 'bob', now, now);
  }
  let current = 'alice', clock = START;
  const ctx = {
    json: (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
    getSessionUser: async () => current ? { ...db.prepare('select * from users where id=?').get(current), mfa_verified_at: now } : null,
    now: () => clock
  };
  const send = async request => {
    try { const response = await handleSimulatedLiveApi(request, env, ctx); return response; }
    catch (error) { if (error instanceof ApiError) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: error.status }); throw error; }
  };
  const call = async (path, method = 'GET', body) => {
    const response = await send(new Request('https://example.test/api/' + path, { method, headers: { 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }));
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
  return { db, env, media, ctx, send, call, as: id => { current = id; }, at: ms => { clock = ms; } };
}

const baseStream = extra => ({ title: 'Sunday service replay', videoUrl: 'https://cdn.example.org/videos/service.mp4', durationSeconds: 3600, playMode: 'once', ...extra });

test('timezone conversion: Africa/Kampala and America/New_York across DST changes', () => {
  assert.equal(new Date(zonedTimeToUtc(2026, 10, 4, 10, 0, 'Africa/Kampala')).toISOString(), '2026-10-04T07:00:00.000Z');
  assert.equal(new Date(zonedTimeToUtc(2026, 3, 7, 10, 0, 'America/New_York')).toISOString(), '2026-03-07T15:00:00.000Z');
  assert.equal(new Date(zonedTimeToUtc(2026, 3, 9, 10, 0, 'America/New_York')).toISOString(), '2026-03-09T14:00:00.000Z');
  assert.equal(new Date(zonedTimeToUtc(2026, 10, 31, 10, 0, 'America/New_York')).toISOString(), '2026-10-31T14:00:00.000Z');
  assert.equal(new Date(zonedTimeToUtc(2026, 11, 2, 10, 0, 'America/New_York')).toISOString(), '2026-11-02T15:00:00.000Z');
  // Spring-forward gap shifts forward; fall-back ambiguity picks the first occurrence.
  assert.equal(new Date(zonedTimeToUtc(2026, 3, 8, 2, 30, 'America/New_York')).toISOString(), '2026-03-08T07:30:00.000Z');
  assert.equal(new Date(zonedTimeToUtc(2026, 11, 1, 1, 30, 'America/New_York')).toISOString(), '2026-11-01T05:30:00.000Z');
  assert.equal(isValidTimezone('Africa/Kampala'), true);
  assert.equal(isValidTimezone('Mars/Olympus_Mons'), false);
});

test('weekly slots expand in the stream timezone and honour active date bounds', () => {
  const stream = { id: 's', title: 'S', durationSeconds: 3600, playMode: 'once', timezone: 'America/New_York' };
  const slot = { id: 'w', kind: 'weekly', weekday: 0, localTime: '10:00' };
  const plays = expandSlot(slot, stream, T('2026-02-28T00:00:00Z'), T('2026-03-16T00:00:00Z')).map(p => new Date(p.startsAt).toISOString());
  assert.deepEqual(plays, ['2026-03-01T15:00:00.000Z', '2026-03-08T14:00:00.000Z', '2026-03-15T14:00:00.000Z']);
  const bounded = expandSlot({ ...slot, activeFrom: '2026-03-05', activeUntil: '2026-03-10' }, stream, T('2026-02-28T00:00:00Z'), T('2026-03-16T00:00:00Z'));
  assert.deepEqual(bounded.map(p => new Date(p.startsAt).toISOString()), ['2026-03-08T14:00:00.000Z']);
  const kampala = expandSlot({ kind: 'weekly', weekday: 3, localTime: '19:30' }, { durationSeconds: 60, playMode: 'once', timezone: 'Africa/Kampala' }, START, START + 8 * 86400000);
  assert.deepEqual(kampala.map(p => new Date(p.startsAt).toISOString()), ['2026-10-07T16:30:00.000Z']);
});

test('overlap detection covers once vs weekly and conflicts among request slots', () => {
  const a = { id: 'a', title: 'A', durationSeconds: 3600, playMode: 'once', timezone: 'Africa/Kampala' };
  const b = { id: null, title: 'B', durationSeconds: 1800, playMode: 'once', timezone: 'Africa/Kampala' };
  const existing = streamPlays(a, [{ id: 'slot-a', kind: 'weekly', weekday: 0, localTime: '10:00' }], START, START + 14 * 86400000);
  const candidates = streamPlays(b, [{ kind: 'once', startsAt: '2026-10-04T07:30:00.000Z', slotIndex: 0 }, { kind: 'once', startsAt: '2026-10-05T07:00:00.000Z', slotIndex: 1 }, { kind: 'once', startsAt: '2026-10-05T07:10:00.000Z', slotIndex: 2 }], START, START + 14 * 86400000);
  const conflicts = findConflicts(candidates, existing);
  assert.equal(conflicts.length, 2);
  assert.deepEqual(conflicts[0], { startsAt: '2026-10-04T07:30:00.000Z', endsAt: '2026-10-04T08:00:00.000Z', slotIndex: 0, conflictsWith: { streamId: 'a', streamTitle: 'A', slotId: 'slot-a', startsAt: '2026-10-04T07:00:00.000Z' } });
  assert.equal(conflicts[1].slotIndex, 1); assert.equal(conflicts[1].conflictsWith.slotIndex, 2);
});

test('owner routes require a signed-in church manager or platform owner', async () => {
  const s = setup();
  s.as(null); assert.equal((await s.call('churches/church-1/simulated-live')).status, 401);
  s.as('bob'); assert.equal((await s.call('churches/church-1/simulated-live')).status, 403);
  assert.equal((await s.call('churches/church-1/simulated-live', 'POST', baseStream())).status, 403);
  s.as('viewer'); assert.equal((await s.call('churches/church-1/simulated-live')).status, 403);
  s.as('editor'); assert.equal((await s.call('churches/church-1/simulated-live')).status, 200);
  s.as('alice'); assert.equal((await s.call('churches/church-1/simulated-live')).status, 200);
  s.as('owner'); assert.equal((await s.call('churches/church-1/simulated-live')).status, 200);
  assert.equal((await s.call('churches/missing/simulated-live')).status, 404);
  s.as('bob'); assert.equal((await s.call('churches/church-2/simulated-live')).status, 200);
});

test('create, list, get, preview and slot management', async () => {
  const s = setup();
  const created = await s.call('churches/church-1/simulated-live', 'POST', baseStream({ posterUrl: 'https://cdn.example.org/poster.jpg', slots: [{ kind: 'weekly', weekday: 0, localTime: '10:00' }] }));
  assert.equal(created.status, 201);
  const stream = created.body.stream;
  assert.equal(stream.churchId, 'church-1'); assert.equal(stream.videoSource, 'mp4_url'); assert.equal(stream.timezone, 'Africa/Kampala'); assert.equal(stream.status, 'active');
  assert.equal(stream.createdBy, 'alice@example.test'); assert.equal(stream.posterUrl, 'https://cdn.example.org/poster.jpg');
  assert.equal(stream.slots.length, 1); assert.equal(stream.nextPlays.length, 5);
  assert.deepEqual(stream.nextPlays[0], { startsAt: '2026-10-04T07:00:00.000Z', endsAt: '2026-10-04T08:00:00.000Z', slotId: stream.slots[0].id });
  const zero = await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title: 'No slots yet', videoUrl: '/media/church-video/00000000-0000-4000-8000-000000000000.mp4' }));
  assert.equal(zero.status, 201); assert.equal(zero.body.stream.videoSource, 'upload'); assert.deepEqual(zero.body.stream.nextPlays, []);
  const list = await s.call('churches/church-1/simulated-live');
  assert.equal(list.body.streams.length, 2);
  assert.equal((await s.call('churches/church-1/simulated-live/' + stream.id)).body.stream.id, stream.id);
  assert.equal((await s.call('churches/church-2/simulated-live/' + stream.id)).status, 403);
  s.as('owner'); assert.equal((await s.call('churches/church-2/simulated-live/' + stream.id)).status, 404); s.as('alice');
  const preview = await s.call('churches/church-1/simulated-live/' + stream.id + '/preview?count=50');
  assert.equal(preview.body.plays.length, 20);
  const added = await s.call('churches/church-1/simulated-live/' + stream.id + '/slots', 'POST', { kind: 'once', startsAt: '2026-10-02T12:00:00Z' });
  assert.equal(added.status, 201); assert.equal(added.body.slot.startsAt, '2026-10-02T12:00:00.000Z');
  assert.equal(added.body.stream.nextPlays[0].slotId, added.body.slot.id);
  const clash = await s.call('churches/church-1/simulated-live/' + stream.id + '/slots', 'POST', { kind: 'once', startsAt: '2026-10-04T07:30:00Z' });
  assert.equal(clash.status, 400); assert.equal(clash.body.code, 'overlap'); assert.equal(clash.body.conflicts[0].conflictsWith.streamId, stream.id);
  assert.equal((await s.call('churches/church-1/simulated-live/' + stream.id + '/slots/' + added.body.slot.id, 'DELETE')).status, 200);
  assert.equal((await s.call('churches/church-1/simulated-live/' + stream.id + '/slots/' + added.body.slot.id, 'DELETE')).status, 404);
  const patched = await s.call('churches/church-1/simulated-live/' + stream.id, 'PATCH', { title: 'Renamed', slots: [{ kind: 'weekly', weekday: 6, localTime: '18:00', activeUntil: '2026-12-31' }] });
  assert.equal(patched.status, 200); assert.equal(patched.body.stream.title, 'Renamed'); assert.equal(patched.body.stream.slots[0].weekday, 6);
  assert.equal(patched.body.stream.nextPlays[0].startsAt, '2026-10-03T15:00:00.000Z');
});

test('validation errors use contract codes', async () => {
  const s = setup();
  const post = body => s.call('churches/church-1/simulated-live', 'POST', body);
  const expectCode = async (body, code) => { const r = await post(body); assert.equal(r.status, 400, JSON.stringify(r.body)); assert.equal(r.body.ok, false); assert.equal(r.body.code, code); assert.ok(r.body.error); };
  await expectCode(baseStream({ videoUrl: 'http://cdn.example.org/a.mp4' }), 'invalid_video');
  await expectCode(baseStream({ videoUrl: 'https://cdn.example.org/a.mov' }), 'invalid_video');
  await expectCode(baseStream({ videoUrl: '/media/creator-media/00000000-0000-4000-8000-000000000000.mp4' }), 'invalid_video');
  await expectCode(baseStream({ videoUrl: 'ftp://cdn.example.org/a.mp4' }), 'invalid_video');
  await expectCode(baseStream({ durationSeconds: 0 }), 'invalid_duration');
  await expectCode(baseStream({ durationSeconds: 43201 }), 'invalid_duration');
  await expectCode(baseStream({ durationSeconds: 12.5 }), 'invalid_duration');
  await expectCode(baseStream({ timezone: 'Mars/Olympus_Mons' }), 'invalid_timezone');
  await expectCode(baseStream({ posterUrl: 'javascript:alert(1)' }), 'invalid_poster');
  await expectCode(baseStream({ playMode: 'loop', loopWindowMinutes: 30 }), 'invalid_slot');
  await expectCode(baseStream({ playMode: 'loop' }), 'invalid_slot');
  await expectCode(baseStream({ slots: [{ kind: 'weekly', weekday: 7, localTime: '10:00' }] }), 'invalid_slot');
  await expectCode(baseStream({ slots: [{ kind: 'weekly', weekday: 1, localTime: '25:00' }] }), 'invalid_slot');
  await expectCode(baseStream({ slots: [{ kind: 'weekly', weekday: 1, localTime: '10:00', activeFrom: '2026-12-01', activeUntil: '2026-11-01' }] }), 'invalid_slot');
  await expectCode(baseStream({ slots: [{ kind: 'daily' }] }), 'invalid_slot');
  await expectCode(baseStream({ slots: [{ kind: 'once', startsAt: 'not a date' }] }), 'invalid_slot');
  await expectCode(baseStream({ slots: [{ kind: 'once', startsAt: '2026-10-01T08:59:00Z' }] }), 'past_start');
  await expectCode(baseStream({ title: '' }), 'invalid_request');
  assert.equal(s.db.prepare('select count(*) as n from simulated_live_streams').get().n, 0);
});

test('overlaps across streams of one church are rejected; paused and archived streams do not count', async () => {
  const s = setup();
  const a = (await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title: 'A', slots: [{ kind: 'weekly', weekday: 0, localTime: '10:00' }] }))).body.stream;
  const clash = await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title: 'B', durationSeconds: 1800, slots: [{ kind: 'once', startsAt: '2026-10-11T07:45:00Z' }] }));
  assert.equal(clash.status, 400); assert.equal(clash.body.code, 'overlap');
  assert.deepEqual(clash.body.conflicts, [{ startsAt: '2026-10-11T07:45:00.000Z', endsAt: '2026-10-11T08:15:00.000Z', slotIndex: 0, conflictsWith: { streamId: a.id, streamTitle: 'A', slotId: a.slots[0].id, startsAt: '2026-10-11T07:00:00.000Z' } }]);
  // Another church at the same time is fine.
  s.as('bob'); assert.equal((await s.call('churches/church-2/simulated-live', 'POST', baseStream({ slots: [{ kind: 'once', startsAt: '2026-10-11T07:45:00Z' }] }))).status, 201); s.as('alice');
  // Pausing A frees the time; re-activating A then conflicts.
  const paused = await s.call('churches/church-1/simulated-live/' + a.id, 'PATCH', { status: 'paused', moderationNote: 'Copyright check' });
  assert.equal(paused.body.stream.status, 'paused'); assert.equal(paused.body.stream.pausedBy, 'alice@example.test'); assert.equal(paused.body.stream.pausedAt, new Date(START).toISOString()); assert.equal(paused.body.stream.moderationNote, 'Copyright check');
  const b = await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title: 'B', durationSeconds: 1800, slots: [{ kind: 'once', startsAt: '2026-10-11T07:45:00Z' }] }));
  assert.equal(b.status, 201);
  const reactivate = await s.call('churches/church-1/simulated-live/' + a.id, 'PATCH', { status: 'active' });
  assert.equal(reactivate.status, 400); assert.equal(reactivate.body.code, 'overlap'); assert.equal(reactivate.body.conflicts[0].slotId, a.slots[0].id);
  // Archiving B (DELETE) frees it again and hides B from the owner list.
  assert.equal((await s.call('churches/church-1/simulated-live/' + b.body.stream.id, 'DELETE')).status, 200);
  const active = await s.call('churches/church-1/simulated-live/' + a.id, 'PATCH', { status: 'active' });
  assert.equal(active.status, 200); assert.equal(active.body.stream.pausedBy, null);
  assert.deepEqual((await s.call('churches/church-1/simulated-live')).body.streams.map(x => x.id), [a.id]);
});

test('dry-run preview validates without saving and reports errors and conflicts', async () => {
  const s = setup();
  const a = (await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title: 'A', slots: [{ kind: 'weekly', weekday: 0, localTime: '10:00' }] }))).body.stream;
  const count = () => s.db.prepare('select count(*) as n from simulated_live_streams').get().n;
  const ok = await s.call('churches/church-1/simulated-live/preview', 'POST', baseStream({ slots: [{ kind: 'weekly', weekday: 3, localTime: '19:00' }] }));
  assert.equal(ok.status, 200); assert.equal(ok.body.valid, true); assert.equal(ok.body.nextPlays.length, 5); assert.deepEqual(ok.body.errors, []); assert.deepEqual(ok.body.conflicts, []);
  assert.equal(ok.body.nextPlays[0].startsAt, '2026-10-07T16:00:00.000Z');
  const bad = await s.call('churches/church-1/simulated-live/preview', 'POST', baseStream({ slots: [{ kind: 'once', startsAt: '2026-09-01T00:00:00Z' }, { kind: 'weekly', weekday: 0, localTime: '10:30' }, { kind: 'weekly', weekday: 9, localTime: '10:00' }] }));
  assert.equal(bad.body.valid, false);
  assert.deepEqual(bad.body.errors.map(e => [e.code, e.slotIndex]), [['past_start', 0], ['invalid_slot', 2]]);
  assert.equal(bad.body.conflicts[0].slotIndex, 1); assert.equal(bad.body.conflicts[0].conflictsWith.streamId, a.id);
  const editing = await s.call('churches/church-1/simulated-live/preview', 'POST', baseStream({ streamId: a.id, slots: [{ kind: 'weekly', weekday: 0, localTime: '10:30' }] }));
  assert.equal(editing.body.valid, true);
  const invalid = await s.call('churches/church-1/simulated-live/preview', 'POST', baseStream({ durationSeconds: -1, videoUrl: 'https://cdn.example.org/a.webm' }));
  assert.deepEqual(invalid.body.errors.map(e => e.code).sort(), ['invalid_duration', 'invalid_video']); assert.deepEqual(invalid.body.nextPlays, []);
  assert.equal(count(), 1);
  s.as('bob'); assert.equal((await s.call('churches/church-1/simulated-live/preview', 'POST', baseStream())).status, 403);
});

test('now-playing moves through upcoming, live, ended and none with an injected clock', async () => {
  const s = setup();
  const t0 = START + 3600000;
  const stream = (await s.call('churches/church-1/simulated-live', 'POST', baseStream({ posterUrl: '/media/creator-media/00000000-0000-4000-8000-000000000001.jpg', slots: [{ kind: 'once', startsAt: new Date(t0).toISOString() }] }))).body.stream;
  const slotId = stream.slots[0].id;
  const now = () => s.call('churches/church-1/now-playing');
  s.as(null);
  let r = await now();
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.body.state, 'upcoming'); assert.equal(r.body.serverTime, new Date(START).toISOString());
  assert.deepEqual(r.body.nextPlay, { startsAt: new Date(t0).toISOString(), slotId, title: 'Sunday service replay' });
  assert.equal(r.body.poster, '/media/creator-media/00000000-0000-4000-8000-000000000001.jpg'); assert.equal(r.body.slotId, null);
  s.at(t0 + 600500); r = await now();
  assert.equal(r.body.state, 'live'); assert.equal(r.body.offsetSeconds, 600.5); assert.equal(r.body.loopIteration, 0);
  assert.deepEqual(r.body.stream, { id: stream.id, title: 'Sunday service replay', videoUrl: 'https://cdn.example.org/videos/service.mp4', durationSeconds: 3600, playMode: 'once' });
  assert.deepEqual(r.body.play, { startsAt: new Date(t0).toISOString(), endsAt: new Date(t0 + 3600000).toISOString(), slotId });
  assert.equal(r.body.slotId, slotId); assert.equal(r.body.nextPlay, null);
  s.at(t0 + 3600000 + 10 * 60000); r = await now();
  assert.equal(r.body.state, 'ended'); assert.equal(r.body.slotId, slotId); assert.equal(r.body.offsetSeconds, 0);
  s.at(t0 + 3600000 + 31 * 60000); r = await now();
  assert.equal(r.body.state, 'none'); assert.equal(r.body.stream, null); assert.equal(r.body.play, null); assert.equal(r.body.nextPlay, null); assert.equal(r.body.poster, null);
});

test('loop mode wraps offset modulo duration; ended keeps nextPlay; upcoming limited to 7 days', () => {
  const loop = { id: 'l', title: 'Loop', videoUrl: 'https://x.test/a.mp4', durationSeconds: 600, playMode: 'loop', loopWindowMinutes: 30, timezone: 'Africa/Kampala', status: 'active', slots: [{ id: 'slot-l', kind: 'once', startsAt: '2026-10-01T10:00:00.000Z' }] };
  let r = computeNowPlaying([loop], T('2026-10-01T10:25:00Z'));
  assert.equal(r.state, 'live'); assert.equal(r.loopIteration, 2); assert.equal(r.offsetSeconds, 300);
  assert.equal(r.play.endsAt, '2026-10-01T10:30:00.000Z');
  r = computeNowPlaying([loop], T('2026-10-01T10:30:00Z')); assert.equal(r.state, 'ended');
  const two = { ...loop, playMode: 'once', durationSeconds: 1800, slots: [{ id: 'first', kind: 'once', startsAt: '2026-10-01T10:00:00.000Z' }, { id: 'second', kind: 'once', startsAt: '2026-10-03T10:00:00.000Z' }] };
  r = computeNowPlaying([two], T('2026-10-01T10:40:00Z'));
  assert.equal(r.state, 'ended'); assert.equal(r.slotId, 'first'); assert.deepEqual(r.nextPlay, { startsAt: '2026-10-03T10:00:00.000Z', slotId: 'second', title: 'Loop' });
  const far = { ...two, slots: [{ id: 'far', kind: 'once', startsAt: '2026-10-20T10:00:00.000Z' }] };
  assert.equal(computeNowPlaying([far], START).state, 'none');
  assert.equal(computeNowPlaying([{ ...loop, status: 'paused' }], T('2026-10-01T10:25:00Z')).state, 'none');
});

test('paused streams go off air immediately and archived streams are excluded from now-playing', async () => {
  const s = setup();
  const a = (await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title: 'A', slots: [{ kind: 'once', startsAt: '2026-10-01T10:00:00Z' }] }))).body.stream;
  const b = (await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title: 'B', slots: [{ kind: 'once', startsAt: '2026-10-02T10:00:00Z' }] }))).body.stream;
  s.at(T('2026-10-01T10:10:00Z'));
  assert.equal((await s.call('churches/church-1/now-playing')).body.state, 'live');
  s.as('owner');
  const paused = await s.call('churches/church-1/simulated-live/' + a.id, 'PATCH', { status: 'paused', moderationNote: 'Reported' });
  assert.equal(paused.status, 200); assert.equal(paused.body.stream.pausedBy, 'owner@example.test');
  let r = await s.call('churches/church-1/now-playing');
  assert.equal(r.body.state, 'upcoming'); assert.equal(r.body.stream.id, b.id); assert.equal(r.body.nextPlay.title, 'B');
  s.as('alice'); await s.call('churches/church-1/simulated-live/' + b.id, 'DELETE');
  r = await s.call('churches/church-1/now-playing'); assert.equal(r.body.state, 'none');
});

test('batch now-playing answers many churches with one query and caps the list', async () => {
  const s = setup();
  await s.call('churches/church-1/simulated-live', 'POST', baseStream({ posterUrl: 'https://cdn.example.org/p.png', slots: [{ kind: 'once', startsAt: '2026-10-01T09:30:00Z' }] }));
  s.as('bob'); await s.call('churches/church-2/simulated-live', 'POST', baseStream({ title: 'Hope live', slots: [{ kind: 'once', startsAt: '2026-10-02T08:30:00Z' }] }));
  s.as(null); s.at(T('2026-10-01T09:40:00Z'));
  const r = await s.call('simulated-live/now-playing?churchIds=church-1,church-2,unknown,church-1');
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Object.keys(r.body.churches), ['church-1', 'church-2', 'unknown']);
  assert.equal(r.body.churches['church-1'].state, 'live'); assert.equal(r.body.churches['church-1'].poster, 'https://cdn.example.org/p.png'); assert.ok(r.body.churches['church-1'].slotId);
  assert.equal(r.body.churches['church-1'].play.slotId, r.body.churches['church-1'].slotId);
  assert.equal(r.body.churches['church-2'].state, 'upcoming'); assert.equal(r.body.churches['church-2'].nextPlay.title, 'Hope live');
  assert.deepEqual(r.body.churches.unknown, { state: 'none', poster: null, slotId: null, play: null, nextPlay: null });
  const many = Array.from({ length: 51 }, (_, i) => 'c' + i).join(',');
  const tooMany = await s.call('simulated-live/now-playing?churchIds=' + many);
  assert.equal(tooMany.status, 400); assert.equal(tooMany.body.code, 'invalid_request');
});

test('admin listing is platform-owner only with filters and pagination', async () => {
  const s = setup();
  for (const title of ['Morning prayer', 'Evening worship', 'Youth night']) await s.call('churches/church-1/simulated-live', 'POST', baseStream({ title, slots: [] }));
  s.as('bob'); await s.call('churches/church-2/simulated-live', 'POST', baseStream({ title: 'Hope replay', slots: [{ kind: 'weekly', weekday: 0, localTime: '10:00' }] }));
  assert.equal((await s.call('admin/simulated-live')).status, 403);
  s.as(null); assert.equal((await s.call('admin/simulated-live')).status, 401);
  s.as('owner');
  const all = await s.call('admin/simulated-live');
  assert.equal(all.body.streams.length, 4);
  const hope = all.body.streams.find(x => x.title === 'Hope replay');
  assert.equal(hope.churchName, 'Hope Chapel'); assert.equal(hope.createdBy, 'bob@example.test'); assert.equal(hope.nextPlay.startsAt, '2026-10-04T07:00:00.000Z'); assert.equal(hope.nextPlay.title, 'Hope replay');
  assert.equal((await s.call('admin/simulated-live?q=hope')).body.streams.length, 1);
  assert.equal((await s.call('admin/simulated-live?q=Grace')).body.streams.length, 3);
  assert.equal((await s.call('admin/simulated-live?churchId=church-2')).body.streams.length, 1);
  const page1 = await s.call('admin/simulated-live?limit=2');
  assert.equal(page1.body.streams.length, 2); assert.equal(page1.body.nextCursor, '2');
  const page2 = await s.call('admin/simulated-live?limit=2&cursor=2');
  assert.equal(page2.body.streams.length, 2); assert.equal(page2.body.nextCursor, null);
  await s.call('churches/church-2/simulated-live/' + hope.id, 'PATCH', { status: 'paused', moderationNote: 'Under review' });
  const pausedList = await s.call('admin/simulated-live?status=paused');
  assert.equal(pausedList.body.streams.length, 1); assert.equal(pausedList.body.streams[0].pausedBy, 'owner@example.test'); assert.equal(pausedList.body.streams[0].moderationNote, 'Under review'); assert.equal(pausedList.body.streams[0].nextPlay, null);
});

const mp4Bytes = size => { const bytes = new Uint8Array(size); bytes.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]); return bytes; };

test('single-shot MP4 upload stores church video in R2 and media serves byte ranges', async () => {
  const s = setup();
  const upload = async (bytes, as) => { const form = new FormData(); form.append('video', new Blob([bytes], { type: 'video/mp4' }), 'service.mp4'); if (as !== undefined) s.as(as); const res = await s.send(new Request('https://example.test/api/churches/church-1/simulated-live/video', { method: 'POST', body: form })); return { status: res.status, body: await res.json() }; };
  const ok = await upload(mp4Bytes(100));
  assert.equal(ok.status, 201); assert.match(ok.body.url, /^\/media\/church-video\/[0-9a-f-]{36}\.mp4$/);
  const key = ok.body.url.slice('/media/'.length);
  assert.equal(s.media.objects.get(key).opts.httpMetadata.contentType, 'video/mp4');
  const bad = await upload(new TextEncoder().encode('definitely not an mp4 file'));
  assert.equal(bad.status, 400); assert.equal(bad.body.code, 'invalid_video');
  assert.equal((await upload(mp4Bytes(100), 'bob')).status, 403);
  // Media route
  const media = (headers = {}, method = 'GET') => handleMediaRequest(new Request('https://example.test' + ok.body.url, { method, headers }), s.env);
  const full = await media();
  assert.equal(full.status, 200); assert.equal(full.headers.get('accept-ranges'), 'bytes'); assert.equal((await full.arrayBuffer()).byteLength, 100);
  const partial = await media({ range: 'bytes=10-19' });
  assert.equal(partial.status, 206); assert.equal(partial.headers.get('content-range'), 'bytes 10-19/100'); assert.equal(partial.headers.get('content-length'), '10');
  assert.equal((await partial.arrayBuffer()).byteLength, 10);
  const suffix = await media({ range: 'bytes=-5' }); assert.equal(suffix.headers.get('content-range'), 'bytes 95-99/100');
  const open = await media({ range: 'bytes=90-' }); assert.equal(open.headers.get('content-range'), 'bytes 90-99/100');
  const unsatisfiable = await media({ range: 'bytes=200-300' }); assert.equal(unsatisfiable.status, 416); assert.equal(unsatisfiable.headers.get('content-range'), 'bytes */100');
  assert.equal((await handleMediaRequest(new Request('https://example.test/media/church-video/not-a-uuid.mp4'), s.env)).status, 404);
  assert.deepEqual(parseByteRange('bytes=0-0', 10), { start: 0, end: 0 }); assert.equal(parseByteRange('items=0-1', 10), null);
  // Other media keys keep the old behaviour (no range handling).
  await s.media.put('creator-media/00000000-0000-4000-8000-000000000000.jpg', new Uint8Array(20), { httpMetadata: { contentType: 'image/jpeg' } });
  const image = await handleMediaRequest(new Request('https://example.test/media/creator-media/00000000-0000-4000-8000-000000000000.jpg', { headers: { range: 'bytes=0-1' } }), s.env);
  assert.equal(image.status, 200); assert.equal(image.headers.get('accept-ranges'), null);
});

test('multipart upload flow validates church, part sizes and MP4 magic, then completes', async () => {
  const s = setup();
  const raw = async (path, method, bytes) => { const res = await s.send(new Request('https://example.test/api/' + path, { method, headers: { 'content-type': 'application/octet-stream' }, body: bytes })); return { status: res.status, body: await res.json() }; };
  assert.equal((await s.call('churches/church-1/simulated-live/video/uploads', 'POST', { filename: 'a.mov', size: 40, contentType: 'video/mp4' })).body.code, 'invalid_video');
  assert.equal((await s.call('churches/church-1/simulated-live/video/uploads', 'POST', { filename: 'a.mp4', size: 3 * 1024 ** 3, contentType: 'video/mp4' })).status, 413);
  const init = await s.call('churches/church-1/simulated-live/video/uploads', 'POST', { filename: 'service.mp4', size: 40, contentType: 'video/mp4' });
  assert.equal(init.status, 201); assert.equal(init.body.partSize, 16); assert.equal(init.body.partCount, 3); assert.match(init.body.key, /^church-video\/[0-9a-f-]{36}\.mp4$/);
  const { uploadId, key } = init.body, base = `churches/church-1/simulated-live/video/uploads/${uploadId}`;
  assert.equal(s.media.uploads.get(uploadId).opts.customMetadata.churchId, 'church-1');
  // Other church cannot use it even as its manager.
  s.as('bob'); assert.equal((await raw(`churches/church-2/simulated-live/video/uploads/${uploadId}/parts/1?key=${key}`, 'PUT', mp4Bytes(16))).status, 404); s.as('alice');
  const badMagic = await raw(`${base}/parts/1?key=${key}`, 'PUT', new Uint8Array(16));
  assert.equal(badMagic.status, 400); assert.equal(badMagic.body.code, 'invalid_video');
  assert.equal((await raw(`${base}/parts/2?key=${key}`, 'PUT', new Uint8Array(10))).status, 400);
  assert.equal((await raw(`${base}/parts/4?key=${key}`, 'PUT', new Uint8Array(8))).status, 400);
  assert.equal((await s.call(`${base}/complete`, 'POST', { key, parts: [] })).body.code, 'invalid_video');
  const p1 = await raw(`${base}/parts/1?key=${key}`, 'PUT', mp4Bytes(16));
  assert.deepEqual(p1.body, { ok: true, partNumber: 1, etag: 'etag-1' });
  const p2 = await raw(`${base}/parts/2?key=${key}`, 'PUT', new Uint8Array(16).fill(2));
  const p3 = await raw(`${base}/parts/3?key=${key}`, 'PUT', new Uint8Array(8).fill(3));
  assert.equal(p3.status, 200);
  assert.equal((await s.call(`${base}/complete`, 'POST', { key, parts: [p1.body, p2.body] })).status, 400);
  const done = await s.call(`${base}/complete`, 'POST', { key, parts: [p3.body, p1.body, p2.body].map(({ partNumber, etag }) => ({ partNumber, etag })) });
  assert.equal(done.status, 200); assert.equal(done.body.url, '/media/' + key);
  assert.equal(s.media.objects.get(key).bytes.length, 40);
  assert.equal((await raw(`${base}/parts/1?key=${key}`, 'PUT', mp4Bytes(16))).status, 409);
  // Abort another upload.
  const second = (await s.call('churches/church-1/simulated-live/video/uploads', 'POST', { size: 20, contentType: 'video/mp4' })).body;
  const aborted = await s.call(`churches/church-1/simulated-live/video/uploads/${second.uploadId}?key=${second.key}`, 'DELETE');
  assert.equal(aborted.status, 200); assert.equal(s.media.uploads.get(second.uploadId).aborted, true);
  assert.equal(s.db.prepare('select status from simulated_live_uploads where upload_id=?').get(second.uploadId).status, 'aborted');
  s.as('bob'); assert.equal((await s.call('churches/church-1/simulated-live/video/uploads', 'POST', { size: 20, contentType: 'video/mp4' })).status, 403);
});
