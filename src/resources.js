import { ApiError, readJson } from './security.js';

// Public resource detail plus signed-in library and bookmark actions.
// Contract mirrors what public/resource-detail.js consumes:
//   GET  /api/resources/:idOrSlug
//   POST /api/resources/:id/library   { on: true }
//   POST /api/resources/:id/bookmark  { on: boolean }

const TRUSTED_EMBED_HOSTS = new Set(['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com']);

const slugify = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const parse = json => { try { return JSON.parse(json || '{}') || {}; } catch { return {}; } };
const text = (value, max = 4000) => (value == null ? '' : String(value).slice(0, max));

function trustedUrl(value, env) {
  if (!value) return null;
  let url;
  try { url = new URL(String(value)); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const allowed = String(env.RESOURCE_HOSTS || '').split(',').map(host => host.trim()).filter(Boolean);
  return TRUSTED_EMBED_HOSTS.has(url.hostname) || allowed.includes(url.hostname) ? url.toString() : null;
}

async function findResource(env, key) {
  const byId = await env.DB.prepare("select * from platform_entities where id=? and kind='resources' and state='published'").bind(key).first();
  if (byId) return byId;
  const wanted = slugify(key);
  if (!wanted) return null;
  const { results } = await env.DB.prepare("select * from platform_entities where kind='resources' and state='published' order by updated_at desc limit 500").bind().all();
  return (results || []).find(row => slugify(parse(row.data_json).title) === wanted) || null;
}

async function isEntitled(env, user, resource, data) {
  if (data.access !== 'Paid') return true;
  if (!user) return false;
  const bought = await env.DB.prepare('select 1 from entitlements where user_id=? and entity_id=? and revoked_at is null').bind(user.id, resource.id).first();
  if (bought) return true;
  const member = await env.DB.prepare('select 1 from tenant_memberships where user_id=? and tenant_id=? limit 1').bind(user.id, resource.tenant_id).first();
  return !!member;
}

async function detail(env, ctx, request, resource) {
  const data = parse(resource.data_json);
  const user = await ctx.getSessionUser(request, env);
  const entitled = await isEntitled(env, user, resource, data);
  const locked = !entitled;
  const church = await env.DB.prepare("select id,data_json from platform_entities where kind='churches' and tenant_id=? and state='published' order by created_at limit 1").bind(resource.tenant_id).first();
  const churchData = church ? parse(church.data_json) : null;
  const [likes, comments, bookmarks, liked, inLibrary, bookmarked] = await Promise.all([
    env.DB.prepare("select count(*) n from content_engagements where content_type='resource' and content_id=?").bind(resource.id).first(),
    env.DB.prepare("select count(*) n from resource_comments where resource_id=? and status='visible'").bind(resource.id).first(),
    env.DB.prepare('select count(*) n from resource_bookmarks where resource_id=?').bind(resource.id).first(),
    user ? env.DB.prepare("select 1 from content_engagements where content_type='resource' and content_id=? and user_id=?").bind(resource.id, user.id).first() : null,
    user ? env.DB.prepare('select 1 from resource_library where resource_id=? and user_id=?').bind(resource.id, user.id).first() : null,
    user ? env.DB.prepare('select 1 from resource_bookmarks where resource_id=? and user_id=?').bind(resource.id, user.id).first() : null
  ]);
  const captions = Array.isArray(data.captions) ? data.captions.map(track => ({ label: text(track?.label, 80), lang: text(track?.lang, 16), url: trustedUrl(track?.url, env) })).filter(track => track.url) : [];
  return ctx.json({
    ok: true,
    resource: {
      id: resource.id,
      slug: slugify(data.title),
      title: text(data.title, 200),
      type: text(data.type, 40),
      format: text(data.format, 40),
      duration: text(data.duration, 40),
      topic: text(data.topic, 80),
      creator: text(data.creator, 120),
      description: text(data.description, 4000),
      image: text(data.image, 1000),
      access: data.access === 'Paid' ? 'Paid' : 'Free',
      price: Number(data.price) || 0,
      outline: Array.isArray(data.outline) ? data.outline.map(item => text(item, 200)).slice(0, 100) : [],
      updatedAt: resource.updated_at
    },
    material: locked ? { embedUrl: null, fileUrl: null, captions: [] } : { embedUrl: trustedUrl(data.embedUrl, env), fileUrl: trustedUrl(data.sourceUrl, env), captions },
    locked,
    church: churchData ? { id: church.id, name: text(churchData.name, 160), city: text(churchData.city, 80), country: text(churchData.country, 8) } : null,
    counts: { likes: likes?.n || 0, comments: comments?.n || 0, bookmarks: bookmarks?.n || 0 },
    viewer: { signedIn: !!user, liked: !!liked, inLibrary: !!inLibrary, bookmarked: !!bookmarked, entitled }
  });
}

export async function handleResourceApi(request, env, ctx) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts[1] !== 'resources' || !parts[2]) return null;
  if (!env.DB) throw new ApiError(503, 'Storage unavailable.');
  let key;
  try { key = decodeURIComponent(parts[2]); } catch { throw new ApiError(404, 'Resource not found.'); }
  if (key.length > 160) throw new ApiError(404, 'Resource not found.');
  const resource = await findResource(env, key);
  if (!resource) throw new ApiError(404, 'Resource not found.');
  const action = parts[3];
  if (!action) {
    if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.');
    return detail(env, ctx, request, resource);
  }
  if (!['library', 'bookmark'].includes(action) || parts.length > 4) throw new ApiError(404, 'Resource not found.');
  if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.');
  const user = await ctx.getSessionUser(request, env);
  if (!user) throw new ApiError(401, 'Sign in required.');
  const input = await readJson(request);
  const on = input.on !== false;
  const now = new Date().toISOString();
  if (action === 'library') {
    if (!on) {
      await env.DB.prepare('delete from resource_library where user_id=? and resource_id=?').bind(user.id, resource.id).run();
      return ctx.json({ ok: true, inLibrary: false });
    }
    if (!await isEntitled(env, user, resource, parse(resource.data_json))) throw new ApiError(403, 'Purchase this resource to add it to your library.');
    await env.DB.prepare('insert or ignore into resource_library (user_id,resource_id,created_at) values (?,?,?)').bind(user.id, resource.id, now).run();
    return ctx.json({ ok: true, inLibrary: true });
  }
  if (on) await env.DB.prepare('insert or ignore into resource_bookmarks (user_id,resource_id,created_at) values (?,?,?)').bind(user.id, resource.id, now).run();
  else await env.DB.prepare('delete from resource_bookmarks where user_id=? and resource_id=?').bind(user.id, resource.id).run();
  return ctx.json({ ok: true, bookmarked: on });
}
