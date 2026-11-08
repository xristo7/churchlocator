// Public resource detail API: look up a published resource by id OR slug, plus signed-in library/bookmark saves.
import { ApiError, readJson } from './security.js';

const EMBED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com']);

export function slugify(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export function normalizeResourceKey(raw) {
  let key = String(raw || '').trim();
  try { key = decodeURIComponent(key); } catch { return ''; }
  key = key.trim();
  if (!key || key.length > 160 || /[\u0000-\u001f<>]/.test(key)) return '';
  return key;
}

// Exact id first, then explicit data slug, then a slug derived from the title, then id without the "demo-resource-" style prefix.
export function matchResource(rows, rawKey) {
  const key = normalizeResourceKey(rawKey);
  if (!key) return null;
  const lower = key.toLowerCase(), slug = slugify(key);
  const parsed = rows.map(row => ({ row, data: safeJson(row.data_json) }));
  return (parsed.find(({ row }) => row.id === key)
    || parsed.find(({ row }) => String(row.id).toLowerCase() === lower)
    || parsed.find(({ data }) => data.slug && slugify(data.slug) === slug)
    || parsed.find(({ data }) => slugify(data.title) === slug)
    || parsed.find(({ row }) => slugify(String(row.id).replace(/^.*?resource-/, '')) === slug)
    || null);
}

function safeJson(text) { try { return JSON.parse(text || '{}') || {}; } catch { return {}; } }

function materialFor(data, env) {
  const allowed = new Set(String(env.RESOURCE_HOSTS || '').split(',').map(v => v.trim()).filter(Boolean));
  const out = { embedUrl: null, fileUrl: null, captions: [] };
  const check = (value, hosts) => { try { const u = new URL(value); return u.protocol === 'https:' && hosts(u.hostname) ? u.toString() : null; } catch { return null; } };
  if (data.embedUrl) out.embedUrl = check(data.embedUrl, h => EMBED_HOSTS.has(h) || allowed.has(h));
  for (const field of ['sourceUrl', 'fileUrl', 'videoUrl', 'audioSrc']) if (!out.fileUrl && data[field]) out.fileUrl = check(data[field], h => allowed.has(h));
  if (Array.isArray(data.captions)) out.captions = data.captions.map(c => ({ src: check(c?.src, h => allowed.has(h)), label: String(c?.label || 'Captions').slice(0, 40), lang: String(c?.lang || 'en').slice(0, 12) })).filter(c => c.src);
  return out;
}

export async function handleResourcesApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const match = path.match(/^\/api\/resources\/([^/]+)(?:\/(library|bookmark))?$/);
  if (!match) return null;
  if (!env.DB) return ctx.json({ ok: false, error: 'Storage unavailable.' }, 503);
  const { results } = await env.DB.prepare("select * from platform_entities where kind='resources' and state='published' order by updated_at desc limit 1000").bind().all();
  const found = matchResource(results || [], match[1]);
  if (!found) return ctx.json({ ok: false, error: 'Resource not found.' }, 404);
  const { row, data } = found;
  const viewer = await ctx.getSessionUser(request, env);
  const entitled = data.access !== 'Paid' || (viewer && !!await env.DB.prepare('select order_id from entitlements where user_id=? and entity_id=? and revoked_at is null').bind(viewer.id, row.id).first());

  if (match[2]) {
    if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.');
    if (!viewer) throw new ApiError(401, 'Sign in required.');
    const list = match[2];
    if (list === 'library' && !entitled) throw new ApiError(402, 'This is a paid resource. Purchasing is not open yet, so it cannot be added to your library.');
    const input = await readJson(request).catch(() => ({}));
    const on = input.on !== false;
    if (on) await env.DB.prepare('insert or ignore into resource_library (user_id,resource_id,list,created_at) values (?,?,?,?)').bind(viewer.id, row.id, list, new Date().toISOString()).run();
    else await env.DB.prepare('delete from resource_library where user_id=? and resource_id=? and list=?').bind(viewer.id, row.id, list).run();
    return ctx.json({ ok: true, id: row.id, list, saved: on });
  }
  if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.');

  const church = await env.DB.prepare("select id,data_json from platform_entities where kind='churches' and state='published' and tenant_id=? order by created_at limit 1").bind(row.tenant_id).first();
  const churchData = church ? safeJson(church.data_json) : null;
  const counts = await env.DB.prepare(`select
    (select count(*) from content_engagements where content_type='resource' and content_id=?1 and reaction='love') likes,
    (select count(*) from resource_comments where resource_id=?1 and status='visible') comments,
    (select count(*) from resource_library where resource_id=?1 and list='bookmark') bookmarks`).bind(row.id).first();
  let viewerState = { signedIn: false, liked: false, inLibrary: false, bookmarked: false, entitled: data.access !== 'Paid' };
  if (viewer) {
    const saved = await env.DB.prepare('select list from resource_library where user_id=? and resource_id=?').bind(viewer.id, row.id).all();
    const lists = new Set((saved.results || []).map(r => r.list));
    const liked = await env.DB.prepare("select 1 from content_engagements where content_type='resource' and content_id=? and user_id=? and reaction='love'").bind(row.id, viewer.id).first();
    viewerState = { signedIn: true, liked: !!liked, inLibrary: lists.has('library'), bookmarked: lists.has('bookmark'), entitled: !!entitled };
  }
  const material = entitled ? materialFor(data, env) : { embedUrl: null, fileUrl: null, captions: [] };
  const resource = {
    id: row.id, slug: data.slug ? slugify(data.slug) : slugify(data.title), title: data.title || 'Untitled resource',
    type: data.type || '', format: data.format || '', duration: data.duration || '', topic: data.topic || '',
    creator: data.creator || '', description: data.description || '', image: data.image || '',
    access: data.access === 'Paid' ? 'Paid' : 'Free', price: Number(data.price) || 0,
    outline: entitled && Array.isArray(data.pages) ? data.pages.map(p => String(p)).slice(0, 200) : [],
    updatedAt: row.updated_at
  };
  return ctx.json({ ok: true, resource, material, locked: !entitled,
    church: church ? { id: church.id, name: churchData.name || '', city: churchData.city || '', country: churchData.country || '' } : null,
    counts: { likes: Number(counts?.likes || 0), comments: Number(counts?.comments || 0), bookmarks: Number(counts?.bookmarks || 0) },
    viewer: viewerState });
}
