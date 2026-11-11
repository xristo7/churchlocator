import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateEntity } from '../src/trusted-platform.js';
import { itemRecord } from '../src/spotlight.js';

// Brief 07/08/09: Plan Your Day, Words of Wisdom and Gloryyy.
const channel = { name: 'OPERATION NO TIME (ONT)', owner: 'Owner', handle: '@ont', topic: 'Bible Teaching', description: 'Today', format: 'Video' };

test('a channel post keeps every media link the owner saves', () => {
  const post = { title: 'PLAN YOUR DAY', summary: 'Goals', mediaUrl: 'https://youtu.be/r4vMN-ckXMo?si=sT_NCBM5vqKLF0op', embedUrl: 'https://www.youtube.com/embed/r4vMN-ckXMo', url: 'https://youtu.be/r4vMN-ckXMo' };
  const saved = validateEntity('channels', { ...channel, posts: [post] });
  assert.equal(saved.posts[0].mediaUrl, post.mediaUrl);
  assert.equal(saved.posts[0].embedUrl, post.embedUrl);
  assert.equal(saved.posts[0].url, post.url);
});

test('an insecure post media link is rejected instead of silently dropped', () => {
  assert.throws(() => validateEntity('channels', { ...channel, posts: [{ title: 'x', mediaUrl: 'http://youtu.be/abc' }] }), { status: 400 });
});

test('Creator Studio warns before publishing a channel post without media', () => {
  const studio = readFileSync(new URL('../public/creator-studio.js', import.meta.url), 'utf8');
  assert.match(studio, /function mediaLessPostsBlock/);
  assert.match(studio, /if\(mediaLessPostsBlock\(publicationState,message\)\)return;/);
  assert.match(studio, /select Publish again to publish without media/);
});

test('a Spotlight upload attributed to a channel opens that channel, not the church it mentions (Gloryyy)', () => {
  const row = { id: 'spotlight-1', channel_entity_id: 'channels-wow', subject_entity_id: 'churches-glory-kingdom', content_type: 'short', full_content_url: '/media/spotlight-media/0a1b2c3d-4e5f-6789-abcd-ef0123456789.mp4' };
  assert.equal(itemRecord(row).channelUrl, '/channels/channels-wow');
  assert.match(itemRecord(row).contentUrl, /channels-wow/);
});

function loadMediaKind() {
  const page = readFileSync(new URL('../public/channel-content.js', import.meta.url), 'utf8');
  const pick = (name) => { const start = page.indexOf('  function ' + name + '('); return page.slice(start, page.indexOf('\n  }\n', start) + 4); };
  return new Function(pick('isHttpsUrl') + pick('youtubeId') + pick('mediaKind') + '; return mediaKind;')();
}

test('the watch page plays videos uploaded through Spotlight or a channel (Gloryyy showed "not supplied")', () => {
  const mediaKind = loadMediaKind();
  assert.equal(mediaKind('/media/spotlight-media/1a91e70f-395e-4916-b25d-2b0562714c79.mp4'), 'video');
  assert.equal(mediaKind('/media/spotlight-media/737b0546-5b07-413e-a7af-f9221e346e02.webm'), 'video');
  assert.equal(mediaKind('/media/church-video/0a1b2c3d-4e5f-6789-abcd-ef0123456789.mp4'), 'video');
  assert.equal(mediaKind('https://youtu.be/r4vMN-ckXMo?si=sT_NCBM5vqKLF0op'), 'youtube');
  assert.equal(mediaKind('/media/spotlight-media/../secret.mp4'), 'none');
  assert.equal(mediaKind('/media/creator-media/1a91e70f-395e-4916-b25d-2b0562714c79.mp4'), 'none');
  assert.equal(mediaKind(''), 'none');
});
