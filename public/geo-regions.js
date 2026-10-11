/* Canonical directory geography: regions (CA/US/UK), their subdivisions, and normalisers
   used by the church directory filters, the home search card and the Worker. */
(function (root) {
  const REGIONS = [
    { code: "CA", name: "Canada", short: "Canada", flag: "🇨🇦", unit: "Province", subdivisions: [
      ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"],
      ["NS", "Nova Scotia"], ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"],
      ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"]] },
    { code: "US", name: "United States", short: "USA", flag: "🇺🇸", unit: "State", subdivisions: [
      ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
      ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
      ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
      ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
      ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
      ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
      ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
      ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"]] },
    { code: "GB", name: "United Kingdom", short: "United Kingdom", flag: "🇬🇧", unit: "Nation", subdivisions: [
      ["ENG", "England"], ["SCT", "Scotland"], ["WLS", "Wales"], ["NIR", "Northern Ireland"]] }
  ].map(r => ({ ...r, subdivisions: r.subdivisions.map(([code, name]) => ({ code, name })) }));

  const key = v => String(v == null ? "" : v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ").trim();

  const COUNTRY_ALIASES = {
    CA: ["ca", "can", "canada"],
    US: ["us", "usa", "united states", "united states of america", "america", "u s", "u s a"],
    GB: ["gb", "gbr", "uk", "united kingdom", "great britain", "britain", "england", "scotland", "wales", "northern ireland"]
  };
  function countryCode(value) {
    const k = key(value);
    if (!k) return "";
    for (const [code, list] of Object.entries(COUNTRY_ALIASES)) if (list.includes(k)) return code;
    return "";
  }
  const region = code => REGIONS.find(r => r.code === countryCode(code) || r.code === code) || null;

  const SUB_ALIASES = { GB: { eng: "ENG", england: "ENG", sct: "SCT", sco: "SCT", scotland: "SCT", wls: "WLS", wal: "WLS", wales: "WLS", cymru: "WLS", nir: "NIR", ni: "NIR", "northern ireland": "NIR" },
    CA: { pq: "QC", que: "QC", "québec": "QC", nfld: "NL", newfoundland: "NL", pei: "PE", yk: "YT", "yukon territory": "YT", alta: "AB", sask: "SK", man: "MB" },
    US: { "washington dc": "DC", "washington d c": "DC", "district of columbia": "DC", "dc": "DC" } };
  function subdivisionCode(country, value) {
    const r = region(country); const k = key(value);
    if (!r || !k) return "";
    const alias = SUB_ALIASES[r.code][k];
    if (alias) return alias;
    const hit = r.subdivisions.find(s => key(s.code) === k || key(s.name) === k);
    return hit ? hit.code : "";
  }
  const subdivisionName = (country, code) => { const r = region(country); const s = r && r.subdivisions.find(x => x.code === code); return s ? s.name : ""; };

  const CA_POSTAL = { A: "NL", B: "NS", C: "PE", E: "NB", G: "QC", H: "QC", J: "QC", K: "ON", L: "ON", M: "ON", N: "ON", P: "ON", R: "MB", S: "SK", T: "AB", V: "BC", X: "NT", Y: "YT" };
  const US_ZIP = [[5, 5, "NY"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"], [50, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"], [100, 149, "NY"],
    [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"], [201, 201, "VA"], [202, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"],
    [290, 299, "SC"], [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 458, "OH"],
    [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"],
    [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"], [730, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"],
    [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"], [967, 968, "HI"], [970, 979, "OR"],
    [980, 994, "WA"], [995, 999, "AK"]];
  const UK_SCOTLAND = ["AB", "DD", "DG", "EH", "FK", "G", "HS", "IV", "KA", "KW", "KY", "ML", "PA", "PH", "TD", "ZE"];
  const UK_WALES = ["CF", "LD", "LL", "NP", "SA"];
  function subdivisionFromPostal(country, postal) {
    const c = countryCode(country); const p = String(postal || "").toUpperCase().replace(/\s+/g, "");
    if (!c || !p) return "";
    if (c === "CA") return /^[A-Z]\d[A-Z]/.test(p) ? (CA_POSTAL[p[0]] || "") : "";
    if (c === "US") { const m = p.match(/^(\d{3})\d{2}/); if (!m) return ""; const n = Number(m[1]); const hit = US_ZIP.find(([a, b]) => n >= a && n <= b); return hit ? hit[2] : ""; }
    if (c === "GB") { const m = p.match(/^([A-Z]{1,2})\d/); if (!m) return ""; const area = m[1];
      if (area === "BT") return "NIR"; if (UK_SCOTLAND.includes(area)) return "SCT"; if (UK_WALES.includes(area)) return "WLS"; return "ENG"; }
    return "";
  }

  // Well-known cities, used only when a record carries no state/postal information.
  const CITY_HINTS = {
    CA: { edmonton: "AB", calgary: "AB", "red deer": "AB", lethbridge: "AB", toronto: "ON", ottawa: "ON", mississauga: "ON", brampton: "ON", hamilton: "ON", london: "ON",
      vancouver: "BC", surrey: "BC", victoria: "BC", burnaby: "BC", montreal: "QC", "quebec city": "QC", laval: "QC", winnipeg: "MB", regina: "SK", saskatoon: "SK",
      halifax: "NS", moncton: "NB", fredericton: "NB", "st john's": "NL", charlottetown: "PE", whitehorse: "YT", yellowknife: "NT", iqaluit: "NU" },
    US: { houston: "TX", dallas: "TX", austin: "TX", "san antonio": "TX", chicago: "IL", minneapolis: "MN", "saint paul": "MN", atlanta: "GA", "new york": "NY",
      brooklyn: "NY", "los angeles": "CA", "san francisco": "CA", "san diego": "CA", seattle: "WA", miami: "FL", orlando: "FL", tampa: "FL", phoenix: "AZ",
      denver: "CO", boston: "MA", philadelphia: "PA", detroit: "MI", washington: "DC", nashville: "TN", charlotte: "NC", baltimore: "MD", "las vegas": "NV" },
    GB: { london: "ENG", manchester: "ENG", birmingham: "ENG", leeds: "ENG", liverpool: "ENG", bristol: "ENG", sheffield: "ENG", edinburgh: "SCT", glasgow: "SCT",
      aberdeen: "SCT", dundee: "SCT", cardiff: "WLS", swansea: "WLS", newport: "WLS", belfast: "NIR", derry: "NIR", londonderry: "NIR" }
  };

  /** Best-effort location of a church record: { country: "CA"|"US"|"GB"|"", state: code|"", city }. */
  function churchLocation(church) {
    const c = church || {};
    const country = countryCode(c.country || c.countryCode || c.country_code);
    const city = String(c.city || "").trim();
    let state = "";
    if (country) {
      for (const field of ["state", "province", "region", "stateCode", "state_code", "province_code", "nation", "subdivision"]) {
        state = subdivisionCode(country, c[field]); if (state) break;
      }
      if (!state) state = subdivisionFromPostal(country, c.postal || c.postal_code || c.postalCode || c.zip);
      if (!state) {
        const text = [c.location, c.address, c.area].filter(Boolean).join(", ");
        const tokens = text.split(/[,\n]/).map(s => s.trim().replace(/\s+[A-Z]\d[A-Z].*$|\s+\d{5}(-\d{4})?$/, ""));
        for (const t of tokens.reverse()) { state = subdivisionCode(country, t); if (state) break; }
      }
      if (!state) state = CITY_HINTS[country][key(city)] || "";
    }
    return { country, state, city };
  }

  /** Does a churchLocation() result satisfy a {country, state, city} filter? Empty parts match anything. */
  function matchesLocation(loc, filter) {
    const f = filter || {};
    if (f.country && loc.country !== countryCode(f.country) && loc.country !== f.country) return false;
    if (f.state && loc.state !== f.state) return false;
    if (f.city && key(loc.city) !== key(f.city)) return false;
    return true;
  }
  /** Sorted unique city names of churches in a region/state. */
  function citiesFor(churches, country, state) {
    const out = new Map();
    for (const c of churches || []) {
      const loc = churchLocation(c);
      if (!loc.city || !matchesLocation(loc, { country, state })) continue;
      if (!out.has(key(loc.city))) out.set(key(loc.city), loc.city);
    }
    return [...out.values()].sort((a, b) => a.localeCompare(b));
  }
  /** Great-circle distance in km. */
  function distanceKm(a, b) {
    const r = d => d * Math.PI / 180; const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function coords(church) {
    const c = church || {}; const lat = Number(c.lat ?? c.latitude ?? c.coordinates?.lat); const lng = Number(c.lng ?? c.lon ?? c.longitude ?? c.coordinates?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? { lat, lng } : null;
  }

  const api = { matchesLocation, citiesFor, distanceKm, coords, REGIONS, region, countryCode, subdivisionCode, subdivisionName, subdivisionFromPostal, churchLocation, cityKey: key };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MWEGeo = api;
})(typeof window !== "undefined" ? window : globalThis);
