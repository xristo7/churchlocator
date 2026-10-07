import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const read = file => fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Creator Studio content types use section-based steps with navigation and a shareable step URL", async () => {
  const [studio, html, styles] = await Promise.all([
    read("public/creator-studio.js"),
    read("public/creator-studio.html"),
    read("public/creator-studio.css")
  ]);

  assert.match(studio, /class="cs-step-list"/);
  assert.match(studio, /id="cs-step-previous"/);
  assert.match(studio, /id="cs-step-next"/);
  assert.match(studio, /url\.searchParams\.set\("step",String\(activeStep\)\)/);
  assert.match(studio, /section\.hidden=sectionIndex!==activeStep/);
  assert.match(studio, /indexOf\(missing\?\.closest\("\.cs-form-section"\)\)/);
  assert.match(studio, /renderStepFromHistory\?\.\(activeStep\)/);
  assert.match(studio, /config\.sections\.map\(\(\[title\],index\)=>/);
  assert.match(styles, /\.cs-form-section\[hidden\]\s*\{\s*display:none !important;/);
  assert.match(html, /creator-studio\.js\?v=20261007creatwizard2/);
  assert.match(html, /creator-studio\.css\?v=20261007creatwizard2/);
});
