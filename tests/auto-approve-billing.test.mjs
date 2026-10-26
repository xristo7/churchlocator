import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { studioAutoApprove, livestreamBilling, livestreamIsFree } from '../src/trusted-platform.js';

const read = f => readFile(new URL('../' + f, import.meta.url), 'utf8');
const dbWith = row => ({ DB: { prepare: () => ({ first: async () => row }) } });

test('AUTO_APPROVE_STUDIO_CONTENT is opt-in and needs a signed-in user', () => {
  assert.equal(studioAutoApprove({}, { id: 'u' }), false);
  assert.equal(studioAutoApprove({ AUTO_APPROVE_STUDIO_CONTENT: 'false' }, { id: 'u' }), false);
  assert.equal(studioAutoApprove({ AUTO_APPROVE_STUDIO_CONTENT: 'true' }, null), false);
  assert.equal(studioAutoApprove({ AUTO_APPROVE_STUDIO_CONTENT: 'TRUE' }, { id: 'u' }), true);
});

test('livestream billing defaults to free and honours paid', async () => {
  assert.equal(await livestreamBilling(dbWith(null)), 'free');
  assert.equal(await livestreamBilling({ DB: { prepare: () => { throw new Error('no table'); } } }), 'free');
  assert.equal(await livestreamBilling(dbWith({ value_json: '{"mode":"paid"}' })), 'paid');
  assert.equal(await livestreamIsFree(dbWith({ value_json: '{"mode":"free"}' })), true);
});

test('auto-approve wiring: entities, spotlight, studio wording, flag in both envs', async () => {
  const [tp, sp, cs, sw, wr, live, admin, mig] = await Promise.all(['src/trusted-platform.js','src/spotlight.js','public/creator-studio.js','public/spotlight-workspace.js','wrangler.jsonc','src/live.js','public/admin-workspace.js','migrations/0027_livestream_billing.sql'].map(read));
  assert.match(tp, /autoApproved && state==='pending'\) state='published'/);
  assert.match(tp, /existing\?\.state!=='archived'/, 'admin-archived content stays archived');
  assert.match(tp, /is_verified=\$\{verifyOk/, 'verified badge only from owner publish');
  assert.match(sp, /studioAutoApprove\(env, user\)/);
  assert.match(cs, /autoPublish\?"Publish":"Submit for review"/);
  assert.match(sw, /autoPublishSpotlight\?'Publish'/);
  assert.equal((wr.match(/"AUTO_APPROVE_STUDIO_CONTENT": "true"/g) || []).length, 2);
  assert.equal((live.match(/await requireLivestreamAccess\(/g) || []).length, 3);
  assert.match(live, /parts\[2\]==='billing'/);
  assert.match(admin, /\/api\/live\/billing/);
  assert.match(mig, /"mode":"free"/);
});
