# Church directory regions and cities

The Region filter always offers CANADA, US and UK. Other countries remain visible when published churches exist there. Country codes and common aliases are normalized to Canada, United States and United Kingdom; denomination options are unchanged.

City options combine the selected countries' bundled GeoNames locations with the cities of published churches. Changing regions clears previous city selections and the city option search. Name search ignores case and accents. The dropdown initially displays 100 matching names, with a Show more cities action; selected names stay visible during subsequent searches. Selecting several regions lists their combined cities. Reset clears the filters and the city option search.

Cities and towns are selectable even when no churches have been published there. These selections show the normal empty result; records from unrelated locations are never substituted. Publishing a church and refreshing the connected catalog makes its city and church discoverable.

## Source and coverage

The bundled `public/data/church-cities.json` is generated from the full [GeoNames country extracts](https://download.geonames.org/export/dump/) for CA, US and GB, downloaded on October 5, 2026. It contains 17,468 Canadian, 97,695 US and 29,371 UK distinct names. It includes cities, towns and villages without a minimum population cutoff. Historical, abandoned and destroyed settlements and city subdivisions are excluded. Repeated names within a country are combined, so filtering a shared name returns all published churches with that name in the selected country. Published church locations are added even if absent from the geographic dataset.

GeoNames is community-maintained and does not warrant completeness. This is broad current geographic coverage, not a guarantee of every legally designated city. Data is distributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the city dropdown includes attribution. The source format and terms are documented in the [GeoNames readme](https://download.geonames.org/export/dump/readme.txt).

## Refreshing the snapshot

From the repository root on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File tools/refresh-church-geography.ps1
node --test tests/church-region-filter.test.mjs
```

The refresh tool downloads the latest three country extracts into the ignored `.wrangler/geography` directory and rebuilds the committed JSON. It does not import churches or change any database. Review the generated JSON and deploy the static asset with the application. Geographic data is served locally with the app; visitors do not call GeoNames. If the city asset fails to load, the dropdown reports the failure and falls back to published church locations.
