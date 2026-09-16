var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/security.js
var ApiError = class extends Error {
  static {
    __name(this, "ApiError");
  }
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
};
async function readJson(request) {
  const maximum = 64 * 1024;
  if (Number(request.headers.get("content-length") || 0) > maximum) throw new ApiError(413, "request body too large");
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) throw new ApiError(415, "application/json required");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid JSON body");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new ApiError(413, "request body too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let payload;
    try {
      payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      throw new ApiError(400, "invalid JSON body");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new ApiError(400, "JSON object required");
    validateValue(payload);
    return payload;
  } finally {
    reader.releaseLock();
  }
}
__name(readJson, "readJson");
function validateValue(value, key = "", depth = 0) {
  if (depth > 8) throw new ApiError(400, "JSON nesting too deep");
  if (["__proto__", "prototype", "constructor"].includes(key)) throw new ApiError(400, "invalid field");
  if (typeof value === "string") {
    const maximum = /password/i.test(key) ? 128 : /email/i.test(key) ? 254 : /^(id|.*Id)$/i.test(key) ? 128 : /name|title|phone/i.test(key) ? 200 : 1e4;
    if (value.length > maximum) throw new ApiError(400, "field too long");
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new ApiError(400, "invalid control character");
    if (/url$|^(website|image|photo|cover|logo|pastorPhoto)$/i.test(key) && value && value !== "#") {
      let url;
      try {
        url = new URL(value, "https://asset.invalid/");
      } catch {
        throw new ApiError(400, "invalid URL");
      }
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new ApiError(400, "unsafe URL");
    }
  } else if (typeof value === "number" && !Number.isFinite(value)) throw new ApiError(400, "invalid number");
  else if (value && typeof value === "object") {
    if (Object.keys(value).length > 100) throw new ApiError(400, "too many fields");
    for (const [childKey, childValue] of Object.entries(value)) validateValue(childValue, childKey, depth + 1);
  }
}
__name(validateValue, "validateValue");
function validateMutationOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, "cross-origin request rejected");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "cross-site request rejected");
}
__name(validateMutationOrigin, "validateMutationOrigin");
async function enforceRateLimit(request, env, path) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const auth = path.startsWith("/api/auth/") || path.startsWith("/api/creator/");
  const limiter = auth ? env.AUTH_RATE_LIMITER : env.WRITE_RATE_LIMITER;
  if (!limiter) {
    if (["production", "preview"].includes(env.ENVIRONMENT)) throw new ApiError(503, "security service unavailable");
    return;
  }
  const address = request.headers.get("cf-connecting-ip") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address));
  const key = (auth ? "auth:" : "write:") + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const { success } = await limiter.limit({ key });
  if (!success) throw new ApiError(429, "too many requests; retry in one minute");
}
__name(enforceRateLimit, "enforceRateLimit");
var securityHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin",
  "strict-transport-security": "max-age=31536000",
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' https: data: blob:; media-src 'self' https: blob: data:; connect-src 'self' https://nominatim.openstreetmap.org https://geocoding-api.open-meteo.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com https://www.openstreetmap.org; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
};

// node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
__name(isBytes, "isBytes");
var atitle = /* @__PURE__ */ __name((title) => title ? `"${title}" ` : "", "atitle");
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
__name(anumber, "anumber");
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length))
    return value;
  if (length !== void 0)
    anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
}
__name(abytes, "abytes");
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new TypeError("expected hash wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
  if (h.outputLen < 1 || h.blockLen < 1)
    throw new Error("hash blockLen / outputLen must be >= 1");
}
__name(ahash, "ahash");
var aobject = /* @__PURE__ */ __name((value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
}, "aobject");
var aopts = /* @__PURE__ */ __name((value, label) => {
  aobject(value, label);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null)
    throw new TypeError(`"${label}" expected plain object`);
  if (Object.hasOwn(value, "__proto__"))
    throw new TypeError(`"${label}.__proto__" is not allowed`);
}, "aopts");
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("hash was destroyed");
  if (checkFinished && instance.finished)
    throw new Error("digest() was already called");
}
__name(aexists, "aexists");
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}
__name(aoutput, "aoutput");
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
__name(clean, "clean");
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
__name(createView, "createView");
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
__name(rotr, "rotr");
function nextTick(onReject) {
  const host = globalThis;
  if (typeof host.scheduler?.yield === "function") {
    const promise = host.scheduler.yield();
    if (onReject)
      promise.catch(onReject);
    return promise;
  }
  return new Promise((resolve) => host.setTimeout(resolve, 0));
}
__name(nextTick, "nextTick");
async function asyncLoop(iters, tick, cb, onReject) {
  anumber(iters, "iters");
  anumber(tick, "tick");
  if (typeof cb !== "function")
    throw new TypeError("callback must be a function");
  let ts = Date.now();
  for (let i = 0; i < iters; i++) {
    cb(i);
    const diff = Date.now() - ts;
    if (diff >= 0 && diff < tick)
      continue;
    await nextTick(onReject);
    ts = Date.now();
  }
}
__name(asyncLoop, "asyncLoop");
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new TypeError("string expected");
  const encoded = new TextEncoder().encode(str);
  try {
    return new Uint8Array(encoded);
  } finally {
    clean(encoded);
  }
}
__name(utf8ToBytes, "utf8ToBytes");
function kdfInputToBytes(data, errorTitle = "") {
  if (typeof data === "string")
    return utf8ToBytes(data);
  return abytes(data, void 0, errorTitle);
}
__name(kdfInputToBytes, "kdfInputToBytes");
function checkOpts(defaults, opts, title = "opts") {
  aopts(defaults, "defaults");
  if (opts !== void 0)
    aopts(opts, title);
  const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
  return merged;
}
__name(checkOpts, "checkOpts");
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = /* @__PURE__ */ __name((msg, opts) => hashCons(opts).update(msg).digest(), "hashC");
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
__name(createHasher, "createHasher");
var oidNist = /* @__PURE__ */ __name((suffix) => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
}), "oidNist");

// node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/hmac.js
var _HMAC = class {
  static {
    __name(this, "_HMAC");
  }
  oHash;
  iHash;
  blockLen;
  outputLen;
  canXOF = false;
  finished = false;
  destroyed = false;
  constructor(hash, key) {
    ahash(hash);
    abytes(key, void 0, "key");
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("expected Hash instance");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const buf = out.subarray(0, this.outputLen);
    this.iHash.digestInto(buf);
    this.oHash.update(buf);
    this.oHash.digestInto(buf);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.canXOF = canXOF;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = /* @__PURE__ */ (() => {
  const hmac_ = /* @__PURE__ */ __name(((hash, key, message) => new _HMAC(hash, key).update(message).digest()), "hmac_");
  hmac_.create = (hash, key) => new _HMAC(hash, key);
  return hmac_;
})();

// node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/pbkdf2.js
function pbkdf2Init(hash, _password, _salt, _opts) {
  ahash(hash);
  const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
  const { c, dkLen, asyncTick } = opts;
  anumber(c, "c");
  anumber(dkLen, "dkLen");
  anumber(asyncTick, "asyncTick");
  if (c < 1)
    throw new Error('"c" (iterations) must be >= 1');
  if (dkLen < 1)
    throw new Error('"dkLen" must be >= 1');
  if (dkLen > (2 ** 32 - 1) * hash.outputLen)
    throw new Error("derived key too long");
  const p = kdfInputToBytes(_password, "password");
  try {
    const s = kdfInputToBytes(_salt, "salt");
    try {
      const DK = new Uint8Array(dkLen);
      const { iHash, oHash, outputLen } = hmac.create(hash, p);
      const u = new Uint8Array(outputLen);
      const eng = pbkdf2Engine(iHash, oHash, s, u);
      return { c, dkLen, asyncTick, DK, outputLen, eng };
    } finally {
      if (typeof _salt === "string")
        clean(s);
    }
  } finally {
    if (typeof _password === "string")
      clean(p);
  }
}
__name(pbkdf2Init, "pbkdf2Init");
function pbkdf2Engine(iHash, oHash, salt, u) {
  const counter = new Uint8Array(4);
  const view = createView(counter);
  const salted = iHash._cloneInto().update(salt);
  const work = oHash._cloneInto();
  const iClone = iHash._cloneInto;
  const oClone = oHash._cloneInto;
  return {
    u1: /* @__PURE__ */ __name((ti, Ti) => {
      view.setInt32(0, ti, false);
      salted._cloneInto(work).update(counter).digestInto(u);
      oHash._cloneInto(work).update(u).digestInto(u);
      Ti.set(u.subarray(0, Ti.length));
    }, "u1"),
    // Whole `F` inner loop for the sync variant: one optimized function owns the hot loop.
    rounds: /* @__PURE__ */ __name((c, Ti) => {
      for (let ui = 1; ui < c; ui++) {
        iClone.call(iHash, work).update(u).digestInto(u);
        oClone.call(oHash, work).update(u).digestInto(u);
        for (let i = 0; i < Ti.length; i++)
          Ti[i] ^= u[i];
      }
    }, "rounds"),
    output: /* @__PURE__ */ __name((DK) => {
      iHash.destroy();
      oHash.destroy();
      salted.destroy();
      work.destroy();
      clean(u);
      return DK;
    }, "output")
  };
}
__name(pbkdf2Engine, "pbkdf2Engine");
async function pbkdf2Async(hash, password, salt, opts) {
  const { c, dkLen, asyncTick, DK, outputLen, eng } = pbkdf2Init(hash, password, salt, opts);
  const abort = /* @__PURE__ */ __name(() => {
    eng.output(DK);
    clean(DK);
  }, "abort");
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += outputLen) {
    const Ti = DK.subarray(pos, pos + outputLen);
    eng.u1(ti, Ti);
    await asyncLoop(c - 1, asyncTick, () => {
      eng.rounds(2, Ti);
    }, abort);
  }
  return eng.output(DK);
}
__name(pbkdf2Async, "pbkdf2Async");

// node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/_u64.js
var fromNumH = /* @__PURE__ */ __name((n) => n / 2 ** 32 | 0, "fromNumH");
var fromNumL = /* @__PURE__ */ __name((n) => n >>> 0, "fromNumL");
function setU64FromNum(view, byteOffset, n, isLE) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE ? l : h, isLE);
  view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
__name(setU64FromNum, "setU64FromNum");

// node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
__name(Chi, "Chi");
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
__name(Maj, "Maj");
var HashMD = class {
  static {
    __name(this, "HashMD");
  }
  blockLen;
  outputLen;
  canXOF = false;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    let processed = false;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        processed = true;
        continue;
      }
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
        processed = true;
      }
    }
    this.length += data.length;
    if (processed)
      this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    buffer.fill(0, pos);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      buffer.fill(0);
    }
    setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
    this.process(view, 0);
    this.roundClean();
    const oview = out === buffer ? view : createView(out);
    const len = this.outputLen;
    const outLen = len / 4;
    const state = this.get();
    if (len % 4 || outLen > state.length)
      throw new Error("invalid outputLen");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneIntoMeta(to) {
    const { buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (pos)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);

// node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
  static {
    __name(this, "SHA2_32B");
  }
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and makes sha256 3x slower (measured).
  A = 0;
  B = 0;
  C = 0;
  D = 0;
  E = 0;
  F = 0;
  G = 0;
  H = 0;
  constructor(outputLen, IV) {
    super(64, outputLen, 8, false);
    this.A = IV[0] | 0;
    this.B = IV[1] | 0;
    this.C = IV[2] | 0;
    this.D = IV[3] | 0;
    this.E = IV[4] | 0;
    this.F = IV[5] | 0;
    this.G = IV[6] | 0;
    this.H = IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.destroyed = true;
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var _SHA256 = class extends SHA2_32B {
  static {
    __name(this, "_SHA256");
  }
  constructor() {
    super(32, SHA256_IV);
  }
};
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);

// src/identity-security.js
var encoder = new TextEncoder();
var PASSWORD_PREFIX = "pbkdf2-sha256$600000$";
function base64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}
__name(base64, "base64");
function unbase64(value) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
__name(unbase64, "unbase64");
function opaqueToken() {
  return base64(crypto.getRandomValues(new Uint8Array(32))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
__name(opaqueToken, "opaqueToken");
async function tokenDigest(token) {
  return base64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}
__name(tokenDigest, "tokenDigest");
async function modernPassword(password, salt) {
  return PASSWORD_PREFIX + base64(await pbkdf2Async(sha256, encoder.encode(password), unbase64(salt), { c: 6e5, dkLen: 32, asyncTick: 20 }));
}
__name(modernPassword, "modernPassword");
async function environmentPassword(password, salt, env) {
  if (env.AUTH_KDF_ITERATIONS === "600000") return modernPassword(password, salt);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: unbase64(salt), iterations: 1e5, hash: "SHA-256" }, key, 256);
  return "pbkdf2-sha256$100000$" + base64(new Uint8Array(hash));
}
__name(environmentPassword, "environmentPassword");
async function encryptionKey(env) {
  let bytes;
  try {
    bytes = unbase64(env.AUTH_ENCRYPTION_KEY || "");
  } catch {
  }
  if (bytes?.length !== 32) throw new ApiError(503, "Protected storage is not configured.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
__name(encryptionKey, "encryptionKey");
async function seal(env, value, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(context) }, await encryptionKey(env), encoder.encode(JSON.stringify(value)));
  return "v1." + base64(iv) + "." + base64(new Uint8Array(ciphertext));
}
__name(seal, "seal");
async function unseal(env, value, context) {
  const [version, iv, ciphertext] = String(value).split(".");
  if (version !== "v1") throw new ApiError(500, "Protected record unavailable.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unbase64(iv), additionalData: encoder.encode(context) }, await encryptionKey(env), unbase64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}
__name(unseal, "unseal");
function auditStatement(env, actor, action, entityId = null, tenantId = null) {
  return env.DB.prepare("insert into audit_log (id,actor_user_id,action,entity_id,tenant_id,created_at) values (?,?,?,?,?,?)").bind(crypto.randomUUID(), actor, action, entityId, tenantId, (/* @__PURE__ */ new Date()).toISOString());
}
__name(auditStatement, "auditStatement");
var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function encodeBase32(bytes) {
  let value = 0, bits = 0, output = "";
  for (const byte of bytes) {
    value = value << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits) output += alphabet[value << 5 - bits & 31];
  return output;
}
__name(encodeBase32, "encodeBase32");
function decodeBase32(secret) {
  let value = 0, bits = 0;
  const output = [];
  for (const char of secret) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new ApiError(400, "Invalid authenticator secret.");
    value = value << 5 | index;
    bits += 5;
    if (bits >= 8) {
      output.push(value >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}
__name(decodeBase32, "decodeBase32");
async function totpCode(secret, step) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(step));
  const key = await crypto.subtle.importKey("raw", decodeBase32(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes));
  const offset = signature.at(-1) & 15;
  const number2 = (signature[offset] & 127) << 24 | signature[offset + 1] << 16 | signature[offset + 2] << 8 | signature[offset + 3];
  return String(number2 % 1e6).padStart(6, "0");
}
__name(totpCode, "totpCode");
async function verifyTotp(secret, code, lastStep = -1, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const step = Math.floor(now / 3e4);
  for (const candidate of [step, step - 1, step + 1]) if (candidate > lastStep && await totpCode(secret, candidate) === code) return candidate;
  return null;
}
__name(verifyTotp, "verifyTotp");
async function throttleAccount(env, email) {
  if (!["production", "preview"].includes(env.ENVIRONMENT)) return;
  const digest = await tokenDigest("login:" + email), now = Math.floor(Date.now() / 1e3);
  const row = await env.DB.prepare(`insert into auth_attempts (account_digest,window_start,attempts) values (?,?,1)
    on conflict(account_digest) do update set
      attempts=case when window_start < ? then 1 else attempts+1 end,
      window_start=case when window_start < ? then excluded.window_start else window_start end
    returning attempts`).bind(digest, now, now - 900, now - 900).first();
  if (!row || row.attempts > 20) throw new ApiError(429, "Too many authentication attempts. Try again later.");
}
__name(throttleAccount, "throttleAccount");
async function issueToken(env, userId, purpose, seconds) {
  const token = opaqueToken(), digest = await tokenDigest(token), now = /* @__PURE__ */ new Date();
  await env.DB.batch([
    env.DB.prepare("delete from security_tokens where user_id=? and purpose=?").bind(userId, purpose),
    env.DB.prepare("insert into security_tokens values (?,?,?,?,?)").bind(digest, userId, purpose, new Date(now.getTime() + seconds * 1e3).toISOString(), now.toISOString())
  ]);
  return token;
}
__name(issueToken, "issueToken");
async function mfaChallenge(env, userId) {
  return issueToken(env, userId, "mfa", 300);
}
__name(mfaChallenge, "mfaChallenge");
async function sendIdentityEmail(env, user, purpose) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.PUBLIC_ORIGIN) throw new ApiError(503, "Account email delivery is not configured.");
  const origin = new URL(env.PUBLIC_ORIGIN);
  if (origin.protocol !== "https:") throw new ApiError(503, "Account email delivery is not configured.");
  const token = await issueToken(env, user.id, purpose, purpose === "verify" ? 3600 : 900);
  const link = new URL("/account-security.html", origin);
  link.hash = new URLSearchParams({ purpose, token }).toString();
  const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(1e4), headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY, "idempotency-key": purpose + "/" + await tokenDigest(token) }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [user.email], subject: purpose === "verify" ? "Verify your My Way email" : "Reset your My Way password", text: "Open this link to " + (purpose === "verify" ? "verify your email" : "reset your password") + ":\n" + link.href + "\nIf you did not request this, ignore this email." }) });
  if (!response.ok) {
    await env.DB.prepare("delete from security_tokens where digest=?").bind(await tokenDigest(token)).run();
    throw new ApiError(503, "Account email could not be delivered.");
  }
}
__name(sendIdentityEmail, "sendIdentityEmail");
async function handleIdentityApi(request, env, ctx) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/auth/security") && !["/api/auth/verification/request", "/api/auth/verification/confirm", "/api/auth/password/request", "/api/auth/password/reset", "/api/auth/mfa/confirm", "/api/admin/owners"].includes(path)) return null;
  if (!env.DB) throw new ApiError(503, "Storage unavailable.");
  const { json: json2, getSessionUser: getSessionUser2, createSession: createSession2, sessionCookieHeader: sessionCookieHeader2, jsonWithCookie: jsonWithCookie2, isAuthorized: isAuthorized2 } = ctx;
  if (path === "/api/auth/password/request" && request.method === "POST") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new ApiError(503, "Account recovery email is not configured.");
    const payload = await readJson(request), email = String(payload.email || "").trim().toLowerCase();
    await throttleAccount(env, email);
    const user2 = await env.DB.prepare("select id,email from users where email=?").bind(email).first();
    if (user2) await sendIdentityEmail(env, user2, "reset");
    return json2({ ok: true, message: "If that account exists, recovery instructions will be emailed." });
  }
  if (["/api/auth/password/reset", "/api/auth/verification/confirm"].includes(path) && request.method === "POST") {
    const payload = await readJson(request), purpose = path.includes("reset") ? "reset" : "verify";
    if (!/^[A-Za-z0-9_-]{43}$/.test(payload.token || "")) throw new ApiError(400, "Invalid or expired link.");
    const digest = await tokenDigest(payload.token), now = (/* @__PURE__ */ new Date()).toISOString();
    const token = await env.DB.prepare("select user_id from security_tokens where digest=? and purpose=? and expires_at>?").bind(digest, purpose, now).first();
    if (!token) throw new ApiError(400, "Invalid or expired link.");
    let update;
    if (purpose === "reset") {
      if (typeof payload.password !== "string" || payload.password.length < 15 || payload.password.length > 128) throw new ApiError(400, "Use a password between 15 and 128 characters.");
      const salt = base64(crypto.getRandomValues(new Uint8Array(16))), hash = await environmentPassword(payload.password, salt, env);
      update = env.DB.prepare(`update users set password_hash=?,password_salt=? where id=(select user_id from security_tokens where digest=? and purpose='reset' and expires_at>?) returning id`).bind(hash, salt, digest, now);
    } else update = env.DB.prepare(`update users set email_verified_at=? where id=(select user_id from security_tokens where digest=? and purpose='verify' and expires_at>?) returning id`).bind(now, digest, now);
    const statements = [update];
    if (purpose === "reset") statements.push(env.DB.prepare("delete from sessions where user_id=(select user_id from security_tokens where digest=? and purpose=? and expires_at>?)").bind(digest, purpose, now));
    statements.push(env.DB.prepare("insert into audit_log select ?,user_id,?,null,null,? from security_tokens where digest=? and purpose=? and expires_at>?").bind(crypto.randomUUID(), "auth." + purpose, now, digest, purpose, now));
    statements.push(env.DB.prepare("delete from security_tokens where digest=? and purpose=? and expires_at>?").bind(digest, purpose, now));
    const results = await env.DB.batch(statements);
    if (!results[0].results?.length) throw new ApiError(400, "Invalid or expired link.");
    return json2({ ok: true, message: purpose === "reset" ? "Password changed. Sign in again." : "Email verified." });
  }
  if (path === "/api/auth/mfa/confirm" && request.method === "POST") {
    const payload = await readJson(request), digest = await tokenDigest(String(payload.challenge || "")), now = (/* @__PURE__ */ new Date()).toISOString();
    await throttleAccount(env, "mfa:" + digest);
    const row = await env.DB.prepare(`select u.id,u.totp_secret_encrypted,u.totp_last_step from security_tokens t join users u on u.id=t.user_id where t.digest=? and t.purpose='mfa' and t.expires_at>?`).bind(digest, now).first();
    if (!row?.totp_secret_encrypted) throw new ApiError(401, "Invalid authenticator challenge.");
    const secret = await unseal(env, row.totp_secret_encrypted, "totp:" + row.id), step = await verifyTotp(secret, payload.code, row.totp_last_step);
    if (step === null) throw new ApiError(401, "Invalid or already used authenticator code.");
    const results = await env.DB.batch([
      env.DB.prepare(`update users set totp_last_step=? where id=? and totp_last_step<? and exists(select 1 from security_tokens where digest=? and purpose='mfa' and expires_at>?) returning id`).bind(step, row.id, step, digest, now),
      env.DB.prepare("delete from security_tokens where digest=?").bind(digest)
    ]);
    if (!results[0].results?.length) throw new ApiError(401, "Authenticator challenge already used.");
    const user2 = await env.DB.prepare("select id,name,email,is_creator,email_verified_at,totp_secret_encrypted from users where id=?").bind(row.id).first();
    const cookie = await createSession2(env, row.id, true);
    return jsonWithCookie2({ ok: true, user: ctx.publicUser(user2) }, 200, sessionCookieHeader2(request, cookie, 86400));
  }
  if (path === "/api/admin/owners") {
    if (request.method !== "POST" || !isAuthorized2(request, env)) throw new ApiError(401, "Administrator authorization required.");
    const payload = await readJson(request), user2 = await env.DB.prepare("select id,email_verified_at,totp_secret_encrypted from users where email=?").bind(String(payload.email || "").trim().toLowerCase()).first();
    if (!user2?.email_verified_at || !user2.totp_secret_encrypted) throw new ApiError(409, "Owner must verify email and enroll MFA first.");
    await env.DB.batch([env.DB.prepare("insert into platform_roles values (?,'owner') on conflict(user_id) do nothing").bind(user2.id), auditStatement(env, "bootstrap", "owner.granted", user2.id)]);
    return json2({ ok: true });
  }
  const user = await getSessionUser2(request, env);
  if (!user) throw new ApiError(401, "Sign in required.");
  if (path === "/api/auth/security" && request.method === "GET") {
    const { results } = await env.DB.prepare("select created_at,expires_at,mfa_verified_at from sessions where user_id=? order by created_at desc").bind(user.id).all();
    return json2({ ok: true, emailVerified: !!user.email_verified_at, mfaEnabled: !!user.totp_secret_encrypted, emailConfigured: !!env.RESEND_API_KEY && !!env.EMAIL_FROM, sessions: results || [] });
  }
  if (path === "/api/auth/verification/request" && request.method === "POST") {
    await readJson(request);
    await sendIdentityEmail(env, user, "verify");
    return json2({ ok: true, message: "Verification email sent." });
  }
  if (path === "/api/auth/security/revoke-sessions" && request.method === "POST") {
    await readJson(request);
    await env.DB.batch([env.DB.prepare("delete from sessions where user_id=?").bind(user.id), auditStatement(env, user.id, "auth.sessions.revoked")]);
    return jsonWithCookie2({ ok: true }, 200, ctx.clearSessionCookieHeader(request));
  }
  if (path === "/api/auth/security/mfa/enroll" && request.method === "POST") {
    await readJson(request);
    if (!user.email_verified_at) throw new ApiError(403, "Verify your email before enrolling MFA.");
    if (user.totp_secret_encrypted) throw new ApiError(409, "MFA is already enabled.");
    if (!user.session_created_at || Date.parse(user.session_created_at) < Date.now() - 6e5) throw new ApiError(403, "Sign in again before enrolling MFA.");
    const secret = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    await env.DB.prepare("update users set totp_pending_encrypted=? where id=?").bind(await seal(env, secret, "totp-pending:" + user.id), user.id).run();
    return json2({ ok: true, secret, uri: "otpauth://totp/" + encodeURIComponent("My Way:" + user.email) + "?secret=" + secret + "&issuer=My%20Way&algorithm=SHA1&digits=6&period=30" });
  }
  if (path === "/api/auth/security/mfa/activate" && request.method === "POST") {
    const payload = await readJson(request);
    await throttleAccount(env, "mfa-enroll:" + user.id);
    if (!user.totp_pending_encrypted || user.totp_secret_encrypted) throw new ApiError(409, "Start MFA enrollment first.");
    const secret = await unseal(env, user.totp_pending_encrypted, "totp-pending:" + user.id), step = await verifyTotp(secret, payload.code);
    if (step === null) throw new ApiError(400, "Invalid authenticator code.");
    const ciphertext = await seal(env, secret, "totp:" + user.id), cookie = ctx.parseCookies(request).mwe_session_v2;
    const result = await env.DB.batch([
      env.DB.prepare("update users set totp_secret_encrypted=?,totp_pending_encrypted=null,totp_last_step=? where id=? and totp_pending_encrypted=? and totp_secret_encrypted is null returning id").bind(ciphertext, step, user.id, user.totp_pending_encrypted),
      env.DB.prepare("update sessions set mfa_verified_at=? where token=? and user_id=? and exists(select 1 from users where id=? and totp_secret_encrypted=?)").bind((/* @__PURE__ */ new Date()).toISOString(), await ctx.digestToken(cookie), user.id, user.id, ciphertext),
      auditStatement(env, user.id, "auth.mfa.enabled")
    ]);
    if (!result[0].results?.length) throw new ApiError(409, "Enrollment changed. Start again.");
    return json2({ ok: true });
  }
  throw new ApiError(405, "Method not allowed.");
}
__name(handleIdentityApi, "handleIdentityApi");

// src/trusted-platform.js
var kinds = ["churches", "meditation", "events", "store", "products", "channels", "resources"];
var privateKinds = ["prayer", "reflection", "ride", "visit", "salvation", "foundation", "message", "settings"];
var forbidden = /* @__PURE__ */ new Set(["createdBy", "tenantId", "createdAt", "updatedAt", "revision", "verified", "ticketsSold", "followers", "items", "rating", "orders", "amountPaidCents", "attachmentData", "totpSecret", "password", "isOwner", "role"]);
var fields = {
  churches: ["name", "city", "country", "postal", "denomination", "pastor", "pastorTitle", "pastorBio", "pastorPhoto", "about", "location", "email", "phone", "phoneLabel", "emailHref", "website", "language", "worship", "ministries", "sunday", "midweek", "photo", "logo", "tagline", "livestream", "history", "vision", "mission", "statementOfFaith", "firstVisit", "parkingInformation", "childrenInformation", "gallery"],
  meditation: ["title", "subtitle", "category", "categoryLabel", "theme", "template", "toneFreq", "cover", "selectedAudio", "audioTracks", "verses", "icon", "commentsEnabled"],
  events: ["title", "churchId", "eventType", "startsAt", "endsAt", "venueName", "city", "country", "coverImageUrl", "registrationRequired", "ticketPriceCents", "currency", "totalTickets", "isFeatured", "isPromoted", "registrationUrl", "livestreamUrl", "directionsUrl", "description", "highlights", "expectations", "speakers", "schedule", "faqs", "ownerName"],
  store: ["name", "ownerName", "category", "description", "image", "email", "liveUrl", "live"],
  products: ["title", "storeId", "seller", "sellerType", "category", "description", "price", "compareAt", "inventory", "status", "featured", "image", "itemType", "serviceType", "packages"],
  channels: ["name", "owner", "handle", "topic", "description", "format", "cover", "avatar", "live", "liveUrl", "posts"],
  resources: ["title", "creator", "topic", "description", "type", "format", "duration", "image", "access", "price", "sourceUrl", "pages", "audioSrc", "embedUrl"]
};
function boolean(value) {
  return value === true || value === 1 || value === "true";
}
__name(boolean, "boolean");
function number(value, field, maximum = 1e8) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > maximum) throw new ApiError(400, "Invalid " + field + ".");
  return n;
}
__name(number, "number");
function whole(value, field, max = 1e6) {
  const n = number(value, field, max);
  if (!Number.isSafeInteger(n)) throw new ApiError(400, field + " must be a whole number.");
  return n;
}
__name(whole, "whole");
function sanitizeValue(value, key = "") {
  if (typeof value === "string") {
    if (/url$|^(website|image|photo|cover|logo|pastorPhoto|src|audioSrc)$/i.test(key) && value && value !== "#") {
      const url = new URL(value, "https://assets.invalid/");
      if (url.protocol !== "https:" || url.username || url.password) throw new ApiError(400, "Use a safe HTTPS media URL.");
    }
    if (/^[a-z][a-z0-9_-]*$/i.test(key) && ["icon", "theme", "template", "categoryLabel"].includes(key) && /[<>"'\\]/.test(value)) throw new ApiError(400, "Invalid display value.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) throw new ApiError(400, "Too many entries.");
    return value.map((v) => sanitizeValue(v, key));
  }
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !forbidden.has(k) && !["__proto__", "constructor", "prototype"].includes(k)).map(([k, v]) => [k, sanitizeValue(v, k)]));
  return value;
}
__name(sanitizeValue, "sanitizeValue");
function validateEntity(kind, input) {
  if (!kinds.includes(kind) || !input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid content.");
  const data = Object.fromEntries(fields[kind].filter((k) => input[k] !== void 0).map((k) => [k, sanitizeValue(input[k], k)]));
  if (!String(data.name || data.title || "").trim()) throw new ApiError(400, "A title or name is required.");
  if (kind === "churches") {
    if (!data.city || !data.country) throw new ApiError(400, "City and country are required.");
    if (data.livestream) {
      data.livestream.enabled = boolean(data.livestream.enabled);
      data.livestream.paid = false;
      if (data.livestream.enabled && !data.livestream.url) throw new ApiError(400, "Broadcast URL required.");
    }
  }
  if (kind === "events") {
    const start = Date.parse(data.startsAt), end = Date.parse(data.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new ApiError(400, "Use valid event dates with end after start.");
    if (!["in-person", "online", "streamed", "hybrid"].includes(data.eventType)) throw new ApiError(400, "Invalid event format.");
    data.ticketPriceCents = whole(data.ticketPriceCents, "Ticket price");
    data.totalTickets = whole(data.totalTickets, "Capacity");
    if (!["CAD", "USD", "GBP", "EUR"].includes(data.currency)) throw new ApiError(400, "Unsupported currency.");
  }
  if (kind === "products") {
    data.price = number(data.price, "Price", 1e5);
    if (!Number.isSafeInteger(Math.round(data.price * 100)) || Math.abs(data.price * 100 - Math.round(data.price * 100)) > 1e-7) throw new ApiError(400, "Use prices in whole minor units.");
    data.inventory = whole(data.inventory, "Inventory");
    if (!["Draft", "Active", "Archived"].includes(data.status)) throw new ApiError(400, "Invalid product state.");
  }
  if (kind === "resources") {
    data.price = number(data.price, "Price", 1e5);
    if (!["Free", "Paid"].includes(data.access) || data.access === "Paid" && data.price <= 0) throw new ApiError(400, "Invalid resource access or price.");
    if (data.access === "Free") data.price = 0;
  }
  if (kind === "meditation") {
    data.toneFreq = number(data.toneFreq, "Tone", 2e3);
    if (data.toneFreq < 20 || !Array.isArray(data.verses) || !data.verses.length) throw new ApiError(400, "Add scripture and a tone between 20 and 2000 Hz.");
    data.commentsEnabled = boolean(data.commentsEnabled);
  }
  for (const key of ["live", "featured", "registrationRequired", "isFeatured", "isPromoted"]) if (key in data) data[key] = boolean(data[key]);
  return data;
}
__name(validateEntity, "validateEntity");
async function requireUser(request, env, ctx) {
  const user = await ctx.getSessionUser(request, env);
  if (!user) throw new ApiError(401, "Sign in required.");
  return user;
}
__name(requireUser, "requireUser");
async function isOwner(env, user) {
  if (!user?.email_verified_at || !user.totp_secret_encrypted || !user.mfa_verified_at) return false;
  return !!await env.DB.prepare("select user_id from platform_roles where user_id=? and role='owner'").bind(user.id).first();
}
__name(isOwner, "isOwner");
async function requireOwner(request, env, ctx) {
  const user = await requireUser(request, env, ctx);
  if (!await isOwner(env, user)) throw new ApiError(403, "Verified platform owner with MFA required.");
  return user;
}
__name(requireOwner, "requireOwner");
async function ownTenant(env, user) {
  if (!user.is_creator) throw new ApiError(403, "Creator account required.");
  const existing = await env.DB.prepare("select id from tenants where owner_user_id=?").bind(user.id).first();
  if (existing) return existing.id;
  const id = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.batch([
    env.DB.prepare("insert into tenants values (?,?,?,?) on conflict(owner_user_id) do nothing").bind(id, user.id, user.name, now),
    env.DB.prepare("insert into tenant_memberships select id,?,'owner' from tenants where owner_user_id=? on conflict(tenant_id,user_id) do nothing").bind(user.id, user.id)
  ]);
  return (await env.DB.prepare("select id from tenants where owner_user_id=?").bind(user.id).first()).id;
}
__name(ownTenant, "ownTenant");
async function membership(env, userId, tenantId) {
  return env.DB.prepare("select role from tenant_memberships where tenant_id=? and user_id=?").bind(tenantId, userId).first();
}
__name(membership, "membership");
function entityRecord(row, publicView = false) {
  const data = JSON.parse(row.data_json);
  if (publicView && row.kind === "resources" && data.access === "Paid") for (const field of ["sourceUrl", "pages", "audioSrc", "embedUrl"]) delete data[field];
  if (publicView && row.kind === "resources") delete data.sourceUrl;
  return { ...data, id: row.id, kind: row.kind, tenantId: row.tenant_id, createdBy: publicView ? "tenant:" + row.tenant_id : row.created_by, state: row.state, publicationState: row.state, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, verified: row.state === "published" };
}
__name(entityRecord, "entityRecord");
async function checkRelated(env, user, kind, data, tenantId, owner) {
  const id = kind === "products" ? data.storeId : kind === "events" ? data.churchId : null;
  if (!id) {
    if (kind === "products") throw new ApiError(400, "Choose a store you manage.");
    return;
  }
  const parent = await env.DB.prepare("select kind,tenant_id from platform_entities where id=?").bind(id).first();
  if (!parent || parent.kind !== (kind === "products" ? "store" : "churches") || parent.tenant_id !== tenantId) throw new ApiError(403, "Related content must belong to the same tenant.");
  if (!owner && !["owner", "editor"].includes((await membership(env, user.id, parent.tenant_id))?.role)) throw new ApiError(403, "Related content is not yours to manage.");
}
__name(checkRelated, "checkRelated");
function projectionStatements(env, kind, id, data, state, updatedAt) {
  if (kind === "churches") return [env.DB.prepare(`insert into churches (id,name,city,country,postal_code,denomination,language,worship_style,website,phone,email,cover_image_url,livestream_enabled,livestream_paid,livestream_url,description,is_verified,created_at)
 select ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? where exists(select 1 from platform_entities where id=? and updated_at=?)
 on conflict(id) do update set name=excluded.name,city=excluded.city,country=excluded.country,postal_code=excluded.postal_code,denomination=excluded.denomination,language=excluded.language,worship_style=excluded.worship_style,website=excluded.website,phone=excluded.phone,email=excluded.email,cover_image_url=excluded.cover_image_url,livestream_enabled=excluded.livestream_enabled,livestream_paid=0,livestream_url=excluded.livestream_url,description=excluded.description,is_verified=excluded.is_verified`).bind(id, data.name, data.city, data.country, data.postal || "", data.denomination || "", data.language || "", data.worship || "", data.website || "", data.phone || "", data.email || "", data.photo || "", Number(state === "published" && !!data.livestream?.enabled), 0, data.livestream?.url || "", data.about || "", Number(state === "published"), updatedAt, id, updatedAt)];
  if (kind === "events") return [env.DB.prepare(`insert into events (id,church_id,title,event_type,starts_at,ends_at,venue_name,city,country,cover_image_url,registration_required,ticket_price_cents,currency,total_tickets,tickets_sold,is_featured,is_promoted,registration_url,livestream_url,directions_url,description)
 select ?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,? where exists(select 1 from platform_entities where id=? and updated_at=?)
 on conflict(id) do update set church_id=excluded.church_id,title=excluded.title,event_type=excluded.event_type,starts_at=excluded.starts_at,ends_at=excluded.ends_at,venue_name=excluded.venue_name,city=excluded.city,country=excluded.country,cover_image_url=excluded.cover_image_url,registration_required=excluded.registration_required,ticket_price_cents=excluded.ticket_price_cents,currency=excluded.currency,total_tickets=excluded.total_tickets,is_featured=excluded.is_featured,is_promoted=excluded.is_promoted,registration_url=excluded.registration_url,livestream_url=excluded.livestream_url,directions_url=excluded.directions_url,description=excluded.description`).bind(id, data.churchId || null, data.title, data.eventType, data.startsAt, data.endsAt, data.venueName || "", data.city || "", data.country || "", data.coverImageUrl || "", Number(!!data.registrationRequired), data.ticketPriceCents, data.currency, data.totalTickets, Number(!!data.isFeatured), Number(!!data.isPromoted), data.registrationUrl || "", data.livestreamUrl || "", data.directionsUrl || "", data.description || "", id, updatedAt)];
  return [];
}
__name(projectionStatements, "projectionStatements");
async function writeEntity(request, env, ctx, kind, id) {
  const user = await requireUser(request, env, ctx), owner = await isOwner(env, user), input = await readJson(request);
  const existing = id ? await env.DB.prepare("select * from platform_entities where id=? and kind=?").bind(id, kind).first() : null;
  if (id && !existing) throw new ApiError(404, "Content not found.");
  const tenantId = existing?.tenant_id || await ownTenant(env, { ...user, is_creator: owner || user.is_creator });
  if (!owner && !["owner", "editor"].includes((await membership(env, user.id, tenantId))?.role)) throw new ApiError(403, "You cannot manage this tenant.");
  if (existing && Number(input.revision) !== existing.revision) throw new ApiError(409, "Content changed. Reload before saving.");
  const data = validateEntity(kind, { ...existing ? JSON.parse(existing.data_json) : {}, ...input });
  await checkRelated(env, user, kind, data, tenantId, owner);
  let state = input.publicationState || (owner ? existing?.state : "pending") || "pending";
  if (!["draft", "pending", "published", "archived"].includes(state)) throw new ApiError(400, "Invalid publication state.");
  if (state === "published" && (!owner || !user.email_verified_at)) throw new ApiError(403, "Platform owner approval is required to publish.");
  if (kind === "events") {
    const stock = await env.DB.prepare("select tickets_sold from events where id=?").bind(id || "").first();
    if (data.totalTickets > 0 && data.totalTickets < (stock?.tickets_sold || 0)) throw new ApiError(409, "Capacity cannot be below existing reservations.");
  }
  const entityId = id || kind + "-" + crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString(), updateStamp = now.replace("Z", String(crypto.getRandomValues(new Uint32Array(1))[0]).padStart(10, "0") + "Z");
  const statement = existing ? env.DB.prepare("update platform_entities set data_json=?,state=?,revision=revision+1,updated_at=? where id=? and revision=? returning *").bind(JSON.stringify(data), state, updateStamp, entityId, existing.revision) : env.DB.prepare("insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values (?,?,?,?,?,?,?,?) returning *").bind(entityId, kind, tenantId, user.id, state, JSON.stringify(data), now, updateStamp);
  const results = await env.DB.batch([statement, ...projectionStatements(env, kind, entityId, data, state, updateStamp), env.DB.prepare("insert into audit_log select ?,?,?,?,?,? where exists(select 1 from platform_entities where id=? and updated_at=?)").bind(crypto.randomUUID(), user.id, existing ? "entity.updated" : "entity.created", entityId, tenantId, now, entityId, updateStamp)]);
  if (!results[0].results?.length) throw new ApiError(409, "Content changed. Reload before saving.");
  return ctx.json({ ok: true, record: entityRecord(results[0].results[0]) }, existing ? 200 : 201);
}
__name(writeEntity, "writeEntity");
async function handlePlatformApi(request, env, ctx) {
  const url = new URL(request.url), parts = url.pathname.split("/").filter(Boolean), scope = parts[1];
  if (!["catalog", "workspace", "private", "admin-audit", "tenant-members", "resource-material"].includes(scope)) return null;
  if (!env.DB) throw new ApiError(503, "Storage unavailable.");
  if (scope === "catalog" && request.method === "GET") {
    const kind = parts[2];
    if (kind && !kinds.includes(kind)) throw new ApiError(404, "Collection not found.");
    const { results } = await env.DB.prepare(`select * from platform_entities where state='published' ${kind ? "and kind=?" : ""} order by updated_at desc limit 1000`).bind(...kind ? [kind] : []).all();
    return ctx.json({ ok: true, records: (results || []).map((row) => entityRecord(row, true)) });
  }
  if (scope === "resource-material") {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    const row = await env.DB.prepare("select * from platform_entities where id=? and kind='resources' and state='published'").bind(parts[2] || "").first();
    if (!row) throw new ApiError(404, "Resource not available.");
    const data = JSON.parse(row.data_json);
    if (data.access === "Paid") {
      const user2 = await requireUser(request, env, ctx);
      if (!await env.DB.prepare("select order_id from entitlements where user_id=? and entity_id=? and revoked_at is null").bind(user2.id, row.id).first()) throw new ApiError(403, "Purchase verified access before opening this resource.");
    }
    const allowed = String(env.RESOURCE_HOSTS || "").split(",").map((v) => v.trim()).filter(Boolean);
    for (const field of ["sourceUrl", "audioSrc", "embedUrl"]) if (data[field]) {
      const material = new URL(data[field]);
      if (material.protocol !== "https:" || !allowed.includes(material.hostname)) throw new ApiError(503, "Resource delivery awaits a trusted material provider.");
    }
    return ctx.json({ ok: true, material: { pages: data.pages || [], sourceUrl: data.sourceUrl || null, audioSrc: data.audioSrc || null, embedUrl: data.embedUrl || null } });
  }
  const user = await requireUser(request, env, ctx), owner = await isOwner(env, user);
  if (scope === "workspace") {
    if (request.method === "GET") {
      const memberships = await env.DB.prepare("select tenant_id,role from tenant_memberships where user_id=?").bind(user.id).all();
      if (!owner && !user.is_creator && !memberships.results?.length) throw new ApiError(403, "Creator access required.");
      if (user.is_creator && !memberships.results?.length) await ownTenant(env, user);
      const { results } = await env.DB.prepare(owner ? "select *,1 as can_manage from platform_entities order by updated_at desc limit 1000" : `select e.*,m.role in ('owner','editor') as can_manage from platform_entities e join tenant_memberships m on m.tenant_id=e.tenant_id where m.user_id=? order by e.updated_at desc limit 1000`).bind(...owner ? [] : [user.id]).all();
      return ctx.json({ ok: true, role: owner ? "owner" : "creator", records: (results || []).map((row) => ({ ...entityRecord(row), canManage: !!row.can_manage })) });
    }
    const kind = parts[2];
    if (!kinds.includes(kind)) throw new ApiError(404, "Collection not found.");
    if (["POST", "PUT"].includes(request.method)) return writeEntity(request, env, ctx, kind, parts[3]);
    throw new ApiError(405, "Method not allowed. Archive content through its editor.");
  }
  if (scope === "admin-audit") {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    if (!owner) throw new ApiError(403, "Platform owner with MFA required.");
    const { results } = await env.DB.prepare("select actor_user_id,action,entity_id,tenant_id,created_at from audit_log order by created_at desc limit 100").all();
    return ctx.json({ ok: true, events: results || [] });
  }
  if (scope === "tenant-members") {
    const tenantId = parts[2], role = (await membership(env, user.id, tenantId))?.role;
    if (!owner && role !== "owner") throw new ApiError(403, "Tenant owner required.");
    if (request.method === "GET") {
      const { results } = await env.DB.prepare("select u.email,u.name,m.role from tenant_memberships m join users u on u.id=m.user_id where m.tenant_id=?").bind(tenantId).all();
      return ctx.json({ ok: true, members: results || [] });
    }
    if (request.method === "POST") {
      if (!user.email_verified_at || !user.mfa_verified_at) throw new ApiError(403, "Verify email and MFA before granting access.");
      const input = await readJson(request);
      if (!["editor", "viewer", "pastor"].includes(input.role)) throw new ApiError(400, "Invalid membership role.");
      const member = await env.DB.prepare("select id,email_verified_at from users where email=?").bind(String(input.email || "").trim().toLowerCase()).first();
      if (!member?.email_verified_at) throw new ApiError(409, "Recipient must verify their account first.");
      await env.DB.batch([env.DB.prepare("insert into tenant_memberships values (?,?,?) on conflict(tenant_id,user_id) do update set role=excluded.role where role!='owner'").bind(tenantId, member.id, input.role), auditStatement(env, user.id, "membership.changed", member.id, tenantId)]);
      return ctx.json({ ok: true });
    }
    throw new ApiError(405, "Method not allowed.");
  }
  if (scope === "private") {
    const kind = parts[2];
    if (kind && !privateKinds.includes(kind)) throw new ApiError(404, "Private collection not found.");
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(`select p.* from private_records p where (p.user_id=? or (p.visibility='recipient' and p.recipient_user_id=?) or (p.visibility='pastors' and exists(select 1 from tenant_memberships m where m.tenant_id=p.tenant_id and m.user_id=? and m.role='pastor'))) ${kind ? "and p.kind=?" : ""} order by p.created_at desc limit 100`).bind(user.id, user.id, user.id, ...kind ? [kind] : []).all();
      const records = await Promise.all((results || []).map(async (row) => ({ ...await unseal(env, row.data_encrypted, "private:" + row.id + ":" + row.user_id), id: row.id, kind: row.kind, userId: row.user_id, recipientUserId: row.recipient_user_id, entityId: row.entity_id, status: row.status, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, direction: row.user_id === user.id ? "sent" : "received" })));
      return ctx.json({ ok: true, records });
    }
    if (request.method === "POST" && kind) {
      const input = await readJson(request), id = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
      const entityId = String(input.entityId || input.churchId || "") || null;
      const entity = entityId ? await env.DB.prepare("select e.*,t.owner_user_id from platform_entities e join tenants t on t.id=e.tenant_id where e.id=? and e.state='published'").bind(entityId).first() : null;
      if (entityId && !entity) throw new ApiError(404, "Destination not available.");
      let recipient = null, visibility = "private";
      if (kind === "message") {
        if (!entity || entity.owner_user_id.startsWith("system:")) throw new ApiError(409, "Recipient has not activated their account.");
        recipient = entity.owner_user_id;
        visibility = "recipient";
      }
      if (kind === "message" && input.replyTo) {
        const original = await env.DB.prepare("select * from private_records where id=? and kind='message' and entity_id=? and (user_id=? or recipient_user_id=?)").bind(input.replyTo, entityId, user.id, user.id).first();
        if (!original) throw new ApiError(404, "Conversation not found.");
        recipient = original.user_id === user.id ? original.recipient_user_id : original.user_id;
      } else if (["prayer", "visit", "ride", "salvation"].includes(kind) && input.visibility === "pastors") {
        if (!entity) throw new ApiError(400, "Choose a church for pastoral follow-up.");
        visibility = "pastors";
      }
      const data = Object.fromEntries(Object.entries(input).filter(([key]) => !forbidden.has(key) && !["recipientUserId", "userId", "visibility", "status", "id", "kind"].includes(key)));
      if (kind === "settings" && data.forwardingEnabled) throw new ApiError(409, "Automatic forwarding awaits verified email delivery.");
      if (kind === "message") {
        data.threadId = "entity:" + entity.id + ":" + [user.id, recipient].sort().join(":");
        data.participant = JSON.parse(entity.data_json).name || JSON.parse(entity.data_json).title;
        data.participantType = entity.kind;
        if (!String(data.body || "").trim()) throw new ApiError(400, "Message text required.");
      }
      const encrypted = await seal(env, data, "private:" + id + ":" + user.id);
      await env.DB.batch([env.DB.prepare("insert into private_records (id,user_id,tenant_id,kind,entity_id,recipient_user_id,visibility,data_encrypted,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?)").bind(id, user.id, entity?.tenant_id || null, kind, entityId, recipient, visibility, encrypted, now, now), auditStatement(env, user.id, "private." + kind + ".created", id, entity?.tenant_id || null)]);
      return ctx.json({ ok: true, record: { ...data, id, kind, status: "new", revision: 1, createdAt: now, direction: "sent" } }, 201);
    }
    if (request.method === "PUT" && kind && parts[3]) {
      const input = await readJson(request), row = await env.DB.prepare("select * from private_records where id=? and kind=? and (user_id=? or recipient_user_id=? or (visibility='pastors' and exists(select 1 from tenant_memberships m where m.tenant_id=private_records.tenant_id and m.user_id=? and m.role='pastor')))").bind(parts[3], kind, user.id, user.id, user.id).first();
      if (!row) throw new ApiError(404, "Private record not found.");
      const pastoral = row.visibility === "pastors" && (await membership(env, user.id, row.tenant_id))?.role === "pastor";
      if (!pastoral && !["read", "cancelled"].includes(input.status)) throw new ApiError(403, "Pastoral follow-up must be confirmed by an assigned pastor.");
      if (!["new", "read", "contacted", "completed", "cancelled", ...kind === "ride" ? ["stage2_scheduling", "confirmed"] : []].includes(input.status)) throw new ApiError(400, "Invalid status.");
      const data = await unseal(env, row.data_encrypted, "private:" + row.id + ":" + row.user_id);
      if (kind === "ride" && pastoral) {
        data.stage = input.status === "stage2_scheduling" || input.status === "confirmed" ? 2 : 1;
        data.stage1Confirmed = data.stage === 2;
        data.stage2Confirmed = input.status === "confirmed";
        if (input.status === "confirmed") {
          data.driver = String(input.driver || "Assigned by church");
          data.pickupWindow = String(input.pickupWindow || "Contact your church for pickup details");
        }
      }
      const result = await env.DB.prepare("update private_records set status=?,data_encrypted=?,revision=revision+1,updated_at=? where id=? and revision=? returning id").bind(input.status, await seal(env, data, "private:" + row.id + ":" + row.user_id), (/* @__PURE__ */ new Date()).toISOString(), row.id, input.revision).first();
      if (!result) throw new ApiError(409, "Record changed. Reload.");
      await auditStatement(env, user.id, "private.status.changed", row.id, row.tenant_id).run();
      return ctx.json({ ok: true });
    }
    if (request.method === "DELETE" && kind && parts[3]) {
      const result = await env.DB.prepare("delete from private_records where id=? and kind=? and user_id=? returning id").bind(parts[3], kind, user.id).first();
      if (!result) throw new ApiError(404, "Private record not found.");
      await auditStatement(env, user.id, "private.deleted", parts[3]).run();
      return ctx.json({ ok: true });
    }
  }
  throw new ApiError(405, "Method not allowed.");
}
__name(handlePlatformApi, "handlePlatformApi");

// src/spotlight.js
var contentTypes = /* @__PURE__ */ new Set(["short", "long-preview", "church", "channel", "event", "live"]);
var states = /* @__PURE__ */ new Set(["draft", "pending", "needs-changes", "approved", "scheduled", "live", "rejected", "expired"]);
var placements = /* @__PURE__ */ new Set(["organic", "editorial", "sponsored"]);
function cleanText(value, maximum, label, required = false) {
  const text = String(value || "").trim();
  if (required && !text) throw new ApiError(400, label + " is required.");
  if (text.length > maximum) throw new ApiError(400, label + " is too long.");
  return text;
}
__name(cleanText, "cleanText");
function safeUrl(value, label, required = false) {
  const text = cleanText(value, 2e3, label, required);
  if (!text) return null;
  if (/^(?:\/|\.\/)?(?:assets\/|app\.html|channels\.html|church-profile\.html|event-profile\.html)/i.test(text)) return text;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new ApiError(400, "Use a valid " + label.toLowerCase() + ".");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new ApiError(400, label + " must use HTTPS.");
  return parsed.toString();
}
__name(safeUrl, "safeUrl");
function integer(value, label, maximum = 86400) {
  if (value === "" || value === null || value === void 0) return null;
  const number2 = Number(value);
  if (!Number.isSafeInteger(number2) || number2 < 0 || number2 > maximum) throw new ApiError(400, "Invalid " + label.toLowerCase() + ".");
  return number2;
}
__name(integer, "integer");
function isoDate(value, label) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new ApiError(400, "Invalid " + label.toLowerCase() + ".");
  return new Date(time).toISOString();
}
__name(isoDate, "isoDate");
function itemRecord(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    channelEntityId: row.channel_entity_id,
    subjectEntityId: row.subject_entity_id,
    contentType: row.content_type,
    title: row.title,
    caption: row.caption,
    creatorName: row.creator_name,
    creatorHandle: row.creator_handle,
    creatorAvatarUrl: row.creator_avatar_url,
    mediaUrl: row.media_url,
    posterUrl: row.poster_url,
    fullContentUrl: row.full_content_url,
    previewSource: row.preview_source,
    previewStartSeconds: row.preview_start_seconds,
    previewEndSeconds: row.preview_end_seconds,
    durationSeconds: row.duration_seconds,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    status: row.status,
    placementKind: row.placement_kind,
    moderationNote: row.moderation_note,
    commentsEnabled: Boolean(row.comments_enabled),
    priority: row.priority,
    scheduledAt: row.scheduled_at,
    expiresAt: row.expires_at,
    publishedAt: row.published_at,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    likes: Number(row.likes || 0),
    saves: Number(row.saves || 0),
    comments: Number(row.comments || 0),
    liked: Boolean(row.liked),
    saved: Boolean(row.saved)
  };
}
__name(itemRecord, "itemRecord");
function validateItem(input) {
  const contentType = cleanText(input.contentType, 30, "Content type", true);
  if (!contentTypes.has(contentType)) throw new ApiError(400, "Choose a valid Spotlight content type.");
  const previewSource = input.previewSource === "automatic" ? "automatic" : "creator";
  let previewStartSeconds = integer(input.previewStartSeconds, "Preview start") ?? 0;
  let previewEndSeconds = integer(input.previewEndSeconds, "Preview end");
  const durationSeconds = integer(input.durationSeconds, "Duration", 43200);
  if (previewSource === "automatic") {
    previewStartSeconds = 0;
    previewEndSeconds = Math.min(durationSeconds || 60, 60);
  }
  if (previewEndSeconds !== null && previewEndSeconds <= previewStartSeconds) throw new ApiError(400, "Preview end must be after preview start.");
  if (durationSeconds !== null && previewEndSeconds !== null && previewEndSeconds > durationSeconds) throw new ApiError(400, "Preview cannot end after the full content.");
  return {
    channelEntityId: cleanText(input.channelEntityId, 128, "Channel") || null,
    subjectEntityId: cleanText(input.subjectEntityId, 128, "Featured profile") || null,
    contentType,
    title: cleanText(input.title, 120, "Title", true),
    caption: cleanText(input.caption, 1e3, "Caption"),
    creatorName: cleanText(input.creatorName, 120, "Creator name"),
    creatorHandle: cleanText(input.creatorHandle, 80, "Creator handle"),
    creatorAvatarUrl: safeUrl(input.creatorAvatarUrl, "Creator image"),
    mediaUrl: safeUrl(input.mediaUrl, "Media URL"),
    posterUrl: safeUrl(input.posterUrl, "Poster image", true),
    fullContentUrl: safeUrl(input.fullContentUrl, "Full content URL"),
    previewSource,
    previewStartSeconds,
    previewEndSeconds,
    durationSeconds,
    ctaLabel: cleanText(input.ctaLabel, 60, "Action label"),
    ctaUrl: safeUrl(input.ctaUrl, "Action URL"),
    commentsEnabled: input.commentsEnabled !== false
  };
}
__name(validateItem, "validateItem");
async function verifyChannel(env, user, channelId, tenantId, owner) {
  if (!channelId) return null;
  const channel = await env.DB.prepare("select id,tenant_id,state,data_json from platform_entities where id=? and kind='channels'").bind(channelId).first();
  if (!channel) throw new ApiError(404, "Selected channel was not found.");
  if (!owner && channel.tenant_id !== tenantId) throw new ApiError(403, "Choose a channel you manage.");
  if (!owner && !["owner", "editor"].includes((await membership(env, user.id, channel.tenant_id))?.role)) throw new ApiError(403, "Choose a channel you manage.");
  if (channel.state !== "published") throw new ApiError(409, "Publish and verify the channel before submitting it to Spotlight.");
  return JSON.parse(channel.data_json);
}
__name(verifyChannel, "verifyChannel");
async function listFeed(request, env, ctx) {
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = await ctx.getSessionUser(request, env);
  const { results } = await env.DB.prepare(`
    select s.*,
      (select count(*) from spotlight_engagements e where e.item_id=s.id and e.action='like') likes,
      (select count(*) from spotlight_engagements e where e.item_id=s.id and e.action='save') saves,
      (select count(*) from spotlight_comments c where c.item_id=s.id and c.status='visible') comments,
      exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='like') liked,
      exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='save') saved
    from spotlight_items s
    where (
      s.status='live' or
      (s.status='approved' and (s.scheduled_at is null or s.scheduled_at<=?)) or
      (s.status='scheduled' and s.scheduled_at<=?)
    ) and (s.expires_at is null or s.expires_at>?)
    order by s.priority desc, coalesce(s.published_at,s.scheduled_at,s.updated_at) desc
    limit 100
  `).bind(user?.id || "", user?.id || "", now, now, now).all();
  return ctx.json({ ok: true, items: (results || []).map(itemRecord) });
}
__name(listFeed, "listFeed");
async function workspace(request, env, ctx, id) {
  const user = await requireUser(request, env, ctx);
  const owner = await isOwner(env, user);
  if (request.method === "GET") {
    const tenant = owner ? null : await ownTenant(env, user);
    const items = await env.DB.prepare(owner ? "select * from spotlight_items order by updated_at desc limit 500" : "select * from spotlight_items where tenant_id=? order by updated_at desc limit 500").bind(...owner ? [] : [tenant]).all();
    const channels = await env.DB.prepare(owner ? "select id,data_json,tenant_id from platform_entities where kind='channels' and state='published' order by updated_at desc" : "select e.id,e.data_json,e.tenant_id from platform_entities e join tenant_memberships m on m.tenant_id=e.tenant_id where e.kind='channels' and e.state='published' and m.user_id=? and m.role in ('owner','editor') order by e.updated_at desc").bind(...owner ? [] : [user.id]).all();
    return ctx.json({ ok: true, role: owner ? "owner" : "creator", items: (items.results || []).map(itemRecord), channels: (channels.results || []).map((row) => ({ id: row.id, tenantId: row.tenant_id, ...JSON.parse(row.data_json) })) });
  }
  const input = await readJson(request);
  const data = validateItem(input);
  if (request.method === "POST") {
    const tenantId = owner && input.tenantId ? cleanText(input.tenantId, 128, "Tenant", true) : await ownTenant(env, user);
    const channel = await verifyChannel(env, user, data.channelEntityId, tenantId, owner);
    if (!owner && !data.channelEntityId) throw new ApiError(400, "Choose the channel submitting this content.");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const itemId = "spotlight-" + crypto.randomUUID();
    const creatorName = data.creatorName || channel?.name || user.name;
    const creatorHandle = data.creatorHandle || channel?.handle || "";
    const creatorAvatarUrl = data.creatorAvatarUrl || channel?.avatar || null;
    const status = input.saveAsDraft ? "draft" : "pending";
    await env.DB.batch([
      env.DB.prepare(`insert into spotlight_items
        (id,tenant_id,created_by,channel_entity_id,subject_entity_id,content_type,title,caption,creator_name,creator_handle,creator_avatar_url,media_url,poster_url,full_content_url,preview_source,preview_start_seconds,preview_end_seconds,duration_seconds,cta_label,cta_url,status,comments_enabled,created_at,updated_at)
        values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(itemId, tenantId, user.id, data.channelEntityId, data.subjectEntityId, data.contentType, data.title, data.caption, creatorName, creatorHandle, creatorAvatarUrl, data.mediaUrl, data.posterUrl, data.fullContentUrl, data.previewSource, data.previewStartSeconds, data.previewEndSeconds, data.durationSeconds, data.ctaLabel, data.ctaUrl, status, Number(data.commentsEnabled), now, now),
      auditStatement(env, user.id, "spotlight.submitted", itemId, tenantId)
    ]);
    const created = await env.DB.prepare("select * from spotlight_items where id=?").bind(itemId).first();
    return ctx.json({ ok: true, item: itemRecord(created) }, 201);
  }
  if (request.method === "PUT" && id) {
    const existing = await env.DB.prepare("select * from spotlight_items where id=?").bind(id).first();
    if (!existing) throw new ApiError(404, "Spotlight submission not found.");
    if (!owner && !["owner", "editor"].includes((await membership(env, user.id, existing.tenant_id))?.role)) throw new ApiError(403, "You cannot edit this submission.");
    if (Number(input.revision) !== existing.revision) throw new ApiError(409, "This submission changed. Reload and try again.");
    const channel = await verifyChannel(env, user, data.channelEntityId, existing.tenant_id, owner);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const status = input.saveAsDraft ? "draft" : "pending";
    const result = await env.DB.prepare(`update spotlight_items set channel_entity_id=?,subject_entity_id=?,content_type=?,title=?,caption=?,creator_name=?,creator_handle=?,creator_avatar_url=?,media_url=?,poster_url=?,full_content_url=?,preview_source=?,preview_start_seconds=?,preview_end_seconds=?,duration_seconds=?,cta_label=?,cta_url=?,comments_enabled=?,status=?,moderation_note=null,revision=revision+1,updated_at=? where id=? and revision=? returning *`).bind(data.channelEntityId, data.subjectEntityId, data.contentType, data.title, data.caption, data.creatorName || channel?.name || user.name, data.creatorHandle || channel?.handle || "", data.creatorAvatarUrl || channel?.avatar || null, data.mediaUrl, data.posterUrl, data.fullContentUrl, data.previewSource, data.previewStartSeconds, data.previewEndSeconds, data.durationSeconds, data.ctaLabel, data.ctaUrl, Number(data.commentsEnabled), status, now, id, existing.revision).first();
    if (!result) throw new ApiError(409, "This submission changed. Reload and try again.");
    await auditStatement(env, user.id, "spotlight.resubmitted", id, existing.tenant_id).run();
    return ctx.json({ ok: true, item: itemRecord(result) });
  }
  throw new ApiError(405, "Method not allowed.");
}
__name(workspace, "workspace");
async function moderate(request, env, ctx, id) {
  const user = await requireOwner(request, env, ctx);
  if (request.method !== "PUT" || !id) throw new ApiError(405, "Method not allowed.");
  const input = await readJson(request);
  const existing = await env.DB.prepare("select * from spotlight_items where id=?").bind(id).first();
  if (!existing) throw new ApiError(404, "Spotlight submission not found.");
  if (Number(input.revision) !== existing.revision) throw new ApiError(409, "This submission changed. Reload and try again.");
  const status = cleanText(input.status, 30, "Status", true);
  const placement = cleanText(input.placementKind || existing.placement_kind, 30, "Placement", true);
  if (!states.has(status) || !placements.has(placement)) throw new ApiError(400, "Invalid moderation decision.");
  const scheduledAt = isoDate(input.scheduledAt, "Schedule");
  const expiresAt = isoDate(input.expiresAt, "Expiry");
  if (status === "scheduled" && !scheduledAt) throw new ApiError(400, "Choose a publication time for scheduled content.");
  if (scheduledAt && expiresAt && Date.parse(expiresAt) <= Date.parse(scheduledAt)) throw new ApiError(400, "Expiry must be after publication.");
  const priority = integer(input.priority, "Priority", 1e3) ?? 0;
  const note = cleanText(input.moderationNote, 1e3, "Moderator note");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const publishedAt = status === "live" ? existing.published_at || now : existing.published_at;
  const result = await env.DB.prepare("update spotlight_items set status=?,placement_kind=?,moderation_note=?,priority=?,scheduled_at=?,expires_at=?,published_at=?,revision=revision+1,updated_at=? where id=? and revision=? returning *").bind(status, placement, note || null, priority, scheduledAt, expiresAt, publishedAt, now, id, existing.revision).first();
  if (!result) throw new ApiError(409, "This submission changed. Reload and try again.");
  await auditStatement(env, user.id, "spotlight.moderated." + status, id, existing.tenant_id).run();
  return ctx.json({ ok: true, item: itemRecord(result) });
}
__name(moderate, "moderate");
async function comments(request, env, ctx, itemId) {
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const { results } = await env.DB.prepare(`select c.id,c.body,c.created_at,u.name from spotlight_comments c join users u on u.id=c.user_id where c.item_id=? and c.status='visible' order by c.created_at desc limit 100`).bind(itemId).all();
  return ctx.json({ ok: true, comments: (results || []).map((row) => ({ id: row.id, body: row.body, author: row.name, createdAt: row.created_at })) });
}
__name(comments, "comments");
async function engage(request, env, ctx, itemId) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  const user = await requireUser(request, env, ctx);
  const item = await env.DB.prepare("select id,tenant_id,comments_enabled from spotlight_items where id=?").bind(itemId).first();
  if (!item) throw new ApiError(404, "Spotlight item not found.");
  const input = await readJson(request);
  const action = cleanText(input.action, 20, "Action", true);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (["like", "save", "follow"].includes(action)) {
    const existing = await env.DB.prepare("select action from spotlight_engagements where item_id=? and user_id=? and action=?").bind(itemId, user.id, action).first();
    if (existing) await env.DB.prepare("delete from spotlight_engagements where item_id=? and user_id=? and action=?").bind(itemId, user.id, action).run();
    else await env.DB.prepare("insert into spotlight_engagements values (?,?,?,?)").bind(itemId, user.id, action, now).run();
    return ctx.json({ ok: true, active: !existing });
  }
  if (action === "report") {
    await env.DB.prepare("insert into spotlight_engagements values (?,?,'report',?) on conflict do nothing").bind(itemId, user.id, now).run();
    await auditStatement(env, user.id, "spotlight.reported", itemId, item.tenant_id).run();
    return ctx.json({ ok: true, active: true });
  }
  if (action === "comment") {
    if (!item.comments_enabled) throw new ApiError(409, "Comments are closed for this item.");
    const body = cleanText(input.body, 600, "Comment", true);
    const id = crypto.randomUUID();
    await env.DB.prepare("insert into spotlight_comments (id,item_id,user_id,body,created_at) values (?,?,?,?,?)").bind(id, itemId, user.id, body, now).run();
    return ctx.json({ ok: true, comment: { id, body, author: user.name, createdAt: now } }, 201);
  }
  throw new ApiError(400, "Unsupported Spotlight action.");
}
__name(engage, "engage");
async function handleSpotlightApi(request, env, ctx) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "spotlight") return null;
  if (!env.DB) throw new ApiError(503, "Storage unavailable.");
  const scope = parts[2] || "feed";
  if (scope === "feed") return listFeed(request, env, ctx);
  if (scope === "workspace") return workspace(request, env, ctx, parts[3]);
  if (scope === "admin") return moderate(request, env, ctx, parts[3]);
  if (scope === "comments") return comments(request, env, ctx, parts[3]);
  if (scope === "engagement") return engage(request, env, ctx, parts[3]);
  throw new ApiError(404, "Spotlight endpoint not found.");
}
__name(handleSpotlightApi, "handleSpotlightApi");

// src/worker.js
var apiHeaders = {
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    ...apiHeaders,
    ...securityHeaders
  }
}), "json");
var unauthorized = /* @__PURE__ */ __name(() => json({ ok: false, error: "unauthorized" }, 401), "unauthorized");
var storageUnavailable = /* @__PURE__ */ __name(() => json({
  ok: false,
  error: "storage unavailable",
  message: "The database binding is not configured for this environment."
}, 503), "storageUnavailable");
function constantTimeEqual(left, right) {
  const encoder2 = new TextEncoder();
  const leftBytes = encoder2.encode(String(left || ""));
  const rightBytes = encoder2.encode(String(right || ""));
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
function isAuthorized(request, env) {
  if (!env.ADMIN_API_TOKEN) return false;
  return constantTimeEqual(
    request.headers.get("authorization"),
    `Bearer ${env.ADMIN_API_TOKEN}`
  );
}
__name(isAuthorized, "isAuthorized");
function slugify(text) {
  return String(text || "church").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
__name(slugify, "slugify");
function registrationCode() {
  return `REG-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}
__name(registrationCode, "registrationCode");
var SESSION_COOKIE = "mwe_session_v2";
var SESSION_TTL_SECONDS = 60 * 60 * 24;
var PBKDF2_ITERATIONS = 1e5;
function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
__name(toBase64, "toBase64");
function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
__name(fromBase64, "fromBase64");
function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64(bytes).replace(/[+/=]/g, (char) => ({ "+": "-", "/": "_", "=": "" })[char]);
}
__name(randomToken, "randomToken");
async function hashPassword(password, saltBase64) {
  const encoder2 = new TextEncoder();
  const salt = fromBase64(saltBase64);
  const keyMaterial = await crypto.subtle.importKey("raw", encoder2.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toBase64(new Uint8Array(bits));
}
__name(hashPassword, "hashPassword");
async function hashNewPassword(password, env) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toBase64(saltBytes);
  const hash = await environmentPassword(password, salt, env);
  return { salt, hash };
}
__name(hashNewPassword, "hashNewPassword");
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}
__name(normalizeEmail, "normalizeEmail");
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
__name(isValidEmail, "isValidEmail");
function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const cookies = {};
  header.split(";").forEach((part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) return;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!key) return;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });
  return cookies;
}
__name(parseCookies, "parseCookies");
function isSecureRequest(request) {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return true;
  }
}
__name(isSecureRequest, "isSecureRequest");
function sessionCookieHeader(request, token, maxAgeSeconds) {
  const attrs = [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
  if (isSecureRequest(request)) attrs.push("Secure");
  return attrs.join("; ");
}
__name(sessionCookieHeader, "sessionCookieHeader");
function clearSessionCookieHeader(request) {
  const attrs = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isSecureRequest(request)) attrs.push("Secure");
  return attrs.join("; ");
}
__name(clearSessionCookieHeader, "clearSessionCookieHeader");
function jsonWithCookie(body, status, cookieValue) {
  const res = json(body, status);
  res.headers.append("set-cookie", cookieValue);
  return res;
}
__name(jsonWithCookie, "jsonWithCookie");
async function digestToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return "v2:" + toBase64(new Uint8Array(digest));
}
__name(digestToken, "digestToken");
function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isCreator: Boolean(row.is_creator),
    emailVerified: Boolean(row.email_verified_at),
    mfaEnabled: Boolean(row.totp_secret_encrypted)
  };
}
__name(publicUser, "publicUser");
async function createSession(env, userId, mfaVerified = false) {
  const token = randomToken();
  const now = /* @__PURE__ */ new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_SECONDS * 1e3);
  await env.DB.prepare(`
    insert into sessions (token, user_id, created_at, expires_at, mfa_verified_at)
    values (?, ?, ?, ?, ?)
  `).bind(await digestToken(token), userId, now.toISOString(), expires.toISOString(), mfaVerified ? now.toISOString() : null).run();
  return token;
}
__name(createSession, "createSession");
async function getSessionUser(request, env) {
  if (!env.DB) return null;
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await env.DB.prepare(`
    select u.id, u.name, u.email, u.is_creator, s.expires_at, s.created_at as session_created_at,
      s.mfa_verified_at, u.email_verified_at, u.totp_secret_encrypted, u.totp_pending_encrypted, u.totp_last_step
    from sessions s
    join users u on u.id = s.user_id
    where s.token = ?
  `).bind(await digestToken(token)).first();
  if (!row) return null;
  if (!Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= Date.now() || row.id.startsWith("temporary:")) {
    await env.DB.prepare("delete from sessions where token = ?").bind(await digestToken(token)).run();
    return null;
  }
  return row;
}
__name(getSessionUser, "getSessionUser");
async function registerUser(request, env, { forceCreator = false } = {}) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  const name = String(payload?.name || "").trim();
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");
  if (!name || name.length > 200) return json({ ok: false, error: "Enter your full name." }, 400);
  if (!isValidEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (password.length < 15 || password.length > 128) return json({ ok: false, error: "Password must be between 15 and 128 characters." }, 400);
  const existing = await env.DB.prepare("select id from users where email = ?").bind(email).first();
  if (existing) {
    return json({ ok: false, error: "An account with that email already exists. Sign in instead." }, 409);
  }
  const id = `local:${email}`;
  const { salt, hash } = await hashNewPassword(password, env);
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const isCreator = forceCreator || Boolean(payload?.isCreator);
  await env.DB.prepare(`
    insert into users (id, email, password_hash, password_salt, name, is_creator, created_at, last_login_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, email, hash, salt, name, Number(isCreator), createdAt, createdAt).run();
  const token = await createSession(env, id);
  return jsonWithCookie(
    { ok: true, user: { id, name, email, isCreator } },
    201,
    sessionCookieHeader(request, token, SESSION_TTL_SECONDS)
  );
}
__name(registerUser, "registerUser");
async function handleAuthRegister(request, env) {
  return registerUser(request, env);
}
__name(handleAuthRegister, "handleAuthRegister");
async function handleCreatorRegister(request, env) {
  return registerUser(request, env, { forceCreator: true });
}
__name(handleCreatorRegister, "handleCreatorRegister");
async function handleAuthLogin(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");
  if (!isValidEmail(email) || !password) {
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }
  await throttleAccount(env, email);
  const row = await env.DB.prepare(`
    select id, name, email, password_hash, password_salt, is_creator, email_verified_at, totp_secret_encrypted
    from users where email = ?
  `).bind(email).first();
  if (!row) {
    await environmentPassword(password, "AAAAAAAAAAAAAAAAAAAAAA==", env);
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }
  if (row.password_hash === "authentication-disabled" || row.id.startsWith("temporary:")) return unauthorized();
  const modern = row.password_hash.startsWith(PASSWORD_PREFIX);
  const versioned = row.password_hash.startsWith("pbkdf2-sha256$100000$");
  const computedHash = modern ? await modernPassword(password, row.password_salt) : (versioned ? "pbkdf2-sha256$100000$" : "") + await hashPassword(password, row.password_salt);
  if (!constantTimeEqual(computedHash, row.password_hash)) {
    return json({ ok: false, error: "Invalid email or password." }, 401);
  }
  if (!modern && !versioned) {
    const upgraded = await hashNewPassword(password, env);
    await env.DB.prepare("update users set password_hash=?,password_salt=? where id=? and password_hash=?").bind(upgraded.hash, upgraded.salt, row.id, row.password_hash).run();
  }
  if (row.totp_secret_encrypted) return json({ ok: true, mfaRequired: true, challenge: await mfaChallenge(env, row.id) }, 202);
  await env.DB.prepare("update users set last_login_at = ? where id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), row.id).run();
  const token = await createSession(env, row.id);
  return jsonWithCookie(
    { ok: true, user: publicUser(row) },
    200,
    sessionCookieHeader(request, token, SESSION_TTL_SECONDS)
  );
}
__name(handleAuthLogin, "handleAuthLogin");
async function handleAuthLogout(request, env) {
  if (env.DB) {
    const cookies = parseCookies(request);
    const token = cookies[SESSION_COOKIE];
    if (token) await env.DB.prepare("delete from sessions where token = ?").bind(await digestToken(token)).run();
  }
  return jsonWithCookie({ ok: true }, 200, clearSessionCookieHeader(request));
}
__name(handleAuthLogout, "handleAuthLogout");
async function handleAuthSession(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ ok: true, user: null });
  return json({ ok: true, user: publicUser(user) });
}
__name(handleAuthSession, "handleAuthSession");
async function handleCreatorUpgrade(request, env) {
  if (!env.DB) return storageUnavailable();
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  await env.DB.prepare("update users set is_creator = 1 where id = ?").bind(user.id).run();
  return json({ ok: true, user: { ...publicUser(user), isCreator: true } });
}
__name(handleCreatorUpgrade, "handleCreatorUpgrade");
async function handleStatus(env) {
  return json({
    ok: true,
    app: "my-way-of-evangelism-api",
    role: "Shared synchronization API for public website, church portal, and owner dashboard",
    environment: env.ENVIRONMENT || "unknown",
    storage: {
      d1Bound: Boolean(env.DB),
      binding: "DB"
    },
    security: {
      adminAuthorizationConfigured: Boolean(env.ADMIN_API_TOKEN),
      authenticationBypassed: false
    },
    applications: [
      { name: "Public Website", route: "/", authentication: "none" },
      { name: "Church Portal", route: "/church-portal", authentication: "required" },
      { name: "Owner Dashboard", route: "/owner-dashboard", authentication: "required" },
      { name: "API Application", route: "/api/*", authentication: "token/session by endpoint" }
    ]
  });
}
__name(handleStatus, "handleStatus");
async function handlePublicChurches(request, env) {
  if (!env.DB) return storageUnavailable();
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(`
      select
        c.id, c.name, c.city, c.country, c.postal_code, c.denomination,
        c.language, c.website, c.phone, c.email, c.cover_image_url,
        c.livestream_enabled, c.livestream_paid, c.livestream_url,
        p.pastor_name, p.pastor_title, p.pastor_bio, p.about
      from churches c
      left join church_profiles p on p.church_id = c.id
      where c.is_verified = 1
      order by c.name
    `).all();
    return json({ ok: true, churches: results });
  }
  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  const payload = await readJson(request);
  if (!payload?.name || !payload?.city || !payload?.pastor || !payload?.phone || !payload?.email) {
    return json({ ok: false, error: "name, city, pastor, phone, and email are required" }, 400);
  }
  const id = payload.id || slugify(payload.name);
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  if (env.DB) {
    await env.DB.prepare(`
      insert into churches
        (id, name, city, country, website, phone, email, cover_image_url, livestream_enabled, livestream_paid, livestream_url, is_verified, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.name,
      payload.city,
      payload.country || "",
      payload.website || "",
      payload.phone,
      payload.email,
      payload.coverImageUrl || "",
      Number(Boolean(payload.livestreamEnabled)),
      Number(Boolean(payload.livestreamPaid)),
      payload.livestreamUrl || "",
      0,
      createdAt
    ).run();
    await env.DB.prepare(`
      insert into church_profiles
        (church_id, about, pastor_name, pastor_title, pastor_bio)
      values (?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.about || "",
      payload.pastor,
      payload.pastorTitle || "Lead Pastor",
      payload.pastorBio || ""
    ).run();
  }
  return json({ ok: true, id, status: "pending-verification", createdAt }, 201);
}
__name(handlePublicChurches, "handlePublicChurches");
async function handleAdminChurches(request, env) {
  if (!isAuthorized(request, env)) return unauthorized();
  if (!env.DB) return storageUnavailable();
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(`
      select
        c.id, c.name, c.city, c.country, c.website, c.phone, c.email,
        c.cover_image_url, c.livestream_enabled, c.livestream_paid,
        c.livestream_url, c.description, c.is_verified, c.created_at,
        p.pastor_name, p.pastor_title, p.pastor_bio, p.about
      from churches c
      left join church_profiles p on p.church_id = c.id
      order by c.created_at desc
    `).all();
    return json({ ok: true, churches: results });
  }
  if (request.method === "POST" || request.method === "PUT") {
    return upsertChurch(request, env);
  }
  if (request.method === "DELETE") {
    const payload = await readJson(request) || {};
    const id = payload.id || new URL(request.url).searchParams.get("id");
    if (!id) return json({ ok: false, error: "id is required" }, 400);
    if (env.DB) {
      await env.DB.batch([
        env.DB.prepare("delete from event_registrations where event_id in (select id from events where church_id = ?)").bind(id),
        env.DB.prepare("delete from ride_followups where ride_request_id in (select id from ride_requests where church_id = ?)").bind(id),
        env.DB.prepare("delete from service_schedules where church_id = ?").bind(id),
        env.DB.prepare("delete from ministries where church_id = ?").bind(id),
        env.DB.prepare("delete from events where church_id = ?").bind(id),
        env.DB.prepare("delete from visitor_connections where church_id = ?").bind(id),
        env.DB.prepare("delete from prayer_requests where church_id = ?").bind(id),
        env.DB.prepare("delete from ride_requests where church_id = ?").bind(id),
        env.DB.prepare("delete from salvation_decisions where church_id = ?").bind(id),
        env.DB.prepare("delete from church_staff_roles where church_id = ?").bind(id),
        env.DB.prepare("delete from church_profiles where church_id = ?").bind(id),
        env.DB.prepare("delete from livestream_activations where church_id = ?").bind(id),
        env.DB.prepare("delete from churches where id = ?").bind(id)
      ]);
    }
    return json({ ok: true, id, status: "deleted" });
  }
  return json({ ok: false, error: "method not allowed" }, 405);
}
__name(handleAdminChurches, "handleAdminChurches");
async function upsertChurch(request, env) {
  const payload = await readJson(request);
  if (!payload?.name || !payload?.city || !payload?.pastor || !payload?.phone || !payload?.email) {
    return json({ ok: false, error: "name, city, pastor, phone, and email are required" }, 400);
  }
  const id = payload.id || slugify(payload.name);
  const createdAt = payload.createdAt || (/* @__PURE__ */ new Date()).toISOString();
  if (env.DB) {
    await env.DB.batch([
      env.DB.prepare(`
        insert into churches
          (id, name, city, country, website, phone, email, cover_image_url, livestream_enabled, livestream_paid, livestream_url, description, is_verified, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          city = excluded.city,
          country = excluded.country,
          website = excluded.website,
          phone = excluded.phone,
          email = excluded.email,
          cover_image_url = excluded.cover_image_url,
          livestream_enabled = excluded.livestream_enabled,
          livestream_paid = excluded.livestream_paid,
          livestream_url = excluded.livestream_url,
          description = excluded.description,
          is_verified = excluded.is_verified
      `).bind(
        id,
        payload.name,
        payload.city,
        payload.country || "",
        payload.website || "",
        payload.phone,
        payload.email,
        payload.image || payload.coverImageUrl || "",
        Number(Boolean(payload.streamEnabled || payload.livestreamEnabled)),
        Number(Boolean(payload.streamPaid || payload.livestreamPaid)),
        payload.streamUrl || payload.livestreamUrl || "",
        payload.about || "",
        payload.verified === false ? 0 : 1,
        createdAt
      ),
      env.DB.prepare(`
        insert into church_profiles
          (church_id, about, pastor_name, pastor_title, pastor_bio)
        values (?, ?, ?, ?, ?)
        on conflict(church_id) do update set
          about = excluded.about,
          pastor_name = excluded.pastor_name,
          pastor_title = excluded.pastor_title,
          pastor_bio = excluded.pastor_bio
      `).bind(
        id,
        payload.about || "",
        payload.pastor,
        payload.pastorTitle || "Lead Pastor",
        payload.pastorBio || ""
      )
    ]);
  }
  return json({ ok: true, id, status: "saved", createdAt });
}
__name(upsertChurch, "upsertChurch");
async function handleChurchApplication(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.churchName || !payload?.pastorName || !payload?.adminEmail) {
    return json({ ok: false, error: "churchName, pastorName, and adminEmail are required" }, 400);
  }
  const id = crypto.randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  if (env.DB) {
    await env.DB.prepare(`
      insert into church_applications
        (id, church_name, pastor_name, website, social, admin_email, statement_of_faith, phone, email, cover_image_url, livestream_url, livestream_paid, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.churchName,
      payload.pastorName,
      payload.website || "",
      payload.social || "",
      payload.adminEmail,
      payload.faith || "",
      payload.phone || "",
      payload.email || "",
      payload.coverImageUrl || "",
      payload.livestreamUrl || "",
      Number(Boolean(payload.livestreamPaid)),
      "pending",
      createdAt
    ).run();
  }
  return json({ ok: true, id, status: "pending-review", createdAt }, 201);
}
__name(handleChurchApplication, "handleChurchApplication");
async function handleLivestreamActivation(request, env) {
  if (!isAuthorized(request, env)) return unauthorized();
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.churchId || !payload?.livestreamUrl) {
    return json({ ok: false, error: "churchId and livestreamUrl are required" }, 400);
  }
  const id = crypto.randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  if (env.DB) {
    await env.DB.prepare(`
      insert into livestream_activations
        (id, church_id, livestream_url, status, payment_status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(id, payload.churchId, payload.livestreamUrl, "requested", "pending", createdAt).run();
  }
  return json({ ok: true, id, status: "requested", paymentStatus: "pending", createdAt }, 201);
}
__name(handleLivestreamActivation, "handleLivestreamActivation");
async function handleVisitor(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.fullName || !payload?.email || !payload?.churchId) {
    return json({ ok: false, error: "fullName, email, and churchId are required" }, 400);
  }
  const id = crypto.randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  if (env.DB) {
    await env.DB.prepare(`
      insert into visitor_connections
        (id, church_id, full_name, phone, email, city, message, needs, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      payload.churchId,
      payload.fullName,
      payload.phone || "",
      payload.email,
      payload.city || "",
      payload.message || "",
      JSON.stringify(payload.needs || []),
      "new",
      createdAt
    ).run();
  }
  return json({ ok: true, id, status: "received", message: "Visitor connection request received.", createdAt }, 201);
}
__name(handleVisitor, "handleVisitor");
async function handlePrayer(request, env) {
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.request) return json({ ok: false, error: "request is required" }, 400);
  const id = crypto.randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  if (env.DB) {
    await env.DB.prepare(`
      insert into prayer_requests (id, church_id, request_text, is_anonymous, status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(id, payload.churchId || null, payload.request, Number(Boolean(payload.isAnonymous)), "new", createdAt).run();
  }
  return json({ ok: true, id, status: "received", createdAt }, 201);
}
__name(handlePrayer, "handlePrayer");
function assetRequest(request) {
  const url = new URL(request.url);
  const routes = /* @__PURE__ */ new Map([
    ["/", "/index.html"],
    ["/church-portal", "/church-portal.html"],
    ["/portal", "/church-portal.html"],
    ["/creator-hub", "/church-portal.html"],
    ["/register-church", "/church-portal.html"],
    ["/owner-dashboard", "/owner-dashboard.html"],
    ["/admin", "/owner-dashboard.html"],
    ["/app", "/app.html"],
    ["/member", "/app.html"],
    ["/spotlight", "/spotlight.html"],
    ["/livestream", "/livestream.html"],
    ["/live", "/livestream.html"],
    ["/broadcast", "/broadcast.html"],
    ["/watch", "/broadcast.html"],
    ["/church-profile", "/church-profile.html"],
    ["/church", "/church-profile.html"],
    ["/churches", "/churches.html"],
    ["/channels", "/channels.html"],
    ["/channel", "/channel-detail.html"],
    ["/channel-content", "/channel-content.html"],
    ["/messages", "/messages.html"],
    ["/events", "/events.html"],
    ["/event-profile", "/event-profile.html"],
    ["/event", "/event-profile.html"],
    ["/foundation", "/foundation.html"],
    ["/store", "/store.html"],
    ["/product", "/product-detail.html"],
    ["/cart", "/cart.html"],
    ["/checkout", "/checkout.html"],
    ["/store-manager", "/seller-dashboard.html"],
    ["/resources", "/resources.html"],
    ["/resource", "/resource-detail.html"],
    ["/resource-reader", "/resource-reader.html"],
    ["/donate", "/donate.html"],
    ["/privacy", "/privacy.html"],
    ["/terms", "/privacy.html"],
    ["/safeguarding", "/privacy.html"],
    ["/about", "/index.html"],
    ["/volunteer", "/index.html"],
    ["/prayer", "/index.html"]
  ]);
  if (routes.has(url.pathname)) {
    url.pathname = routes.get(url.pathname);
    return new Request(url.toString(), request);
  }
  return request;
}
__name(assetRequest, "assetRequest");
async function handleEvents(request, env) {
  if (!env.DB) return storageUnavailable();
  if (request.method === "GET") {
    const url = new URL(request.url);
    const city = url.searchParams.get("city");
    const churchId = url.searchParams.get("churchId");
    const type = url.searchParams.get("type");
    const upcoming = url.searchParams.get("upcoming") === "true";
    let query = `
      select e.*, c.name as church_name, c.city as church_city, c.country as church_country
      from events e
      left join churches c on c.id = e.church_id
      where 1=1
    `;
    const params = [];
    if (city) {
      query += ` and (e.city = ? or c.city = ?)`;
      params.push(city, city);
    }
    if (churchId) {
      query += ` and e.church_id = ?`;
      params.push(churchId);
    }
    if (type) {
      query += ` and e.event_type = ?`;
      params.push(type);
    }
    if (upcoming) {
      const nowStr = (/* @__PURE__ */ new Date()).toISOString();
      query += ` and e.starts_at >= ?`;
      params.push(nowStr);
    }
    query += ` order by e.starts_at asc`;
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json({ ok: true, events: results });
  }
  if (request.method === "POST" || request.method === "PUT") {
    if (!isAuthorized(request, env)) return unauthorized();
    const payload = await readJson(request);
    if (!payload?.title || !payload?.startsAt) {
      return json({ ok: false, error: "title and startsAt are required" }, 400);
    }
    const id = payload.id || crypto.randomUUID();
    if (env.DB) {
      await env.DB.prepare(`
        insert into events
          (id, church_id, title, event_type, starts_at, ends_at, venue_name, city, country, cover_image_url,
           registration_required, ticket_price_cents, currency, total_tickets, tickets_sold, is_featured, is_promoted,
           registration_url, livestream_url, directions_url, description)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          church_id = excluded.church_id,
          title = excluded.title,
          event_type = excluded.event_type,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          venue_name = excluded.venue_name,
          city = excluded.city,
          country = excluded.country,
          cover_image_url = excluded.cover_image_url,
          registration_required = excluded.registration_required,
          ticket_price_cents = excluded.ticket_price_cents,
          currency = excluded.currency,
          total_tickets = excluded.total_tickets,
          tickets_sold = excluded.tickets_sold,
          is_featured = excluded.is_featured,
          is_promoted = excluded.is_promoted,
          registration_url = excluded.registration_url,
          livestream_url = excluded.livestream_url,
          directions_url = excluded.directions_url,
          description = excluded.description
      `).bind(
        id,
        payload.churchId || null,
        payload.title,
        payload.eventType || "in-person",
        payload.startsAt,
        payload.endsAt || null,
        payload.venueName || "",
        payload.city || "",
        payload.country || "",
        payload.coverImageUrl || "",
        Number(Boolean(payload.registrationRequired)),
        Number(payload.ticketPriceCents || 0),
        payload.currency || "USD",
        payload.totalTickets !== void 0 ? Number(payload.totalTickets) : null,
        Number(payload.ticketsSold || 0),
        Number(Boolean(payload.isFeatured)),
        Number(Boolean(payload.isPromoted)),
        payload.registrationUrl || "",
        payload.livestreamUrl || "",
        payload.directionsUrl || "",
        payload.description || ""
      ).run();
    }
    return json({ ok: true, id, status: "saved" });
  }
  return json({ ok: false, error: "method not allowed" }, 405);
}
__name(handleEvents, "handleEvents");
async function handleEventRegister(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  if (!payload?.eventId || !payload?.fullName || !payload?.email) {
    return json({ ok: false, error: "eventId, fullName, and email are required" }, 400);
  }
  const id = crypto.randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const regCode = registrationCode();
  const qty = Number(payload.ticketQuantity ?? 1);
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 20) return json({ ok: false, error: "ticketQuantity must be a whole number from 1 to 20" }, 400);
  if (!isValidEmail(normalizeEmail(payload.email))) return json({ ok: false, error: "valid email required" }, 400);
  const event = await env.DB.prepare("select id, ticket_price_cents, total_tickets, tickets_sold from events where id = ?").bind(payload.eventId).first();
  if (!event) return json({ ok: false, error: "event not found" }, 404);
  if (event.ticket_price_cents > 0) return json({ ok: false, error: "Paid registration requires a verified payment provider." }, 409);
  const amountPaid = 0;
  const result = await env.DB.prepare(`
    insert into event_registrations
      (id, event_id, full_name, email, ticket_quantity, amount_paid_cents, registration_code, created_at)
    select ?, id, ?, ?, ?, 0, ?, ? from events
    where id = ? and ticket_price_cents = 0
      and (total_tickets is null or total_tickets = 0 or coalesce(tickets_sold, 0) + ? <= total_tickets)
  `).bind(id, payload.fullName, normalizeEmail(payload.email), qty, regCode, createdAt, payload.eventId, qty).run();
  if (!(result.meta?.changes > 0)) return json({ ok: false, error: "Registration unavailable or event full." }, 409);
  return json({ ok: true, id, registrationCode: regCode, amountPaidCents: amountPaid, status: "registered" }, 201);
}
__name(handleEventRegister, "handleEventRegister");
function serviceBookingRef() {
  return `SRV-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
__name(serviceBookingRef, "serviceBookingRef");
async function handleServiceBooking(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!env.DB) return storageUnavailable();
  const payload = await readJson(request);
  const serviceId = String(payload?.serviceId || "").trim();
  const serviceTitle = String(payload?.serviceTitle || "").trim();
  const serviceType = String(payload?.serviceType || "service").trim();
  const providerName = String(payload?.providerName || "").trim();
  const providerType = String(payload?.providerType || "Provider").trim();
  const packageTier = String(payload?.packageTier || "Standard").trim();
  const estimatedAmount = String(payload?.estimatedAmount || "").trim();
  const requestedDate = String(payload?.requestedDate || "").trim();
  const requestedTime = String(payload?.requestedTime || "").trim();
  const customerName = String(payload?.customerName || "").trim();
  const customerEmail = normalizeEmail(payload?.customerEmail);
  const customerPhone = String(payload?.customerPhone || "").trim();
  const eventLocation = String(payload?.eventLocation || "").trim();
  const notes = String(payload?.notes || "").trim();
  if (!serviceId || !serviceTitle) {
    return json({ ok: false, error: "Service information is missing." }, 400);
  }
  if (!customerName) {
    return json({ ok: false, error: "Please enter your name." }, 400);
  }
  if (!isValidEmail(customerEmail)) {
    return json({ ok: false, error: "Please provide a valid email address." }, 400);
  }
  if (!requestedDate) {
    return json({ ok: false, error: "Please select a preferred date for the service." }, 400);
  }
  const id = `bk_${crypto.randomUUID()}`;
  const bookingRef = serviceBookingRef();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  let userId = null;
  if (env.DB) {
    const sessionUser = await getSessionUser(request, env);
    if (sessionUser) userId = sessionUser.id;
    await env.DB.prepare(`
      insert into service_bookings (
        id, booking_ref, service_id, service_title, service_type,
        provider_name, provider_type, package_tier, estimated_amount,
        requested_date, requested_time, customer_name, customer_email,
        customer_phone, event_location, notes, status, user_id, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inquiry_received', ?, ?)
    `).bind(
      id,
      bookingRef,
      serviceId,
      serviceTitle,
      serviceType,
      providerName,
      providerType,
      packageTier,
      estimatedAmount,
      requestedDate,
      requestedTime,
      customerName,
      customerEmail,
      customerPhone,
      eventLocation,
      notes,
      userId,
      createdAt
    ).run();
  }
  return json({
    ok: true,
    id,
    bookingRef,
    status: "inquiry_received",
    message: "Your service booking request has been received. The church or ministry team will contact you shortly to confirm arrangements.",
    booking: {
      id,
      bookingRef,
      serviceTitle,
      providerName,
      packageTier,
      requestedDate,
      requestedTime,
      customerName,
      customerEmail
    }
  }, 201);
}
__name(handleServiceBooking, "handleServiceBooking");
async function handleGetServiceBookings(request, env) {
  if (!env.DB) return storageUnavailable();
  const user = await getSessionUser(request, env);
  if (!user) return unauthorized();
  const { results } = await env.DB.prepare(`
    select id, booking_ref, service_id, service_title, service_type,
           provider_name, provider_type, package_tier, estimated_amount,
           requested_date, requested_time, customer_name, customer_email,
           status, created_at
    from service_bookings
    where user_id = ?
    order by created_at desc
  `).bind(user.id).all();
  return json({ ok: true, bookings: results || [] });
}
__name(handleGetServiceBookings, "handleGetServiceBookings");
async function handleApi(request, env) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    validateMutationOrigin(request);
    await enforceRateLimit(request, env, path);
    if (request.method === "OPTIONS") return json({ ok: true });
    const context = { json, getSessionUser, createSession, sessionCookieHeader, jsonWithCookie, isAuthorized, publicUser, clearSessionCookieHeader, parseCookies, digestToken };
    const identityResponse = await handleIdentityApi(request, env, context);
    if (identityResponse) return identityResponse;
    const platformResponse = await handlePlatformApi(request, env, context);
    if (platformResponse) return platformResponse;
    const spotlightResponse = await handleSpotlightApi(request, env, context);
    if (spotlightResponse) return spotlightResponse;
    if (path === "/api/status" && request.method === "GET") return await handleStatus(env);
    if (path === "/api/location" && request.method === "GET") {
      return json({ city: String(request.cf?.city || "Edmonton"), countryCode: String(request.cf?.country || "CA") });
    }
    if (path === "/api/churches") return await handlePublicChurches(request, env);
    if (path === "/api/admin/churches") return await handleAdminChurches(request, env);
    if (path === "/api/events") return await handleEvents(request, env);
    if (path === "/api/auth/session" && request.method === "GET") return await handleAuthSession(request, env);
    if (path === "/api/services/bookings" && request.method === "GET") return await handleGetServiceBookings(request, env);
    if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
    if (path === "/api/church-application") return await handleChurchApplication(request, env);
    if (path === "/api/livestream-activation") return await handleLivestreamActivation(request, env);
    if (path === "/api/visitor") return await handleVisitor(request, env);
    if (path === "/api/prayer") return await handlePrayer(request, env);
    if (path === "/api/event-register") return await handleEventRegister(request, env);
    if (path === "/api/auth/register") return await handleAuthRegister(request, env);
    if (path === "/api/auth/login") return await handleAuthLogin(request, env);
    if (path === "/api/auth/logout") return await handleAuthLogout(request, env);
    if (path === "/api/creator/register") return await handleCreatorRegister(request, env);
    if (path === "/api/creator/upgrade") return await handleCreatorUpgrade(request, env);
    if (path === "/api/services/book") return await handleServiceBooking(request, env);
    return json({ ok: false, error: "not found" }, 404);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : "internal server error";
    console.error(JSON.stringify({
      level: "error",
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      errorType: error instanceof Error ? error.name : "UnknownError"
    }));
    const response = json({ ok: false, error: message, requestId }, status);
    if (status === 429) response.headers.set("retry-after", "60");
    return response;
  }
}
__name(handleApi, "handleApi");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    const assetRes = await env.ASSETS.fetch(assetRequest(request));
    const newHeaders = new Headers(assetRes.headers);
    for (const [key, value] of Object.entries(securityHeaders)) newHeaders.set(key, value);
    newHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    newHeaders.set("Pragma", "no-cache");
    newHeaders.set("Expires", "0");
    return new Response(assetRes.body, {
      status: assetRes.status,
      statusText: assetRes.statusText,
      headers: newHeaders
    });
  }
};
export {
  constantTimeEqual,
  worker_default as default,
  handleGetServiceBookings,
  handleServiceBooking,
  readJson,
  registrationCode,
  serviceBookingRef
};
//# sourceMappingURL=worker.js.map
