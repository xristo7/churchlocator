import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = p => readFile(new URL(`../${p}`, import.meta.url), 'utf8');

test('church list, profile and channel pages are driven by church-directory.js and /api/churches', async () => {
  const [list, profile, channel, js, worker] = await Promise.all([
    read('public/churches.html'), read('public/church-profile.html'), read('public/church-channel.html'),
    read('public/church-directory.js'), read('src/worker.js')
  ]);
  assert.match(list, /data-page="church-directory"/);
  assert.match(list, /id="rsc-directory"/);
  assert.match(profile, /data-page="church-detail"/);
  assert.match(profile, /id="rsc-profile"/);
  assert.match(channel, /data-page="church-channel"/);
  assert.match(channel, /id="rsc-channel"/);
  for (const html of [list, profile, channel]) assert.match(html, /church-directory\.js/);
  assert.match(js, /\/api\/churches/);
  for (const act of ['visit', 'ride', 'message', 'follow', 'save', 'share']) assert.match(js, new RegExp(`data-act="${act}"`), `profile needs ${act} action`);
  assert.match(js, /serviceLine/);
  assert.match(js, /\/api\/visitor/);
  assert.match(js, /requireSignIn/);
  assert.match(worker, /canMessage/);
});

test('State/Province filter is hidden when no church has a state', async () => {
  const js = await read('public/church-directory.js');
  assert.match(js, /key === 'region'[\s\S]{0,80}!churches\.some\(c => c\.state\)/);
});

test('Live badge reads the /api/live/directory shape (broadcasts.churchId and stages.channelId -> tenant)', async () => {
  const source = await read('public/church-directory.js');
  const responses = {
    '/api/live/directory': { ok: true, stages: [{ sessionId: 's1', channelId: 'chan-1', title: 'Sunday' }], broadcasts: [{ churchId: 'church-b', url: 'https://x' }] },
    '/api/catalog': { ok: true, records: [{ id: 'chan-1', kind: 'channels', tenantId: 'tenant-a' }, { id: 'chan-2', kind: 'channels', tenantId: 'tenant-z' }] }
  };
  const window = {};
  const ctx = {
    window, console, Map, Set, Promise, URLSearchParams,
    location: { pathname: '/churches', search: '' },
    document: { readyState: 'complete', body: { dataset: { page: 'test' } }, querySelector: () => null, addEventListener() {} },
    fetch: async url => ({ ok: true, json: async () => responses[url] || { ok: false } })
  };
  ctx.window = ctx;
  vm.runInNewContext(source, ctx);
  const { liveChurchIds, isLive } = ctx.RSChurchDirectory;
  const live = await liveChurchIds();
  assert.equal(isLive({ id: 'church-a', tenantId: 'tenant-a' }, live), true, 'tenant with a live channel stage is live');
  assert.equal(isLive({ id: 'church-b', tenantId: '' }, live), true, 'church with a ready broadcast is live');
  assert.equal(!!isLive({ id: 'church-c', tenantId: 'tenant-z' }, live), false, 'tenant whose channel is not live is not live');
  assert.equal(!!isLive({ id: 'church-d' }, live), false, 'church without tenant or broadcast is not live');

  responses['/api/live/directory'] = { ok: false };
  vm.runInNewContext(source, ctx);
  const offline = await ctx.RSChurchDirectory.liveChurchIds();
  assert.equal(!!ctx.RSChurchDirectory.isLive({ id: 'church-b', tenantId: 'tenant-a' }, offline), false, 'failed live API shows no Live badge');
});

test('public ride/visit requests surface as labelled read-only records for owners and admins', async () => {
  const { visitorRequestRecord } = await import('../src/trusted-platform.js');
  const ride = visitorRequestRecord({ id: 7, church_id: 'c1', needs: '["ride"]', full_name: 'Ann Lee', phone: '555', email: 'a@x', city: 'Downtown', created_at: '2026-10-26' });
  const visit = visitorRequestRecord({ id: 8, church_id: 'c1', needs: '[]', full_name: 'Bo' });
  assert.equal(visit.kind, 'visit');
  assert.match(visit.requestType, /Visit request/);
  assert.equal(ride.pickupAddress, 'Downtown');
  assert.equal(ride.id, 'visitor-7');
  assert.equal(ride.kind, 'ride');
  assert.equal(ride.readOnly, true);
  assert.equal(ride.source, 'public-form');
  assert.match(ride.requestType, /Ride request/);
  const [worker, app, client] = await Promise.all([read('src/worker.js'), read('public/app.js'), read('public/platform-client.js')]);
  assert.match(worker, /\/api\/admin\/visitors/);
  assert.match(app, /Ride request · public form/);
  assert.match(client, /visitor-/);
});
