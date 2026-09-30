import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');

test('creator registration persists a church and church portal waits for server confirmation', async () => {
  const app = await read('public/app.js');
  assert.match(app, /savedChurch = await MWE\.upsertChurch\(newChurch\)/);
  assert.doesNotMatch(app, /const list = MWE\.getChurches\(\);\s*list\.push\(newChurch\)/);
  assert.match(app, /const church = await MWE\.upsertChurch\(MWE\.churchFromForm\(form\)\)/);
  assert.match(app, /Church submitted for owner review/);
});

test('owner controls pending church visibility and public surfaces label pending profiles', async () => {
  const [admin, client, app, profile, migration] = await Promise.all([
    read('public/admin-workspace.js'),
    read('public/platform-client.js'),
    read('public/app.js'),
    read('public/church-profile.html'),
    read('migrations/0021_church_publication_settings.sql')
  ]);
  assert.match(admin, /Publish while pending review/);
  assert.match(admin, /saveChurchPublicationSettings/);
  assert.match(client, /platform-settings\/church-publication/);
  assert.match(app, /Pending review/);
  assert.match(profile, /data-profile-review-badge/);
  assert.match(migration, /autoPublishPendingChurches/);
});
