import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const read = file => fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("event detail styling is generated locally and does not depend on the blocked Tailwind CDN", async () => {
  const [html, css, config, pkg, app] = await Promise.all([
    read("public/event-profile.html"),
    read("public/event-profile-tailwind.css"),
    read("tailwind.event.config.cjs"),
    read("package.json"),
    read("public/app.js")
  ]);

  assert.match(html, /event-profile-tailwind\.css\?v=20261007eventstyles1/);
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
  assert.match(config, /\.\/public\/event-profile\.html/);
  assert.match(JSON.parse(pkg).scripts["build:events-css"], /tailwindcss/);
  assert.match(css, /\.grid\{/);
  assert.match(css, /\.rounded-2xl\{/);
  assert.match(css, /\.bg-brand-500/);
  assert.match(app, /coverImg\.onerror\s*=\s*\(\)\s*=>/);
  assert.match(app, /\/assets\/demo-event-worship-night\.png/);
});
