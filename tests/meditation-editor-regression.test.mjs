import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/creator-studio.js', import.meta.url), 'utf8');
const requiredFields = source.match(/  function requiredFields\(\) \{[^\n]+/)[0];
const common = [['title', 'Title', 'text', true], ['durationMinutes', 'Duration', 'number', true], ['selectedAudio', 'Audio', 'select', true]];
function fields(template) {
  const root = { querySelector: () => ({ value: template }) };
  const kinds = { meditation: { sections: [['Identity', '', common], ['Design', '', []]] } };
  return new Function('root', 'kinds', 'activeKind', `${requiredFields}; return requiredFields();`)(root, kinds, 'meditation');
}

test('meditation readiness counts each required value once for every style', () => {
  for (const style of ['timer', 'ripple', 'journey', 'nature', 'sunburst']) {
    const keys = fields(style).map(([key]) => key);
    assert.equal(keys.length, new Set(keys).size, style);
    assert.equal(keys.filter(key => key === 'durationMinutes').length, 1);
  }
});
test('meditation readiness follows the selected style and its editable fields', () => {
  assert.ok(fields('ripple').some(([key]) => key === 'inhaleWord'));
  assert.ok(fields('journey').some(([key]) => key === 'journeyPrompt3'));
  assert.ok(fields('nature').some(([key]) => key === 'ambienceRain'));
  assert.ok(fields('sunburst').some(([key]) => key === 'icon'));
  assert.ok(!fields('timer').some(([key]) => key === 'inhaleWord'));
});
