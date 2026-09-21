import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import worker, {
  handleServiceBooking,
  handleGetServiceBookings
} from "../src/worker.js";

const projectRoot = path.resolve(".");

test("Worker API: Service booking validation, generation, and storage", async () => {
  const fakeDb = {
    records: [],
    prepare(query) {
      return {
        bind(...args) {
          return {
            async run() {
              fakeDb.records.push(args);
              return { success: true };
            },
            async all() {
              return { results: [] };
            }
          };
        }
      };
    }
  };

  const env = { DB: fakeDb };

  // 1. Missing required field -> 400
  const invalidReq = new Request("https://example.test/api/services/book", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  });
  const resInvalid = await handleServiceBooking(invalidReq, env);
  assert.equal(resInvalid.status, 400);

  // 2. Valid booking inquiry -> 200 with bookingRef
  const validPayload = {
    serviceId: "service-venue-hall",
    serviceTitle: "Sanctuary & Community Hall Rental",
    serviceType: "venue",
    providerName: "River City Church",
    providerType: "Church",
    packageTier: "Half-Day Seminar",
    estimatedAmount: "$480.00",
    requestedDate: "2026-10-15",
    requestedTime: "10:00 AM",
    customerName: "Jane Doe",
    customerEmail: "jane.doe@example.com",
    customerPhone: "+1 555-0199",
    eventLocation: "123 Main St",
    notes: "Youth conference setup needed"
  };

  const validReq = new Request("https://example.test/api/services/book", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validPayload)
  });

  const resValid = await handleServiceBooking(validReq, env);
  assert.equal(resValid.status, 201);
  const json = await resValid.json();
  assert.equal(json.ok, true);
  assert.match(json.bookingRef, /^SRV-[A-Z0-9]{6,10}$/);
  assert.equal(fakeDb.records.length, 1);
  assert.equal(fakeDb.records[0][1], json.bookingRef);
});

test("Worker API: Route routing for /api/services/book and /api/services/bookings", async () => {
  const fakeDb = {
    prepare() {
      return {
        bind() {
          return {
            async all() { return { results: [] }; },
            async run() { return { success: true }; }
          };
        }
      };
    }
  };
  const env = { DB: fakeDb, ASSETS: { fetch: () => new Response("ok") } };

  // Unauthenticated without email parameter -> 401
  const reqBookings = new Request("https://example.test/api/services/bookings", {
    method: "GET"
  });
  const res = await worker.fetch(reqBookings, env);
  assert.equal(res.status, 401);
});

test("Client Data Layer: Platform modules service seeds and helper methods", async () => {
  const content = await fs.readFile(path.join(projectRoot, "public", "platform-modules.js"), "utf8");

  assert.match(content, /service-worship-singing/);
  assert.match(content, /service-venue-hall/);
  assert.match(content, /service-church-van/);
  assert.match(content, /service-photo-video/);
  assert.match(content, /service-graphic-design/);

  assert.match(content, /getServices:\s*\(\)/);
  assert.match(content, /getPhysicalProducts:\s*\(\)/);
  assert.match(content, /getStoreItems:\s*\(\)/);
  assert.match(content, /getItemById:\s*id/);
  assert.match(content, /bookService\(payload\)/);
});

test("Product Detail Shell & Scripts: Sleek product view, 5 service templates, and booking modal", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "product-detail.html"), "utf8");
  const js = await fs.readFile(path.join(projectRoot, "public", "product-detail.js"), "utf8");

  // Shell structure
  assert.match(html, /id="product-detail"/);
  assert.match(html, /id="service-booking-modal"/);
  assert.match(html, /id="service-booking-form"/);
  assert.match(html, /id="service-modal-backdrop"/);
  assert.match(html, /id="service-booking-confirmation"/);

  // Modern product UI logic
  assert.match(js, /product-sleek-layout/);
  assert.match(js, /product-thumbnails-sleek/);
  assert.match(js, /product-guarantee-strip/);
  assert.match(js, /product-specs-table/);
  assert.match(js, /product-detail-buynow/);
  assert.match(js, /data-remove-cart/);

  // Specialized service templates logic
  assert.match(js, /service-singing-section/);
  assert.match(js, /audio-waveform-bars/);
  assert.match(js, /service-venue-section/);
  assert.match(js, /venue-stats-row/);
  assert.match(js, /service-van-section/);
  assert.match(js, /van-specs-grid/);
  assert.match(js, /service-media-section/);
  assert.match(js, /media-specs-grid/);
  assert.match(js, /service-design-section/);
  assert.match(js, /design-deliverables-grid/);

  // Package tiers & booking wiring
  assert.match(js, /service-tiers-grid/);
  assert.match(js, /service-tier-card/);
  assert.match(js, /openBookingModal/);
  assert.match(js, /bookService/);
});

test("Store Marketplace: Item type selector and service card badges", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "store.html"), "utf8");
  const js = await fs.readFile(path.join(projectRoot, "public", "store.js"), "utf8");

  assert.match(html, /id="store-type"/);
  assert.match(html, /value="products"/);
  assert.match(html, /value="services"/);

  assert.match(js, /store-type/);
  assert.match(js, /service-badge-pill/);
  assert.match(js, /service-book-mini-btn/);
  assert.match(js, /publicationState === "published"/);
});

test("Store catalog: connected catalog seed fallback does not attempt protected local storage writes", async () => {
  const modules = await fs.readFile(path.join(projectRoot, "public", "platform-modules.js"), "utf8");

  assert.match(modules, /isConnectedCatalog/);
  assert.match(modules, /if \(!isConnectedCatalog\) localStorage\.setItem\(key, JSON\.stringify\(merged\)\)/);

  const storage = new Map([["faithlink.store.products.v1", "[]"]]);
  const window = {
    MWEPlatform: { installed: true, staging: false },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem() { throw new Error("Use the connected workspace to save this record."); }
    }
  };
  vm.runInNewContext(modules, { window, localStorage: window.localStorage, console });

  const products = window.FaithLinkModules.getProducts();
  assert.ok(products.length > 0);
  assert.equal(products[0].status, "Active");
});
test("Styling & Theme: Product layout, service templates, dark mode, and mobile responsiveness", async () => {
  const css = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");

  // Core layout classes
  assert.match(css, /\.product-sleek-layout/);
  assert.match(css, /\.product-main-card/);
  assert.match(css, /\.product-thumbnails-sleek/);
  assert.match(css, /\.service-detail-shell/);
  assert.match(css, /\.service-hero-card/);
  assert.match(css, /\.service-audio-player-card/);
  assert.match(css, /\.venue-stats-row/);
  assert.match(css, /\.van-specs-grid/);
  assert.match(css, /\.media-specs-grid/);
  assert.match(css, /\.design-deliverables-grid/);
  assert.match(css, /\.service-tier-card/);
  assert.match(css, /\.service-booking-modal/);

  // Dark mode
  assert.match(css, /html\[data-theme="dark"\]\s+\.product-main-card/);
  assert.match(css, /html\[data-theme="dark"\]\s+\.service-hero-card/);
  assert.match(css, /html\[data-theme="dark"\]\s+\.service-tier-card/);
  assert.match(css, /html\[data-theme="dark"\]\s+\.service-booking-modal/);
});

test("Database Migration: 0003_service_bookings.sql defines required table and indexes", async () => {
  const sql = await fs.readFile(path.join(projectRoot, "migrations", "0003_service_bookings.sql"), "utf8");

  assert.match(sql, /create table if not exists service_bookings/i);
  assert.match(sql, /booking_ref text not null/i);
  assert.match(sql, /service_id text not null/i);
  assert.match(sql, /service_type text not null/i);
  assert.match(sql, /customer_email text not null/i);
  assert.match(sql, /idx_service_bookings_email/i);
});
