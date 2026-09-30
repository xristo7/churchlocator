import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Spotlight is a first-class responsive member route', async () => {
  const [app, shell, page, script, styles] = await Promise.all([
    read('public/app.html'), read('public/app-shell.js'), read('public/spotlight.html'),
    read('public/spotlight.js'), read('public/spotlight.css')
  ]);
  assert.match(app, /data-shell-view="spotlight"/);
  assert.match(shell, /spotlight:\s*\{ source: "spotlight\.html"/);
  assert.match(page, /id="spotlight-feed"/);
  assert.match(page, /id="spotlight-inspector"/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /long-preview/);
  assert.match(script, /previewSource/);
  assert.match(styles, /scroll-snap-type:\s*y mandatory/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});

test('Spotlight derives its visual identity from the theme system', async () => {
  const styles = await read('public/spotlight.css');
  for (const token of ['--primary-h', '--primary-s', '--primary-l', '--primary-gradient', '--primary-glow', '--gold-rgb', '--gold-glow', '--background', '--surface', '--border']) {
    assert.match(styles, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(styles, /--spotlight-canvas:\s*var\(--surface-canvas\)/);
  assert.match(styles, /--spotlight-panel:\s*var\(--surface\)/);
  assert.match(styles, /\.spotlight-card\s*\{[^}]*color:\s*#fff/s);
  assert.doesNotMatch(styles, /#[0-9a-f]{6}\s*!important/i);
});

test('Spotlight backend provides feed, creator, moderation, engagement and comments routes', async () => {
  const [worker, handler, migration] = await Promise.all([
    read('src/worker.js'), read('src/spotlight.js'), read('migrations/0006_spotlight.sql')
  ]);
  assert.match(worker, /handleSpotlightApi/);
  assert.match(handler, /scope === 'feed'/);
  assert.match(handler, /scope === 'workspace'/);
  assert.match(handler, /scope === 'admin'/);
  assert.match(handler, /scope === 'engagement'/);
  assert.match(handler, /scope === 'comments'/);
  assert.match(handler, /requireOwner/);
  assert.match(handler, /verifyChannel/);
  assert.match(migration, /create table spotlight_items/);
  assert.match(migration, /create table spotlight_engagements/);
  assert.match(migration, /create table spotlight_comments/);
});

test('Spotlight automatically blends randomized published church and channel covers', async () => {
  const [handler, client] = await Promise.all([
    read('src/spotlight.js'), read('public/spotlight.js')
  ]);
  assert.match(handler, /state='published' and kind in \('churches','channels'\)/);
  assert.match(handler, /function automaticProfileItem/);
  assert.match(handler, /function blendAutomaticProfiles/);
  assert.match(handler, /crypto\.getRandomValues/);
  assert.match(handler, /isAutomaticProfile:\s*true/);
  assert.match(client, /Live profile/);
  assert.match(client, /id:target\.searchParams\.get\('id'\)/);
  assert.match(client, /commentForm\.hidden = item\.isAutomaticProfile/);
});

test('Spotlight plays approved YouTube excerpts inside the scrolling feed', async () => {
  const [page, client, styles, headers] = await Promise.all([
    read('public/spotlight.html'), read('public/spotlight.js'),
    read('public/spotlight.css'), read('public/_headers')
  ]);
  assert.match(client, /function youtubeId/);
  assert.match(client, /www\.youtube-nocookie\.com\/embed/);
  assert.match(client, /data-youtube-src/);
  assert.match(client, /youtubeFrame\.removeAttribute\('src'\)/);
  assert.match(client, /target="_blank" rel="noopener"/);
  assert.match(styles, /\.spotlight-youtube-frame/);
  assert.match(headers, /frame-src[^\n]*youtube-nocookie\.com/);
  assert.match(page, /spotlight\.js\?v=20260929youtube1/);
});

test('Spotlight comments never substitute demo conversations when the API is unavailable', async () => {
  const script = await read('public/spotlight.js');
  assert.match(script, /api\('comments\/\'/);
  assert.match(script, /Comments are unavailable\./);
  assert.doesNotMatch(script, /fallbackComments|fallbackItems/);
});

test('creator and owner workspaces expose Spotlight submission and moderation', async () => {
  const [admin, workspace, owner, creator] = await Promise.all([
    read('public/admin-workspace.js'), read('public/spotlight-workspace.js'),
    read('public/owner-dashboard.html'), read('public/creator-workspace.html')
  ]);
  assert.match(admin, /entry\("spotlight", "Spotlight"/);
  assert.match(workspace, /Submit to Spotlight/);
  assert.match(workspace, /Automatic first 60s/);
  assert.match(workspace, /Save moderation decision/);
  assert.match(owner, /spotlight-workspace\.js/);
  assert.match(creator, /spotlight-workspace\.js/);
});

test('Spotlight has a dedicated creator Studio using the canonical workspace workflow', async () => {
  const [page, studio, shell, creator, workspace] = await Promise.all([
    read('public/spotlight-studio.html'), read('public/spotlight-studio.js'),
    read('public/app-shell.js'), read('public/creator-studio.js'), read('public/spotlight-workspace.js')
  ]);
  assert.match(page, /data-page="spotlight-studio"/);
  assert.match(page, /spotlight-workspace\.js/);
  assert.match(studio, /MWESpotlightWorkspace\?\.render/);
  assert.match(studio, /Create a Spotlight story/);
  assert.match(shell, /"spotlight-studio":\s*\{ source: "spotlight-studio\.html"/);
  assert.match(creator, /href="app\.html\?view=spotlight-studio"/);
  assert.match(workspace, /\/api\/media\/upload/);
  assert.match(workspace, /Save draft/);
  assert.match(workspace, /Submit for review/);
});
