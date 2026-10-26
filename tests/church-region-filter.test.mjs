import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const catalog = JSON.parse(await readFile(new URL('../public/data/church-cities.json', import.meta.url), 'utf8'));

function setup(countries = catalog.countries, failGeography = false) {
  const nodes = new Map();
  const events = new Map();
  let frame;
  const unescape = text => text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  for (const id of ['church-country-options-list', 'church-city-options-list', 'church-denomination-options-list', 'church-city-option-search', 'church-city-options-status', 'church-city-show-more', 'grid', 'search']) {
    nodes.set(id, {
      value: '', inputs: [], events: {}, hidden: false,
      addEventListener(event, handler) { this.events[event] = handler; },
      querySelectorAll(selector) { return this.inputs.filter(input => !selector.includes(':checked') || input.checked); },
      set innerHTML(html) {
        this.html = html;
        this.inputs = [...html.matchAll(/<input\b([^>]+)>/g)].map(([, attributes]) => ({
          value: unescape(attributes.match(/value="([^"]*)"/)?.[1] || ''),
          checked: /\bchecked\b/.test(attributes)
        }));
      },
      get innerHTML() { return this.html || ''; }
    });
  }
  const document = {
    body: { dataset: {} },
    getElementById: id => nodes.get(id) || null,
    querySelector: selector => selector === '[data-church-grid]' ? nodes.get('grid') : selector === '[data-search]' ? nodes.get('search') : null,
    querySelectorAll(selector) {
      if (selector.includes(',')) return ['church-country-options-list', 'church-city-options-list', 'church-denomination-options-list'].flatMap(id => nodes.get(id).inputs);
      const group = selector.includes('church-country-pill') ? 'church-country-options-list' : selector.includes('church-city-pill') ? 'church-city-options-list' : 'church-denomination-options-list';
      return nodes.get(group).querySelectorAll(selector);
    }
  };
  const context = vm.createContext({
    window: { document, location: { href: 'http://localhost/churches.html' }, addEventListener: (event, handler) => events.set(event, handler) },
    document, location: { href: 'http://localhost/churches.html' },
    localStorage: { getItem: () => null, removeItem() {} },
    URL, URLSearchParams, console,
    fetch: async () => ({ ok: !failGeography, json: async () => ({ countries }) }),
    requestAnimationFrame: callback => { frame = callback; return 1; }, cancelAnimationFrame() {},
    createIcons() {}, churchCard: church => `<article>${church.name}</article>`
  });
  vm.runInContext(source.slice(source.indexOf('const MWE = (() => {'), source.indexOf('/* RhemaSphere member experience')), context);
  const mwe = context.window.MWE;
  const seeds = mwe.getChurches();
  mwe.updatePillState = () => {};
  vm.runInContext(source.slice(source.indexOf('async function initPublicSite()'), source.indexOf('MWE.formatHeroDescription')), context);
  vm.runInContext(source.slice(source.indexOf('MWE.resetChurchPillFilters ='), source.indexOf('MWE.onEventPillChange =')), context);
  let churches = [];
  mwe.getChurches = () => churches.map(mwe.normalizeChurch);
  return {
    mwe, nodes, seeds,
    async init(records) { churches = records; await context.initPublicSite(); },
    render() { mwe.triggerChurchSearch(); const callback = frame; frame = null; callback(); },
    refresh(records) { churches = records; events.get('mwe-platform-ready')(); const callback = frame; frame = null; callback(); },
    region(...names) { for (const input of nodes.get('church-country-options-list').inputs) input.checked = names.includes(input.value); this.render(); },
    city(name) { const input = nodes.get('church-city-options-list').inputs.find(input => input.value === name); assert.ok(input, `${name} must be selectable`); input.checked = true; this.render(); },
    citySearch(value) { nodes.get('church-city-option-search').value = value; nodes.get('church-city-option-search').events.input(); const callback = frame; frame = null; callback(); }
  };
}

test('country aliases resolve to Canada, US and UK consistently', () => {
  const { mwe } = setup();
  for (const alias of ['CA', 'CAN', 'Canada']) assert.equal(mwe.normalizeCountry(alias), 'Canada');
  for (const alias of ['US', 'USA', 'U.S.A.', 'United States of America']) assert.equal(mwe.normalizeCountry(alias), 'United States');
  for (const alias of ['UK', 'GB', 'GBR', 'United Kingdom', 'England', 'Scotland', 'Wales', 'Northern Ireland']) assert.equal(mwe.normalizeCountry(alias), 'United Kingdom');
});

test('the complete bundled country extracts include major and smaller locations', () => {
  for (const [country, names] of Object.entries(catalog.countries)) {
    assert.ok(names.length > 10000, country);
    assert.equal(new Set(names).size, names.length);
  }
  for (const city of ['Toronto', 'Ottawa', 'Montréal', 'Halifax', 'Victoria']) assert.ok(catalog.countries.Canada.includes(city), city);
  for (const city of ['Houston', 'Chicago', 'Seattle', 'Boston', 'Los Angeles']) assert.ok(catalog.countries['United States'].includes(city), city);
  for (const city of ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Cardiff', 'Belfast']) assert.ok(catalog.countries['United Kingdom'].includes(city), city);
});

