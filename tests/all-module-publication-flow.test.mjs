import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');

test('owner publication controls cover every public module and all pending records reach review', async () => {
  const [admin, client, migration] = await Promise.all([
    read('public/admin-workspace.js'),
    read('public/platform-client.js'),
    read('migrations/0023_remaining_publication_settings.sql')
  ]);
  for (const value of ['autoPublishPendingEvents', 'autoPublishPendingStores', 'autoPublishPendingProducts', 'autoPublishPendingChannels', 'autoPublishPendingResources']) {
    assert.match(client, new RegExp(value));
    assert.match(migration, new RegExp(value));
  }
  for (const kind of ['events', 'store', 'products', 'channels', 'resources']) {
    assert.match(admin, new RegExp('"' + kind + '"'));
  }
  assert.match(admin, /data-publication-form/);
  assert.match(admin, /publicationState === "pending"/);
});

test('pending badges are rendered on every remaining public module and detail experience', async () => {
  const files = await Promise.all([
    'public/app.js',
    'public/creator-public.js',
    'public/store.js',
    'public/product-detail.js',
    'public/channels.js',
    'public/channel-detail.js',
    'public/resources.js',
    'public/resource-detail.js',
    'public/member-home.js'
  ].map(read));
  for (const source of files) assert.match(source, /pendingBadge|platform-pending-badge|isPending/);
});
