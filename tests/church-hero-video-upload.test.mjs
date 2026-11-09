import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateEntity } from '../src/trusted-platform.js';

const base = { name: 'Local church', city: 'Toronto', country: 'CA' };

test('a phone video uploaded to platform storage is accepted as the church hero video', () => {
  const own = '/media/spotlight-media/0a1b2c3d-4e5f-6789-abcd-ef0123456789.mp4';
  assert.equal(validateEntity('churches', { ...base, welcomeMedia: own }).welcomeMedia, own);
  assert.equal(validateEntity('churches', { ...base, welcomeMedia: '/media/spotlight-media/0a1b2c3d-4e5f-6789-abcd-ef0123456789.webm' }).welcomeMedia.endsWith('.webm'), true);
});

test('other relative or insecure hero video links are still rejected', () => {
  for (const bad of ['/media/spotlight-media/x.mp4', '/media/church-video/..%2Fa.mp4', '/assets/clip.mp4', 'http://example.test/a.mp4', '/media/spotlight-media/0a1b2c3d-4e5f-6789-abcd-ef0123456789.jpg'])
    assert.throws(() => validateEntity('churches', { ...base, welcomeMedia: bad }), { status: 400 }, bad);
});

test('the church editor lets an owner upload a phone video into the video slide', () => {
  const script = readFileSync(new URL('../public/creator-studio.js', import.meta.url), 'utf8');
  assert.match(script, /data-hero-video-picker/);
  assert.match(script, /\/api\/spotlight\/upload/);
  assert.match(script, /95\*1024\*1024/);
  assert.match(script, /bindHeroVideo\(form\)/);
});
