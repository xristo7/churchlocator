import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { handleGeo } from '../src/worker.js';

const ctx = vm.createContext({});
vm.runInContext(await readFile(new URL('../public/geo-regions.js', import.meta.url), 'utf8'), ctx);
const G = ctx.MWEGeo;

test('regions are Canada, USA and UK with complete subdivisions', () => {
  assert.deepEqual([...G.REGIONS.map(r => r.code)], ['CA', 'US', 'GB']);
  assert.equal(G.region('CA').subdivisions.length, 13);
  assert.equal(G.region('US').subdivisions.length, 51);
  assert.ok(G.region('US').subdivisions.some(s => s.code === 'DC'));
  assert.deepEqual([...G.region('GB').subdivisions.map(s => s.name)], ['England', 'Scotland', 'Wales', 'Northern Ireland']);
  assert.deepEqual([...G.REGIONS.map(r => r.unit)], ['Province', 'State', 'Nation']);
});

test('country and subdivision aliases normalise', () => {
  for (const v of ['CA', 'can', 'Canada']) assert.equal(G.countryCode(v), 'CA');
  for (const v of ['US', 'USA', 'U.S.A.', 'United States', 'united states of america']) assert.equal(G.countryCode(v), 'US');
  for (const v of ['UK', 'GB', 'United Kingdom', 'Scotland']) assert.equal(G.countryCode(v), 'GB');
  assert.equal(G.countryCode('Nigeria'), '');
  assert.equal(G.subdivisionCode('CA', 'Alberta'), 'AB');
  assert.equal(G.subdivisionCode('Canada', 'ab'), 'AB');
  assert.equal(G.subdivisionCode('CA', 'Québec'), 'QC');
  assert.equal(G.subdivisionCode('USA', 'Texas'), 'TX');
  assert.equal(G.subdivisionCode('US', 'Washington DC'), 'DC');
  assert.equal(G.subdivisionCode('UK', 'Wales'), 'WLS');
  assert.equal(G.subdivisionCode('US', 'Alberta'), '');
});

test('state is inferred from fields, postal codes, address text and known cities', () => {
  assert.equal(G.churchLocation({ country: 'CA', province: 'Ontario', city: 'X' }).state, 'ON');
  assert.equal(G.churchLocation({ country: 'US', postal_code: '55401', city: 'Minneapolis' }).state, 'MN');
  assert.equal(G.churchLocation({ country: 'US', postal: '77002' }).state, 'TX');
  assert.equal(G.churchLocation({ country: 'CA', postal: 'T5J 0N3' }).state, 'AB');
  assert.equal(G.churchLocation({ country: 'UK', postal: 'BT1 1AA' }).state, 'NIR');
  assert.equal(G.churchLocation({ country: 'UK', postal: 'CF10 1AA' }).state, 'WLS');
  assert.equal(G.churchLocation({ country: 'UK', postal: 'M1 1AA' }).state, 'ENG');
  assert.equal(G.churchLocation({ country: 'Canada', location: '10 Main St, Halifax, NS B3H 1A1' }).state, 'NS');
  assert.equal(G.churchLocation({ country: 'Canada', city: 'Edmonton' }).state, 'AB');
  assert.equal(G.churchLocation({ country: 'UK', city: 'Glasgow' }).state, 'SCT');
});

test('filtering matches region, state and city (accent/case-insensitive) and cities are scoped', () => {
  const churches = [
    { name: 'a', country: 'CA', city: 'Edmonton' }, { name: 'b', country: 'Canada', city: 'calgary' },
    { name: 'c', country: 'CA', city: 'Toronto' }, { name: 'd', country: 'USA', city: 'Houston' },
    { name: 'e', country: 'UK', city: 'London' }, { name: 'f', country: 'CA', city: 'London', province: 'ON' }, { name: 'g', country: 'CA', city: 'Montréal' }
  ];
  const pick = f => churches.filter(c => G.matchesLocation(G.churchLocation(c), f)).map(c => c.name);
  assert.deepEqual(pick({}), ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.deepEqual(pick({ country: 'CA' }), ['a', 'b', 'c', 'f', 'g']);
  assert.deepEqual(pick({ country: 'CA', state: 'AB' }), ['a', 'b']);
  assert.deepEqual(pick({ country: 'CA', state: 'AB', city: 'CALGARY' }), ['b']);
  assert.deepEqual(pick({ country: 'GB', state: 'ENG', city: 'London' }), ['e']);
  assert.deepEqual(pick({ country: 'CA', state: 'ON', city: 'London' }), ['f']);
  assert.deepEqual(pick({ country: 'CA', state: 'QC', city: 'montreal' }), ['g']);
  assert.deepEqual([...G.citiesFor(churches, 'CA', 'AB')], ['calgary', 'Edmonton']);
  assert.deepEqual([...G.citiesFor(churches, 'CA', 'ON')], ['London', 'Toronto']);
});

test('distance helper and coordinates', () => {
  const d = G.distanceKm({ lat: 53.5461, lng: -113.4938 }, { lat: 51.0447, lng: -114.0719 });
  assert.ok(d > 270 && d < 290, String(d));
  assert.equal(G.coords({}), null);
  assert.deepEqual({ ...G.coords({ latitude: '1.5', longitude: '2' }) }, { lat: 1.5, lng: 2 });
});

test('/api/geo returns the edge location without coordinates and reverse-geocodes with them', async () => {
  const edge = await (await handleGeo({ url: 'https://x/api/geo', cf: { country: 'CA', regionCode: 'AB', city: 'Edmonton' } })).json();
  assert.equal(edge.source, 'edge'); assert.equal(edge.regionCode, 'AB');
  let called = '';
  const fake = async url => { called = url; return new Response(JSON.stringify({ address: { country_code: 'us', state: 'Texas', 'ISO3166-2-lvl4': 'US-TX', city: 'Houston' } })); };
  const gps = await (await handleGeo({ url: 'https://x/api/geo?lat=29.7604&lng=-95.3698', cf: {} }, fake)).json();
  assert.match(called, /nominatim\.openstreetmap\.org\/reverse/);
  assert.deepEqual([gps.source, gps.country, gps.regionCode, gps.city], ['gps', 'US', 'TX', 'Houston']);
  const bad = await (await handleGeo({ url: 'https://x/api/geo?lat=999&lng=0', cf: {} }, fake)).json();
  assert.equal(bad.source, 'edge');
});
