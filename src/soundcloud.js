// SoundCloud integration for meditation rooms.
// Paste mode works without credentials (public oEmbed + Widget player).
// Search mode needs SOUNDCLOUD_CLIENT_ID (+ SOUNDCLOUD_CLIENT_SECRET for the OAuth client-credentials flow).
const HOSTS = new Set(["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com", "on.soundcloud.com"]);

export function normalizeSoundCloudUrl(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || !HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.hostname === "m.soundcloud.com" || url.hostname === "www.soundcloud.com") url.hostname = "soundcloud.com";
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "soundcloud.com" && parts.length < 2) return null;
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

const clean = (value, max) => String(value || "").replace(/<[^>]*>/g, "").trim().slice(0, max);
const httpsOrEmpty = value => { try { const u = new URL(String(value || "")); return u.protocol === "https:" ? u.toString() : ""; } catch { return ""; } };

// Server-side shape check for the selection stored on a room.
export function sanitizeSoundCloudSelection(input) {
  if (input === undefined || input === null || input === "") return null;
  if (typeof input === "string") { try { input = JSON.parse(input); } catch { return null; } }
  if (!input || typeof input !== "object") return null;
  const url = normalizeSoundCloudUrl(input.url);
  if (!url) return null;
  return {
    url,
    kind: input.kind === "playlist" ? "playlist" : "track",
    title: clean(input.title, 200) || "SoundCloud audio",
    author: clean(input.author, 120),
    artworkUrl: httpsOrEmpty(input.artworkUrl)
  };
}

export async function resolveSoundCloud(rawUrl, fetcher = fetch) {
  const url = normalizeSoundCloudUrl(rawUrl);
  if (!url) return { ok: false, status: 400, error: "Paste a SoundCloud track or playlist link." };
  const response = await fetcher(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`, { headers: { accept: "application/json" } });
  if (!response.ok) return { ok: false, status: response.status === 404 ? 404 : 502, error: response.status === 404 ? "That SoundCloud link is private, removed or not embeddable." : "SoundCloud did not respond. Try again." };
  const data = await response.json();
  const src = /src="([^"]+)"/.exec(data.html || "")?.[1] || "";
  const kind = /\/sets\/|%2Fplaylists%2F/.test(url + src) ? "playlist" : "track";
  const title = clean(data.title, 200);
  const author = clean(data.author_name, 120);
  return { ok: true, selection: { url, kind, title: author && title.endsWith(` by ${author}`) ? title.slice(0, -(` by ${author}`).length) : title, author, artworkUrl: httpsOrEmpty(data.thumbnail_url) } };
}

async function soundCloudToken(env, fetcher) {
  if (!env.SOUNDCLOUD_CLIENT_SECRET) return null;
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const response = await fetcher("https://secure.soundcloud.com/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Basic " + btoa(`${env.SOUNDCLOUD_CLIENT_ID}:${env.SOUNDCLOUD_CLIENT_SECRET}`) }, body });
  if (!response.ok) return null;
  return (await response.json()).access_token || null;
}

export async function searchSoundCloud(env, query, fetcher = fetch) {
  if (!env.SOUNDCLOUD_CLIENT_ID) return { ok: true, available: false, results: [] };
  const q = clean(query, 100);
  if (q.length < 2) return { ok: true, available: true, results: [] };
  const token = await soundCloudToken(env, fetcher);
  const params = new URLSearchParams({ q, limit: "10", access: "playable" });
  if (!token) params.set("client_id", env.SOUNDCLOUD_CLIENT_ID);
  const response = await fetcher(`https://api.soundcloud.com/tracks?${params}`, { headers: { accept: "application/json", ...(token ? { authorization: `OAuth ${token}` } : {}) } });
  if (!response.ok) return { ok: true, available: false, results: [], error: "SoundCloud search is unavailable right now. Paste a link instead." };
  const data = await response.json();
  const list = Array.isArray(data) ? data : (data.collection || []);
  return { ok: true, available: true, results: list.map(track => sanitizeSoundCloudSelection({ url: track.permalink_url, kind: "track", title: track.title, author: track.user?.username, artworkUrl: track.artwork_url || track.user?.avatar_url })).filter(Boolean) };
}

export async function handleSoundCloudApi(request, env, path, getSessionUser, json) {
  if (path !== "/api/soundcloud/resolve" && path !== "/api/soundcloud/search") return null;
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
  const user = await getSessionUser(request, env);
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);
  const params = new URL(request.url).searchParams;
  if (path === "/api/soundcloud/search") return json(await searchSoundCloud(env, params.get("q")));
  const result = await resolveSoundCloud(params.get("url"));
  return json(result.ok ? { ok: true, selection: result.selection, searchAvailable: Boolean(env.SOUNDCLOUD_CLIENT_ID) } : { ok: false, error: result.error }, result.ok ? 200 : result.status);
}
