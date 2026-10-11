// Regression: a visible Spotlight link in the header of every page at 1280, 390 and 360px, signed out and signed in,
// and never in the member left rail. Run: BASE=https://... node tests/e2e/spotlight-header.e2e.mjs
// Needs puppeteer-core and Chrome (CHROME=/usr/bin/google-chrome). Exits non-zero on any failure.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer-core')).default; } catch { console.log('SKIP: puppeteer-core not installed'); process.exit(0); }
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const CB = 'cb=' + Date.now();
// Immersive / chrome-less views intentionally have no site header.
const SKIP = new Set(['spotlight', 'spotlight-studio', 'channel-live', 'broadcast', 'reset-password', 'resource-reader', 'live-setup']);
const PAGES = ['index', 'account-profile', 'account-security', 'admin', 'app', 'cart', 'channel-content', 'channel-detail', 'channels', 'checkout', 'church-portal',
  'church-profile', 'churches', 'creator-studio', 'creator-workspace', 'donate', 'event-profile', 'events', 'foundation', 'livestream', 'meditation', 'member-home',
  'messages', 'owner-dashboard', 'privacy', 'product-detail', 'resource-detail', 'resources', 'seller-dashboard', 'store', 'storefront'].filter(p => !SKIP.has(p));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const failures = []; const rows = [];
for (const width of [1280, 390, 360]) for (const signedIn of [false, true]) for (const page of PAGES) {
  const p = await browser.newPage();
  await p.setViewport({ width, height: width > 500 ? 800 : 844, isMobile: width < 500, hasTouch: width < 500 });
  if (signedIn) {
    await p.setRequestInterception(true);
    p.on('request', r => r.url().includes('/api/auth/session')
      ? r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, user: { id: 'local:qa@example.com', name: 'QA Tester', email: 'qa@example.com', role: 'member' } }) })
      : r.continue());
    await p.evaluateOnNewDocument(() => { localStorage.setItem('mwe.userLoggedIn', 'true'); localStorage.setItem('mwe.userEmail', 'qa@example.com'); });
  }
  try { await p.goto(`${BASE}/${page === 'index' ? '' : page}?${CB}`, { waitUntil: 'networkidle2', timeout: 45000 }); } catch {}
  await new Promise(r => setTimeout(r, 1800));
  const res = await p.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && r.top < 120; };
    const links = [...document.querySelectorAll('header a, .topbar a, .profile-app-header a, .member-shell-header a, header button, .topbar button')]
      .filter(a => /spotlight/i.test((a.getAttribute('href') || '') + ' ' + a.textContent) && vis(a));
    const rail = [...document.querySelectorAll('.profile-left-rail nav a, .member-shell-rail nav a, .profile-rail-nav a')].filter(a => /spotlight/i.test(a.textContent + (a.getAttribute('href') || '')) && a.getBoundingClientRect().width > 0);
    const hdr = document.querySelector('.profile-app-header, .member-shell-header, .topbar');
    const headerH = hdr ? Math.round(hdr.getBoundingClientRect().height) : 0;
    const overflow = document.documentElement.scrollWidth > innerWidth + 1;
    return { header: links.length, rail: rail.length, headerH, overflow, url: location.pathname };
  });
  const ok = res.header > 0 && res.rail === 0 && (width > 500 || (res.headerH <= 72 && !res.overflow));
  rows.push(`${ok ? 'PASS' : 'FAIL'} ${width} ${signedIn ? 'in ' : 'out'} ${page} header=${res.header} rail=${res.rail} h=${res.headerH} overflow=${res.overflow} (${res.url})`);
  if (!ok) failures.push(rows.at(-1));
  await p.close();
}
await browser.close();
console.log(rows.join('\n'));
if (failures.length) { console.error(`\n${failures.length} failure(s)`); process.exit(1); }
console.log('\nAll pages show Spotlight in the header and not in the rail.');
