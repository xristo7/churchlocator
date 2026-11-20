import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const playwright = await import(process.env.PLAYWRIGHT_PATH || '/opt/codex/cua_node/lib/node_modules/playwright/index.js');
const chromium = playwright.chromium || playwright.default.chromium;
const base = process.env.BASE_URL || 'http://127.0.0.1:8787';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const results = [];
try {
  for (const width of [1440, 390]) for (const state of ['member', 'guest', 'unavailable', 'disabled']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    if (state === 'member' || state === 'disabled') {
      const response = await context.request.post(base + '/api/auth/register', { data: {
        name: 'Comment session test', email: `comment-${crypto.randomUUID()}@example.test`, password: 'Local-check-only-94!'
      } });
      assert.equal(response.status(), 201);
      assert.ok((await (await context.request.get(base + '/api/auth/session')).json()).user);
    }
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let releaseSession;
    const pendingSession = new Promise(resolve => { releaseSession = resolve; });
    await page.route('**/api/auth/session', async route => {
      await pendingSession;
      if (state === 'unavailable') return route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } });
      return route.continue();
    });
    const comments = [];
    let submissions = 0;
    await page.route('**/api/spotlight/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/item/')) return route.fulfill({ json: { ok: true, item: {
        id: 'comment-session-fixture', title: 'Comment session check', creatorName: 'Test publisher',
        fullContentUrl: '', permalink: '/channel-content.html?post=comment-session-fixture', commentsEnabled: state !== 'disabled'
      } } });
      if (url.pathname.includes('/engagement/')) {
        const body = route.request().postDataJSON();
        assert.equal(body.action, 'comment');
        assert.equal(body.body, 'A signed-in comment.');
        submissions++;
        comments.push({ author: 'Comment session test', body: body.body });
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { ok: true, items: [], comments } });
    });
    await page.goto(base + '/channel-content.html?embed=1&post=comment-session-fixture', { waitUntil: 'domcontentloaded' });
    await page.locator('.mwe-watch').waitFor();
    const player = await page.locator('[data-player-host]').elementHandle();
    assert.equal(await page.locator('[data-signin-comment]').count(), 0, 'No false sign-in prompt while session is pending');
    if (state !== 'disabled') await page.getByRole('status').filter({ hasText: 'Checking your session' }).waitFor();
    releaseSession();
    if (state === 'member') {
      await page.locator('.mwe-comment-form').waitFor();
      assert.equal(await page.locator('[data-signin-comment]').count(), 0);
      await page.locator('[name=comment]').fill('A signed-in comment.');
      await page.getByRole('button', { name: 'Post comment', exact: true }).click();
      await page.locator('[data-post-comments]').getByText('A signed-in comment.', { exact: true }).waitFor();
      assert.equal(submissions, 1);
      assert.equal(await page.locator('[name=comment]').inputValue(), '');
    } else if (state === 'guest') {
      await page.locator('[data-signin-comment]').waitFor();
      assert.equal(await page.locator('.mwe-comment-form').count(), 0);
      await page.locator('[data-signin-comment]').click();
      await page.locator('#member-auth-modal').waitFor();
    } else if (state === 'unavailable') {
      await page.locator('[data-session-retry]').waitFor();
      assert.equal(await page.locator('[data-signin-comment]').count(), 0);
      assert.equal(await page.locator('.mwe-comment-form').count(), 0);
    } else {
      await page.locator('.mwe-comments-disabled').waitFor();
      assert.equal(await page.locator('[data-comment-compose]').count(), 0);
    }
    assert.ok(await player.evaluate(element => element === document.querySelector('[data-player-host]')), 'Session resolution preserves the player');
    assert.deepEqual(errors, []);
    results.push({ width, state, submissions });
    await context.close();
  }
  mkdirSync('/workspace/audits/comment-session', { recursive: true });
  writeFileSync('/workspace/audits/comment-session/results.json', JSON.stringify(results, null, 2));
  console.log('PASS 8 desktop/mobile checks: real member sessions, submit, guests, delayed/failed sessions and disabled comments; player preserved.');
} finally { await browser.close(); }
