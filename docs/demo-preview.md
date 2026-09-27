# Preview demo dataset

The preview D1 database is populated by `database/demo-preview-seed.sql`.

All demo accounts use the password `DemoMyWayPreview2026!`:

- `rivercity@demo.myway.test` — River City Fellowship Admin
- `grace@demo.myway.test` — Grace Stories Studio
- `harbor@demo.myway.test` — Harbor Light Ministries

The seed includes published churches, events, stores, products, resources, meditation rooms, channels, and Spotlight items. It is intentionally scoped to the preview database; production remains separate and untouched.

## Meditation demo rooms

Each sanctuary template is represented by a published room owned through a real demo user, tenant, and owner membership:

| Room | Template | Account owner | Feature focus |
| --- | --- | --- | --- |
| Be Still and Abide | Timer | `grace@demo.myway.test` | Countdown, scripture auto-play, multi-track audio |
| Jesus, Give Me Peace | Ripple | `grace@demo.myway.test` | Breath prayer, living-water ambience, live comments |
| Night Watch Prayer Journey | Journey | `rivercity@demo.myway.test` | Four guided prayer stages, dark sanctuary |
| Quiet Waters for the Journey | Nature | `harbor@demo.myway.test` | Nature teaching, scripture carousel, live comments |
| Joy Comes with the Morning | Sunburst | `rivercity@demo.myway.test` | Praise prompts, worship playlist, live comments |

The comment-enabled rooms also include sample discussion messages from the demo accounts so host attribution, participant identity, and database persistence are visible immediately.

Preview app: `https://my-way-of-evangelism-preview.doxalight-inc.workers.dev`

To reapply after migrations:

```powershell
pnpm run db:migrate:preview
pnpm run db:seed:demo:preview
```
