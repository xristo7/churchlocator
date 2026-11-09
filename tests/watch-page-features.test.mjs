import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const script = readFileSync(new URL('../public/channel-content.js', import.meta.url), 'utf8');

test('watch page offers Ask (private, signed-in only), opt-in Download and a series filter', () => {
  assert.match(script, /data-ask-publisher/);
  assert.match(script, /\/api\/private\/message/);
  assert.match(script, /if \(askButton && !signedIn\) askButton\.remove\(\)/, 'Ask is hidden when signed out');
  assert.match(script, /item\.allowDownload && \/\^\\\/media\\\/spotlight-media/);
  assert.match(script, /data-related-tab="series" hidden/);
  assert.match(script, /seriesTitle = profile\?\.channel\?\.seriesTitle/);
});

test('opening a standalone watch page as a member keeps the post in the shell URL', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const build = app.slice(app.indexOf('MWE.buildMemberShellUrl'), app.indexOf('MWE.renderChurchMinistryChips'));
  assert.match(build, /route\.post\) target\.searchParams\.set\("post", route\.post\)/);
});
