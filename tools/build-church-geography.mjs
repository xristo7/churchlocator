import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

// Use full country extracts, not a population-limited sample of major cities.
const input = resolve(process.argv[2] || '.wrangler/geography');
const countries = {};
const populatedPlaceCodes = new Set(['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5', 'PPLC', 'PPLG', 'PPLL', 'PPLS', 'STLMT']);
for (const [code, country] of [['CA', 'Canada'], ['US', 'United States'], ['GB', 'United Kingdom']]) {
  const names = new Set();
  const lines = createInterface({ input: createReadStream(resolve(input, code, `${code}.txt`)), crlfDelay: Infinity });
  for await (const line of lines) {
    const fields = line.split('\t');
    if (fields[6] === 'P' && fields[8] === code && populatedPlaceCodes.has(fields[7]) && fields[1]?.trim()) {
      names.add(fields[1].trim());
    }
  }
  if (!names.size) throw new Error(`No populated places found for ${code}; existing output was preserved.`);
  countries[country] = [...names].sort((a, b) => a.localeCompare(b, 'en'));
  console.log(`${country}: ${names.size} distinct city/town names`);
}
const data = {
  source: 'GeoNames',
  sourceUrl: 'https://download.geonames.org/export/dump/',
  license: 'CC BY 4.0',
  generatedAt: new Date().toISOString(),
  scope: 'Current populated places in the full CA, US and GB country extracts; includes cities, towns and villages. Historical, abandoned and destroyed settlements and city subdivisions are excluded. Names repeated within a country are combined.',
  countries
};
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/church-cities.json', import.meta.url), JSON.stringify(data) + '\n');
