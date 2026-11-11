import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEntity } from "../src/trusted-platform.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFile(path.join(root, file), "utf8");
const hall = extra => ({ title: "Fellowship Hall", storeId: "store-1", seller: "Grace Church", sellerType: "Church", category: "Venue rental", description: "Hall", price: 350, inventory: 1, status: "Active", itemType: "venue", address: "12 Main St", city: "Toronto", capacity: 180, priceUnit: "day", availability: "Saturdays", occasions: "Weddings, Funerals", ...extra });

test("Brief 12.1: a church hall listing keeps its location, capacity, price unit and photos", () => {
  const data = validateEntity("products", hall({ photo2: "https://example.com/hall-2.jpg" }));
  assert.equal(data.itemType, "venue");
  assert.equal(data.capacity, 180);
  assert.equal(data.city, "Toronto");
  assert.equal(data.priceUnit, "day");
  assert.equal(data.photo2, "https://example.com/hall-2.jpg");
});

test("Brief 12.1: invalid venue listings are refused", () => {
  assert.throws(() => validateEntity("products", hall({ capacity: 0 })), /guests/);
  assert.throws(() => validateEntity("products", hall({ city: "" })), /city/);
  assert.throws(() => validateEntity("products", hall({ priceUnit: "week" })), /per hour, day or event/);
  assert.throws(() => validateEntity("products", hall({ itemType: "raffle" })), /venue rental/);
  assert.throws(() => validateEntity("products", hall({ photo2: "http://example.com/x.jpg" })), /HTTPS/);
});

test("Brief 12: merchandise is unaffected by venue fields", () => {
  const data = validateEntity("products", { title: "Hoodie", storeId: "s", seller: "Creator", sellerType: "Creator", category: "Apparel", description: "Warm", price: 45, inventory: 20, status: "Active", itemType: "product" });
  assert.equal(data.itemType, "product");
  assert.equal(data.capacity, undefined);
});

test("Brief 12: owners choose Product or Venue rental; visitors filter by it and send an inquiry, not a payment", async () => {
  const [studio, store, html, detail, storefront, migration] = await Promise.all([
    read("public/creator-studio.js"), read("public/store.js"), read("public/store.html"), read("public/product-detail.js"), read("public/creator-public.js"), read("migrations/0037_venue_rental_category.sql")]);
  assert.match(studio, /venue\|Venue rental \(hall\)/);
  assert.match(studio, /\["capacity","Guest capacity","number"/);
  assert.match(studio, /if \(record\.itemType === "venue"\) return record;/, "venues never become checkout products");
  for (const seller of ["Organization", "Podcaster", "Creator"]) { assert.match(studio, new RegExp(`"${seller}"`)); assert.match(html, new RegExp(`<option>${seller}</option>`)); }
  assert.match(html, /<option value="venues">Venue rentals<\/option>/);
  assert.match(store, /type === "venues" && product\.itemType !== "venue"/);
  assert.match(store, /\["service", "venue"\]\.includes\(product\.itemType\)/);
  assert.match(detail, /item\.itemType === "venue"[\s\S]*renderVenueUI/);
  assert.match(detail, /\/api\/private\/message[\s\S]*entityId: venue\.id/);
  assert.doesNotMatch(detail.slice(detail.indexOf("function renderVenueUI"), detail.indexOf("function renderServiceUI")), /addToCart|checkout/);
  assert.match(detail, /storefront\.html\?id=/, "listings link to their seller's store");
  assert.match(storefront, /Venues for rent/);
  assert.match(migration, /'Venue rental'/);
});

test("Brief 12.2: channel pages link to the owner's store", async () => {
  const js = await read("public/channel-detail.js");
  assert.match(js, /store\.tenantId===channel\.tenantId/);
  assert.match(js, /storefront\.html\?id=/);
});
