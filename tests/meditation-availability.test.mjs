import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledMeditationTemplates, isMeditationRoomEnabled } from '../public/meditation-availability.js';
import { validateEntity } from '../src/trusted-platform.js';
import { handleMeditationSession } from '../src/meditation-session.js';

test('only countdown rooms are temporarily enabled, including legacy defaults', () => {
  assert.deepEqual(enabledMeditationTemplates, ['timer']);
  assert.equal(isMeditationRoomEnabled({}), true);
  assert.equal(isMeditationRoomEnabled({template:'timer'}), true);
  assert.equal(isMeditationRoomEnabled({id:'room-healing'}), false);
  for (const template of ['ripple','journey','nature','sunburst','unknown']) assert.equal(isMeditationRoomEnabled({template}), false);
});
test('paused templates cannot be saved, and enabled music selections are preserved', () => {
  for (const template of ['ripple','journey','nature','sunburst']) {
    assert.throws(() => validateEntity('meditation', {title:'Preserved room', template}), /temporarily paused/);
  }
  const room = validateEntity('meditation', {title:'Timer', template:'timer', soundcloud:{url:'https://soundcloud.com/creator/instrumental'}});
  assert.equal(room.soundcloud.url, 'https://soundcloud.com/creator/instrumental');
});
test('existing paused room sessions are blocked without writing to the database', async () => {
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => ({data_json:JSON.stringify({template:'ripple'})}) }) }) } };
  await assert.rejects(handleMeditationSession(new Request('https://example.test/api/meditation-session/paused-room'),env,{}),/temporarily paused/);
});
