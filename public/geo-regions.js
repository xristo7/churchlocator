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
      ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
      ["AS", "American Samoa"], ["GU", "Guam"], ["MP", "Northern Mariana Islands"], ["PR", "Puerto Rico"], ["VI", "U.S. Virgin Islands"]] },
    { code: "GB", name: "United Kingdom", short: "United Kingdom", flag: "🇬🇧", unit: "Nation", subdivisions: [
      ["ENG", "England"], ["SCT", "Scotland"], ["WLS", "Wales"], ["NIR", "Northern Ireland"]] }
  ].map(r => ({ ...r, subdivisions: r.subdivisions.map(([code, name]) => ({ code, name })) }));

  /* UK counties / council areas, grouped under their nation (the nation stays selectable on its own).
     England: the 48 ceremonial counties (Lieutenancies Act 1997, Sch. 1, as amended).
     Scotland: the 32 council areas (Local Government etc. (Scotland) Act 1994, Sch. 1).
     Wales: the 22 principal areas (Local Government (Wales) Act 1994, Sch. 1).
     Northern Ireland: the 6 traditional counties (what people search by; the 11 districts are aliases below). */
  const UK_AREAS = {
    ENG: ["Bedfordshire", "Berkshire", "Bristol", "Buckinghamshire", "Cambridgeshire", "Cheshire", "City of London", "Cornwall", "Cumbria", "Derbyshire",
      "Devon", "Dorset", "Durham", "East Riding of Yorkshire", "East Sussex", "Essex", "Gloucestershire", "Greater London", "Greater Manchester", "Hampshire",
      "Herefordshire", "Hertfordshire", "Isle of Wight", "Kent", "Lancashire", "Leicestershire", "Lincolnshire", "Merseyside", "Norfolk", "North Yorkshire",
      "Northamptonshire", "Northumberland", "Nottinghamshire", "Oxfordshire", "Rutland", "Shropshire", "Somerset", "South Yorkshire", "Staffordshire", "Suffolk",
      "Surrey", "Tyne and Wear", "Warwickshire", "West Midlands", "West Sussex", "West Yorkshire", "Wiltshire", "Worcestershire"],
    SCT: ["Aberdeen City", "Aberdeenshire", "Angus", "Argyll and Bute", "City of Edinburgh", "Clackmannanshire", "Dumfries and Galloway", "Dundee City",
      "East Ayrshire", "East Dunbartonshire", "East Lothian", "East Renfrewshire", "Falkirk", "Fife", "Glasgow City", "Highland", "Inverclyde", "Midlothian",
      "Moray", "Na h-Eileanan Siar", "North Ayrshire", "North Lanarkshire", "Orkney Islands", "Perth and Kinross", "Renfrewshire", "Scottish Borders",
      "Shetland Islands", "South Ayrshire", "South Lanarkshire", "Stirling", "West Dunbartonshire", "West Lothian"],
    WLS: ["Blaenau Gwent", "Bridgend", "Caerphilly", "Cardiff", "Carmarthenshire", "Ceredigion", "Conwy", "Denbighshire", "Flintshire", "Gwynedd",
      "Isle of Anglesey", "Merthyr Tydfil", "Monmouthshire", "Neath Port Talbot", "Newport", "Pembrokeshire", "Powys", "Rhondda Cynon Taf", "Swansea",
      "Torfaen", "Vale of Glamorgan", "Wrexham"],
    NIR: ["Antrim", "Armagh", "Down", "Fermanagh", "Londonderry", "Tyrone"]
  };
  const areaSlug = n => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const GB = REGIONS.find(r => r.code === "GB");
  GB.areaUnit = "County";
  GB.areas = Object.entries(UK_AREAS).flatMap(([nation, names]) => names.map(name => ({ code: nation + "." + areaSlug(name), name, nation })));

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
  // Unitary authorities, older names and NI districts that people type, mapped to the listed area.
  const AREA_ALIASES = {
    "milton keynes": "Buckinghamshire", luton: "Bedfordshire", bedford: "Bedfordshire", "central bedfordshire": "Bedfordshire", peterborough: "Cambridgeshire",
    halton: "Cheshire", warrington: "Cheshire", "cheshire east": "Cheshire", "cheshire west and chester": "Cheshire", cumberland: "Cumbria", "westmorland and furness": "Cumbria",
    derby: "Derbyshire", plymouth: "Devon", torbay: "Devon", bournemouth: "Dorset", poole: "Dorset", "bournemouth christchurch and poole": "Dorset",
    "county durham": "Durham", darlington: "Durham", hartlepool: "Durham", "kingston upon hull": "East Riding of Yorkshire", hull: "East Riding of Yorkshire",
    "east yorkshire": "East Riding of Yorkshire", "brighton and hove": "East Sussex", brighton: "East Sussex", "southend-on-sea": "Essex", thurrock: "Essex",
    "south gloucestershire": "Gloucestershire", portsmouth: "Hampshire", southampton: "Hampshire", medway: "Kent", blackburn: "Lancashire",
    "blackburn with darwen": "Lancashire", blackpool: "Lancashire", leicester: "Leicestershire", "north lincolnshire": "Lincolnshire",
    "north east lincolnshire": "Lincolnshire", "north northamptonshire": "Northamptonshire", "west northamptonshire": "Northamptonshire",
    middlesbrough: "North Yorkshire", "redcar and cleveland": "North Yorkshire", york: "North Yorkshire", nottingham: "Nottinghamshire",
    "telford and wrekin": "Shropshire", "bath and north east somerset": "Somerset", "north somerset": "Somerset", "stoke-on-trent": "Staffordshire",
    swindon: "Wiltshire", london: "Greater London", manchester: "Greater Manchester", birmingham: "West Midlands", coventry: "West Midlands",
    wolverhampton: "West Midlands", leeds: "West Yorkshire", bradford: "West Yorkshire", liverpool: "Merseyside", sheffield: "South Yorkshire",
    newcastle: "Tyne and Wear", "newcastle upon tyne": "Tyne and Wear", sunderland: "Tyne and Wear", oxford: "Oxfordshire", cambridge: "Cambridgeshire", "city of bristol": "Bristol", "isles of scilly": "Cornwall",
    "aberdeen": "Aberdeen City", edinburgh: "City of Edinburgh", dundee: "Dundee City", glasgow: "Glasgow City", "western isles": "Na h-Eileanan Siar",
    "eilean siar": "Na h-Eileanan Siar", orkney: "Orkney Islands", shetland: "Shetland Islands", borders: "Scottish Borders", "perth": "Perth and Kinross",
    anglesey: "Isle of Anglesey", "ynys mon": "Isle of Anglesey", "the vale of glamorgan": "Vale of Glamorgan", rhondda: "Rhondda Cynon Taf",
    "rhondda cynon taff": "Rhondda Cynon Taf", derry: "Londonderry", "derry and strabane": "Londonderry", "causeway coast and glens": "Londonderry",
    "mid and east antrim": "Antrim", "antrim and newtownabbey": "Antrim", "lisburn and castlereagh": "Antrim", "ards and north down": "Down",
    "newry mourne and down": "Down", "armagh city banbridge and craigavon": "Armagh", "fermanagh and omagh": "Fermanagh", "mid ulster": "Tyrone"
  };
  /** UK county / council area code ("ENG.KENT") from a name, alias or code; "" if unknown. */
  function areaCode(value) {
    let k = key(value).replace(/^(county|co) /, "").replace(/ (county|council|shire council)$/, "");
    if (!k || !GB.areas) return "";
    const direct = GB.areas.find(a => a.code.toLowerCase() === k || key(a.name) === k);
    if (direct) return direct.code;
    const alias = AREA_ALIASES[k] || AREA_ALIASES[k.replace(/^city of /, "")];
    const hit = alias && GB.areas.find(a => a.name === alias);
    return hit ? hit.code : "";
  }
  const areaOf = code => (GB.areas || []).find(a => a.code === code) || null;

  function subdivisionCode(country, value) {
    const r = region(country); const k = key(value);
    if (!r || !k) return "";
    const alias = SUB_ALIASES[r.code][k];
    if (alias) return alias;
    const hit = r.subdivisions.find(s => key(s.code) === k || key(s.name) === k);
    if (hit) return hit.code;
    if (r.code === "GB") { const a = areaOf(areaCode(value)); if (a) return a.code; }
    return "";
  }
  const subdivisionName = (country, code) => { const r = region(country); const s = r && (r.subdivisions.find(x => x.code === code) || (r.areas || []).find(x => x.code === code)); return s ? s.name : ""; };

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
    let state = "", county = "";
    if (country === "GB") {
      for (const field of ["county", "council", "area", "district", "region", "state", "province", "subdivision"]) { county = areaCode(c[field]); if (county) break; }
      if (!county) { const text = [c.location, c.address].filter(Boolean).join(", "); for (const t of text.split(/[,\n]/).map(x => x.trim()).reverse()) { county = areaCode(t); if (county) break; } }
      if (!county && city) county = areaCode(city);
    }
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
      if (state && state.includes(".")) { county = county || state; state = ""; }
      if (!state && county) state = areaOf(county).nation;
      if (!state) state = CITY_HINTS[country][key(city)] || "";
    }
    return { country, state, city, county };
  }

  /** Does a churchLocation() result satisfy a {country, state, city} filter? Empty parts match anything. */
  function matchesLocation(loc, filter) {
    const f = filter || {};
    if (f.country && loc.country !== countryCode(f.country) && loc.country !== f.country) return false;
    if (f.state) {
      const area = areaOf(f.state);
      if (area) { if (loc.county !== area.code) return false; }
      else if (loc.state !== f.state) return false;
    }
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

  /** Options for a region's second-level picker: for the UK each nation is followed by its counties (nation stays selectable). */
  function pickList(country) {
    const r = region(country); if (!r) return [];
    if (!r.areas) return r.subdivisions.map(s => ({ code: s.code, name: s.name }));
    return r.subdivisions.flatMap(s => [{ code: s.code, name: s.name }, ...r.areas.filter(a => a.nation === s.code).map(a => ({ code: a.code, name: a.name, nation: a.nation }))]);
  }
  const api = { pickList, areaCode, areaOf, matchesLocation, citiesFor, distanceKm, coords, REGIONS, region, countryCode, subdivisionCode, subdivisionName, subdivisionFromPostal, churchLocation, cityKey: key };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MWEGeo = api;
})(typeof window !== "undefined" ? window : globalThis);
