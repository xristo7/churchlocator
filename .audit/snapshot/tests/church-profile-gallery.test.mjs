import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(".");

test("Church Profile: Slide gallery placement below Stories of Transformation", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  const storiesIndex = html.indexOf('class="stories-section');
  const galleryIndex = html.indexOf('id="church-gallery-section"');
  const salvationIndex = html.indexOf("Pray the Sinner's Prayer");

  assert.ok(storiesIndex !== -1, "stories-section should exist");
  assert.ok(galleryIndex !== -1, "church-gallery-section should exist");
  assert.ok(salvationIndex !== -1, "Salvation section should exist");

  assert.ok(
    storiesIndex < galleryIndex && galleryIndex < salvationIndex,
    "church-gallery-section must be placed below stories-section and above Salvation card"
  );

  assert.match(html, /class="church-gallery-heading"/, "should have gallery heading container");
  assert.match(html, /class="church-gallery-kicker"/, "should have gallery kicker");
  assert.match(html, /class="church-gallery-title"/, "should have gallery title");
  assert.match(html, /class="church-gallery-track"/, "should have gallery slide track");
  assert.match(html, /class="[^"]*gallery-prev-btn[^"]*"/, "should have previous slide button");
  assert.match(html, /class="[^"]*gallery-next-btn[^"]*"/, "should have next slide button");
  assert.match(html, /onclick="MWE\.scrollChurchGallery\(-1\)"/, "prev button should scroll gallery left");
  assert.match(html, /onclick="MWE\.scrollChurchGallery\(1\)"/, "next button should scroll gallery right");
});

test("Church Profile: Lightbox modal with popup mode navigation arrows", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  assert.match(html, /id="church-gallery-lightbox"/, "lightbox modal container should exist");
  assert.match(html, /class="church-lightbox-overlay"/, "lightbox overlay class should be present");
  assert.match(html, /class="church-lightbox-backdrop"/, "lightbox backdrop should be present");
  assert.match(html, /class="church-lightbox-close-btn"/, "lightbox close button should be present");
  assert.match(html, /onclick="MWE\.closeGalleryLightbox\(\)"/, "close button should trigger closeGalleryLightbox()");

  assert.match(html, /class="[^"]*lightbox-popup-prev[^"]*" id="lightbox-prev-btn"/, "popup mode must have prev arrow button");
  assert.match(html, /class="[^"]*lightbox-popup-next[^"]*" id="lightbox-next-btn"/, "popup mode must have next arrow button");
  assert.match(html, /MWE\.stepGalleryLightbox\(-1\)/, "popup prev arrow must trigger stepGalleryLightbox(-1)");
  assert.match(html, /MWE\.stepGalleryLightbox\(1\)/, "popup next arrow must trigger stepGalleryLightbox(1)");

  assert.match(html, /id="lightbox-active-img"/, "lightbox active image element should exist");
  assert.match(html, /id="lightbox-counter"/, "lightbox photo counter should exist");
  assert.match(html, /id="lightbox-caption-title"/, "lightbox title element should exist");
  assert.match(html, /id="lightbox-caption-desc"/, "lightbox description element should exist");
});

test("Church Profile: JS implementation for gallery, lightbox, and navigation controls", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  assert.match(appJs, /MWE\.renderChurchGallery\s*=\s*function/, "app.js must define MWE.renderChurchGallery");
  assert.match(appJs, /MWE\.openGalleryLightbox\s*=\s*function/, "app.js must define MWE.openGalleryLightbox");
  assert.match(appJs, /MWE\.closeGalleryLightbox\s*=\s*function/, "app.js must define MWE.closeGalleryLightbox");
  assert.match(appJs, /MWE\.stepGalleryLightbox\s*=\s*function/, "app.js must define MWE.stepGalleryLightbox");
  assert.match(appJs, /MWE\.scrollChurchGallery\s*=\s*function/, "app.js must define MWE.scrollChurchGallery");
  assert.match(appJs, /MWE\.handleLightboxKeydown\s*=\s*function/, "app.js must define MWE.handleLightboxKeydown");
  assert.match(appJs, /MWE\.getDefaultGalleryImages\s*=\s*function/, "app.js must define MWE.getDefaultGalleryImages");

  assert.match(appJs, /MWE\.renderChurchGallery\(church\)/, "renderProfile must invoke MWE.renderChurchGallery");

  assert.match(appJs, /id:\s*"christ-embassy-edmonton"[\s\S]*?gallery:\s*\[/, "christ-embassy should have gallery array");
  assert.match(appJs, /id:\s*"beulah-alliance-west"[\s\S]*?gallery:\s*\[/, "beulah-alliance should have gallery array");
});

test("Church Profile: CSS rules for slide gallery and lightbox navigation", async () => {
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");

  assert.match(stylesCss, /\.church-gallery-section/, "styles.css must style church-gallery-section");
  assert.match(stylesCss, /\.church-gallery-track/, "styles.css must style church-gallery-track");
  assert.match(stylesCss, /\.church-gallery-card/, "styles.css must style church-gallery-card");
  assert.match(stylesCss, /\.church-lightbox-overlay/, "styles.css must style church-lightbox-overlay");
  assert.match(stylesCss, /\.church-lightbox-nav-btn/, "styles.css must style church-lightbox-nav-btn");
  assert.match(stylesCss, /\.lightbox-popup-prev/, "styles.css must position popup prev arrow");
  assert.match(stylesCss, /\.lightbox-popup-next/, "styles.css must position popup next arrow");
});
