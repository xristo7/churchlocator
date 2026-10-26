import test from 'node:test';
import assert from 'node:assert/strict';
import { matchResource, slugify, normalizeResourceKey } from '../src/resources.js';

const rows = [
  { id: 'demo-resource-gospel-basics', data_json: JSON.stringify({ title: 'The Gospel: A Clear Foundation' }) },
  { id: 'demo-resource-romans', data_json: JSON.stringify({ title: 'Romans: Grace and Righteousness', slug: 'romans-study' }) },
  { id: 'abc123', data_json: JSON.stringify({ title: '30-Day Guided Prayer Journal' }) }
];

test('resource lookup matches by exact id', () => {
  assert.equal(matchResource(rows, 'demo-resource-romans').row.id, 'demo-resource-romans');
  assert.equal(matchResource(rows, 'abc123').row.id, 'abc123');
});
test('resource lookup matches by explicit slug, title slug and short id', () => {
  assert.equal(matchResource(rows, 'romans-study').row.id, 'demo-resource-romans');
  assert.equal(matchResource(rows, 'the-gospel-a-clear-foundation').row.id, 'demo-resource-gospel-basics');
  assert.equal(matchResource(rows, '30-day-guided-prayer-journal').row.id, 'abc123');
  assert.equal(matchResource(rows, 'gospel-basics').row.id, 'demo-resource-gospel-basics');
  assert.equal(matchResource(rows, encodeURIComponent('demo-resource-romans')).row.id, 'demo-resource-romans');
});
test('resource lookup returns null for unknown or unsafe keys', () => {
  assert.equal(matchResource(rows, 'nope'), null);
  assert.equal(matchResource(rows, ''), null);
  assert.equal(normalizeResourceKey('<script>'), '');
  assert.equal(slugify('Romans: Grace & Righteousness'), 'romans-grace-righteousness');
});
