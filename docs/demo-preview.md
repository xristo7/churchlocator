# Preview demo dataset

The preview D1 database is populated by `database/demo-preview-seed.sql`.

All demo accounts use the password `DemoMyWayPreview2026!`:

- `rivercity@demo.myway.test` — River City Fellowship Admin
- `grace@demo.myway.test` — Grace Stories Studio
- `harbor@demo.myway.test` — Harbor Light Ministries

The seed includes published churches, events, stores, products, resources, meditation rooms, channels, and Spotlight items. It is intentionally scoped to the preview database; production remains separate and untouched.

Preview app: `https://my-way-of-evangelism-preview.doxalight-inc.workers.dev`

To reapply after migrations:

```powershell
pnpm run db:migrate:preview
pnpm run db:seed:demo:preview
```
