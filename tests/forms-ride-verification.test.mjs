import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(".");

test("Task 7.1: 'Plan a Visit' opens above the page backdrop and retains its universal fallback", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const churchProfileHtml = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");

  // Plan a Visit buttons exist in church-profile.html
  assert.match(churchProfileHtml, /onclick="MWE\.toggleVisitPanel\(true\)"/, "Plan a Visit button must call MWE.toggleVisitPanel(true)");
  assert.match(churchProfileHtml, /id="register"/, "church-profile.html must contain #register panel");
  assert.match(churchProfileHtml, /class="profile-ride-action"/, "church-profile.html should have ride action button");

  // MWE.toggleVisitPanel logic in app.js
  assert.match(appJs, /MWE\.toggleVisitPanel\s*=\s*function/, "MWE.toggleVisitPanel should be defined");
  assert.match(appJs, /panel\.parentElement\s*!==\s*document\.body[\s\S]*?document\.body\.appendChild\(panel\)/, "toggleVisitPanel must move the panel into the page-level overlay layer");
  assert.match(appJs, /panel\.scrollIntoView\(\s*\{\s*behavior:\s*"smooth"/, "toggleVisitPanel must scroll smoothly to #register");
  assert.match(appJs, /panel\.classList\.add\("panel-highlight-pulse"\)/, "toggleVisitPanel must add panel-highlight-pulse");
  assert.match(appJs, /MWE\.openPlanVisitModal/, "toggleVisitPanel must fallback to openPlanVisitModal when #register not found");

  // CSS animations and styles
  assert.match(stylesCss, /@keyframes panelPulseHighlight/, "styles.css must define panelPulseHighlight keyframes");
  assert.match(stylesCss, /\.panel-highlight-pulse/, "styles.css must define .panel-highlight-pulse");
});

test("Task 7.2: 2-Stage Ride Request system lifecycle (Stage 1 Phone/Text & Stage 2 Schedule/Driver)", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");

  // Verify function definitions in app.js
  assert.match(appJs, /MWE\.openRideModal\s*=\s*function/, "app.js must define MWE.openRideModal");
  assert.match(appJs, /MWE\.handleRideSubmit\s*=\s*function/, "app.js must define MWE.handleRideSubmit");
  assert.match(appJs, /MWE\.confirmRideStage1\s*=\s*function/, "app.js must define MWE.confirmRideStage1");
  assert.match(appJs, /MWE\.confirmRideSchedule\s*=\s*function/, "app.js must define MWE.confirmRideSchedule");
  assert.match(appJs, /MWE\.openRideConfirmationModal\s*=\s*function/, "app.js must define MWE.openRideConfirmationModal");

  // Verify CSS for 2-stage stepper and cards
  assert.match(stylesCss, /\.ride-stepper-tracker/, "styles.css must style .ride-stepper-tracker");
  assert.match(stylesCss, /\.ride-step-node/, "styles.css must style .ride-step-node");
  assert.match(stylesCss, /\.ride-step-circle/, "styles.css must style .ride-step-circle");
  assert.match(stylesCss, /\.ride-stage-card/, "styles.css must style .ride-stage-card");
  assert.match(stylesCss, /\.stage-num-pill/, "styles.css must style .stage-num-pill");
  assert.match(stylesCss, /html\[data-theme="dark"\]\s+\.ride-confirmation-panel/, "styles.css must have dark theme styles for ride confirmation");

  // Test functional execution in isolated VM context
  const mockStorage = new Map();
  const localStorageMock = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  };

  const createdElements = [];
  function createMockElement(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      id: "",
      className: "",
      innerHTML: "",
      style: {},
      children: [],
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(" "); },
        remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(" "); },
        contains(c) { return this.classes.has(c); },
        toggle(c, force) {
          if (force !== undefined) {
            if (force) this.add(c); else this.remove(c);
          } else {
            if (this.contains(c)) this.remove(c); else this.add(c);
          }
        }
      },
      scrollIntoView: () => { el._scrolled = true; },
      focus: () => { el._focused = true; },
      remove: () => {
        const idx = createdElements.indexOf(el);
        if (idx !== -1) createdElements.splice(idx, 1);
        if (el.id) delete documentMock._byId[el.id];
      },
      querySelectorAll: (sel) => {
        if (sel === "input[name='interests']:checked") {
          return [{ value: "first_visit" }];
        }
        return [];
      },
      querySelector: (sel) => {
        return null;
      },
      dispatchEvent: () => true,
      addEventListener: () => {}
    };
    createdElements.push(el);
    return el;
  }

  const documentMock = {
    _byId: {},
    documentElement: { dataset: {}, style: {}, setAttribute: () => {}, classList: { add: () => {}, remove: () => {} } },
    body: {
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        toggle(c, f) { if (f) this.add(c); else this.remove(c); }
      },
      appendChild: (el) => {
        if (el.id) documentMock._byId[el.id] = el;
      }
    },
    getElementById: (id) => documentMock._byId[id] || null,
    createElement: (tag) => createMockElement(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const windowMock = {
    location: { hash: "", search: "", href: "https://mywayofevangelism.com/church-profile.html?id=river-city" },
    localStorage: localStorageMock,
    setTimeout: (fn) => fn(),
    prompt: (msg, def) => def,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const context = {
    window: windowMock,
    document: documentMock,
    localStorage: localStorageMock,
    console,
    URLSearchParams,
    createIcons: () => {},
    showToast: () => {},
    setTimeout: (fn, delay) => { if (!delay) fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    Event: class { constructor(type) { this.type = type; } },
    FormData: class {
      constructor(form) { this.form = form; }
      entries() { return []; }
    },
    MWE: {}
  };

  vm.createContext(context);
  vm.runInContext(appJs, context);
  const mwe = context.window.MWE || context.MWE;

  // 1. Verify MWE.toggleVisitPanel with #register on page
  const registerPanel = createMockElement("div");
  registerPanel.id = "register";
  documentMock._byId["register"] = registerPanel;

  mwe.toggleVisitPanel(true);
  assert.equal(registerPanel._scrolled, true, "toggleVisitPanel must call scrollIntoView on #register");
  assert.equal(registerPanel.classList.contains("panel-highlight-pulse"), true, "registerPanel should have panel-highlight-pulse");

  // 2. Submit a new ride request
  const testRideId = "ride-unit-test-100";
  const rides = [{
    id: testRideId,
    churchId: "river-city",
    churchName: "River City Church",
    name: "John Doe",
    phone: "555-123-4567",
    address: "123 Main St, Edmonton",
    passengers: "2",
    preferredService: "Sunday 10:00 AM Service",
    notes: "Wheelchair accessible",
    stage: 1,
    stage1Confirmed: false,
    stage2Confirmed: false,
    driver: "Unassigned",
    pickupWindow: "Pending stage 1 confirmation",
    status: "stage1_pending",
    createdAt: new Date().toISOString()
  }];
  localStorageMock.setItem("mwe.ride_requests", JSON.stringify(rides));

  // 3. Open confirmation modal for this ride
  mwe.openRideConfirmationModal(testRideId);
  const modalEl = documentMock.getElementById("ride-confirmation-modal");
  assert.ok(modalEl, "Ride confirmation modal should be created and in DOM");
  assert.match(modalEl.innerHTML, /ride-stepper-tracker/, "Modal should contain ride stepper tracker");
  assert.match(modalEl.innerHTML, /Stage 1: Call \/ Text Availability Confirmation/, "Modal should detail Stage 1");
  assert.match(modalEl.innerHTML, /Stage 2: Schedule Confirmation &amp; Driver Details|Stage 2: Schedule Confirmation & Driver Details/, "Modal should detail Stage 2");
  assert.match(modalEl.innerHTML, /Call \/ Text Pending/, "Stage 1 should show pending before confirmation");

  // 4. Confirm Stage 1 (Call/Text availability)
  mwe.confirmRideStage1(testRideId);
  const storedRidesAfterStage1 = JSON.parse(localStorageMock.getItem("mwe.ride_requests"));
  const rideAfter1 = storedRidesAfterStage1.find(r => r.id === testRideId);
  assert.equal(rideAfter1.stage, 2, "Ride stage should advance to 2");
  assert.equal(rideAfter1.stage1Confirmed, true, "Ride stage1Confirmed should be true");
  assert.equal(rideAfter1.status, "stage2_scheduling", "Ride status should be stage2_scheduling");

  // Modal refreshed should now show Stage 1 verified
  const modalElAfterStage1 = documentMock.getElementById("ride-confirmation-modal");
  assert.match(modalElAfterStage1.innerHTML, /Availability Verified/, "Modal should display Availability Verified after stage 1");

  // 5. Confirm Stage 2 (Schedule and Driver Assignment)
  mwe.confirmRideSchedule(testRideId, "Sister Mary (Van #2)", "Sunday 9:00 AM - 9:15 AM");
  const storedRidesAfterStage2 = JSON.parse(localStorageMock.getItem("mwe.ride_requests"));
  const rideAfter2 = storedRidesAfterStage2.find(r => r.id === testRideId);
  assert.equal(rideAfter2.stage2Confirmed, true, "Ride stage2Confirmed should be true");
  assert.equal(rideAfter2.driver, "Sister Mary (Van #2)", "Driver should be Sister Mary (Van #2)");
  assert.equal(rideAfter2.pickupWindow, "Sunday 9:00 AM - 9:15 AM", "Pickup window should match assigned time");
  assert.equal(rideAfter2.status, "confirmed", "Ride status should be confirmed");

  // Modal refreshed should now show Schedule Confirmed
  const modalElAfterStage2 = documentMock.getElementById("ride-confirmation-modal");
  assert.match(modalElAfterStage2.innerHTML, /Schedule Confirmed/, "Modal should show Schedule Confirmed");
  assert.match(modalElAfterStage2.innerHTML, /Sister Mary \(Van #2\)/, "Modal should display assigned driver");
  assert.match(modalElAfterStage2.innerHTML, /Sunday 9:00 AM - 9:15 AM/, "Modal should display pickup window");
});
