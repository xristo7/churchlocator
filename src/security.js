export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function readJson(request) {
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
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let payload;
    try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new ApiError(400, "invalid JSON body"); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new ApiError(400, "JSON object required");
    validateValue(payload);
    return payload;
  } finally { reader.releaseLock(); }
}

function validateValue(value, key = "", depth = 0) {
  if (depth > 8) throw new ApiError(400, "JSON nesting too deep");
  if (["__proto__", "prototype", "constructor"].includes(key)) throw new ApiError(400, "invalid field");
  if (typeof value === "string") {
    const maximum = /password/i.test(key) ? 128 : /email/i.test(key) ? 254 : /^(id|.*Id)$/i.test(key) ? 128 : /name|title|phone/i.test(key) ? 200 : 10000;
    if (value.length > maximum) throw new ApiError(400, "field too long");
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new ApiError(400, "invalid control character");
    if (/url$|^(website|image|photo|cover|logo|pastorPhoto)$/i.test(key) && value && value !== "#") {
      let url;
      try { url = new URL(value, "https://asset.invalid/"); } catch { throw new ApiError(400, "invalid URL"); }
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new ApiError(400, "unsafe URL");
    }
  } else if (typeof value === "number" && !Number.isFinite(value)) throw new ApiError(400, "invalid number");
  else if (value && typeof value === "object") {
    if (Object.keys(value).length > 100) throw new ApiError(400, "too many fields");
    for (const [childKey, childValue] of Object.entries(value)) validateValue(childValue, childKey, depth + 1);
  }
}

export function validateMutationOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, "cross-origin request rejected");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "cross-site request rejected");
}

export async function enforceRateLimit(request, env, path) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const auth = path.startsWith("/api/auth/") || path.startsWith("/api/creator/");
  const limiter = auth ? env.AUTH_RATE_LIMITER : env.WRITE_RATE_LIMITER;
  if (!limiter) {
    if (["production", "preview"].includes(env.ENVIRONMENT)) throw new ApiError(503, "security service unavailable");
    return;
  }
  // Cloudflare supplies this header at the edge. Do not trust X-Forwarded-For.
  const address = request.headers.get("cf-connecting-ip") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address));
  const key = (auth ? "auth:" : "write:") + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const { success } = await limiter.limit({ key });
  if (!success) throw new ApiError(429, "too many requests; retry in one minute");
}

export const securityHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin",
  "strict-transport-security": "max-age=31536000",
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' https: data: blob:; media-src 'self' https: blob: data:; connect-src 'self' https://nominatim.openstreetmap.org https://geocoding-api.open-meteo.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com https://www.openstreetmap.org; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
};
