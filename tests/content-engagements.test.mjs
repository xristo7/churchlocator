import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('churches have no favorite control while approved content has persisted love controls', async () => {
  const [app, home, channels, store, resources, creator, worker, api, migration] = await Promise.all([
    read('public/app.js'), read('public/index.html'), read('public/channels.js'), read('public/store.js'),
    read('public/resources.js'), read('public/creator-public.js'), read('src/worker.js'),
    read('src/content-engagements.js'), read('migrations/0011_content_engagements.sql')
  ]);
  assert.doesNotMatch(app + home, /toggleFavorite|immersive-fav-btn|split-fav-btn|favorite churches|saved churches/i);
  assert.match(channels, /data-love-type="channel"/);
  assert.match(store, /data-love-type="product"/);
  assert.match(resources, /data-love-type="resource"/);
  assert.match(creator, /data-love-type="livestream"/);
  assert.match(worker, /handleContentEngagementApi/);
  assert.match(api, /new Set\(\['channel', 'product', 'resource', 'livestream'\]\)/);
  assert.match(migration, /primary key\(content_type, content_id, user_id, reaction\)/i);
  assert.doesNotMatch(api + migration, /church/);
});

test('directory hero titles and descriptions stay within editorial limits', async () => {
  const pages = await Promise.all(['churches', 'channels', 'events', 'livestream', 'resources', 'store', 'meditation'].map(name => read(`public/${name}.html`)));
  for (const html of pages) {
    const hero = html.match(/<div class="module-hero-copy">([\s\S]*?)<\/div>/)?.[1] || '';
    const title = hero.match(/<h[12][^>]*>(.*?)<\/h[12]>/)?.[1]?.replace(/<[^>]+>/g, '').trim();
    const description = hero.match(/<p(?: class="lead")?>(.*?)<\/p>/g)?.at(-1)?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    assert.ok(title && title.split(/\s+/).length <= 5, `Hero title exceeds five words: ${title}`);
    assert.ok(description && description.split(/\s+/).length <= 25, `Hero description exceeds twenty-five words: ${description}`);
  }
});
