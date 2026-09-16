import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(".");

test("Task 6.1: Church Directory cards and profile include 'View Location on Map' triggers", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const churchProfileHtml = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");

  // Church cards have View Location on Map button calling MWE.showMapModal
  assert.match(appJs, /class="immersive-map-btn"/, "app.js should define immersive-map-btn");
  assert.match(appJs, /MWE\.showMapModal\(/, "church card should invoke MWE.showMapModal");
  assert.match(appJs, /View Location on Map/, "button label should say View Location on Map");

  // Church profile tabs: Location & Map tab is reinstated per user requirements
  assert.match(churchProfileHtml, /data-tab="location"/, "church-profile.html should have location tab");
  assert.match(churchProfileHtml, /id="tab-pane-location"/, "church-profile.html should have location tab pane");
  assert.match(churchProfileHtml, /class="profile-location-showcase"/, "profile should have location showcase");
  assert.match(churchProfileHtml, /class="profile-location-photo-card"/, "profile should have location photo card");
  assert.match(churchProfileHtml, /class="profile-on-map-card"/, "profile should have on-map marker card");
  assert.match(churchProfileHtml, /data-profile-map-photo/, "profile should bind church photo to map showcase");

  // CSS styles exist
  assert.match(stylesCss, /\.cpc-modal-photo-hero/, "styles.css should style modal photo hero");
  assert.match(stylesCss, /\.cpc-marker-card/, "styles.css should style on-map marker card");
  assert.match(stylesCss, /\.cpc-marker-card-thumb/, "styles.css should style on-map marker thumbnail");
  assert.match(stylesCss, /\.immersive-map-btn/, "styles.css should style immersive-map-btn");
  assert.match(stylesCss, /\.profile-location-showcase/, "styles.css should style profile-location-showcase");
});

test("Task 6.2: MWE.showMapModal displays the actual church photo in modal hero and on-map marker card", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  // Setup DOM mock in VM
  const domElements = new Map();
  function createElement(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      id: "",
      className: "",
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(" "); },
        remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(" "); },
        contains(c) { return this.classes.has(c); }
      },
      innerHTML: "",
      style: {},
      children: [],
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      setAttribute: () => {},
      getAttribute: () => null
    };
    return el;
  }

  const documentMock = {
    documentElement: { dataset: {} },
    body: {
      style: {},
      appendChild(child) {
        if (child.id) domElements.set(child.id, child);
      },
      dataset: {}
    },
    createElement,
    getElementById(id) {
      return domElements.get(id) || null;
    },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };

  const sandbox = {
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { search: "" },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    },
    document: documentMock,
    navigator: {
      clipboard: {
        writeText: async () => {}
      }
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    showToast: () => {},
    console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    Event: class {}
  };
  sandbox.window.document = documentMock;

  vm.createContext(sandbox);
  vm.runInContext(appJs.slice(appJs.indexOf("const MWE = (() => {"), appJs.indexOf("/* My Way member experience")), sandbox);

  const MWE = sandbox.window.MWE;
  assert.ok(MWE, "window.MWE should be defined");
  assert.equal(typeof MWE.showMapModal, "function", "MWE.showMapModal must be a function");
  assert.equal(typeof MWE.closeMapModal, "function", "MWE.closeMapModal must be a function");

  const churches = MWE.getChurches();
  assert.ok(churches.length > 0, "Churches must be loaded");
  const testChurch = churches[0];
  assert.ok(testChurch.photo, "Church must have a photo URL");

  // Invoke showMapModal for the test church
  MWE.showMapModal(testChurch.id);

  const modal = documentMock.getElementById("cpc-map-modal");
  assert.ok(modal, "Modal element #cpc-map-modal should be created");
  assert.ok(modal.classList.contains("open"), "Modal should have 'open' class");

  // Verify modal contains the actual church photo in the hero section
  const escapedPhoto = testChurch.photo.replace(/&/g, "&amp;");
  assert.ok(
    modal.innerHTML.includes(escapedPhoto) || modal.innerHTML.includes(testChurch.photo),
    "Map modal must contain the actual church photo URL"
  );
  assert.ok(
    modal.innerHTML.includes("cpc-modal-photo-hero"),
    "Map modal must render the cpc-modal-photo-hero banner"
  );

  // Verify modal contains the on-map interactive marker with photo thumbnail
  assert.ok(
    modal.innerHTML.includes("cpc-marker-card-thumb"),
    "Map modal must include cpc-marker-card-thumb for the marker photo thumbnail"
  );
  assert.ok(
    modal.innerHTML.includes("cpc-map-marker-overlay"),
    "Map modal must include cpc-map-marker-overlay on top of the map"
  );

  // Verify church details are rendered
  assert.ok(modal.innerHTML.includes(testChurch.name), "Modal must contain church name");
  assert.ok(modal.innerHTML.includes(testChurch.location), "Modal must contain church address");

  // Test closeMapModal
  MWE.closeMapModal();
  assert.ok(!modal.classList.contains("open"), "Modal should not have 'open' class after closeMapModal");
});

test("Task 6.3: Fallback and directions sharing integration", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  const domElements = new Map();
  const documentMock = {
    documentElement: { dataset: {} },
    body: { style: {}, appendChild(child) { if (child.id) domElements.set(child.id, child); }, dataset: {} },
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      innerHTML: "",
      style: {},
      addEventListener: () => {}
    }),
    getElementById: (id) => domElements.get(id) || null,
    querySelectorAll: () => [],
    querySelector: () => null
  };

  let copiedText = "";
  const sandbox = {
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { search: "" },
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    },
    document: documentMock,
    navigator: {
      clipboard: {
        writeText: async (text) => { copiedText = text; }
      }
    },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    showToast: () => {},
    console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    Event: class {}
  };
  sandbox.window.document = documentMock;

  vm.createContext(sandbox);
  vm.runInContext(appJs.slice(appJs.indexOf("const MWE = (() => {"), appJs.indexOf("/* My Way member experience")), sandbox);

  const MWE = sandbox.window.MWE;
  assert.equal(typeof MWE.fallbackCopyDirections, "function");

  // Test fallback copy
  MWE.fallbackCopyDirections("10025 106 St, Edmonton, AB");
  assert.ok(copiedText.includes("10025 106 St, Edmonton, AB"), "Clipboard must receive address");
});
