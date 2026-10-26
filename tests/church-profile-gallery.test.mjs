import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(".");

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
