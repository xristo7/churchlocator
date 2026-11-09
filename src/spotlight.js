import { ApiError, readJson } from './security.js';
import { auditStatement } from './identity-security.js';
import { isOwner, membership, ownTenant, requireOwner, requireUser, studioAutoApprove } from './trusted-platform.js';

const contentTypes = new Set(["short", "long-preview", "church", "channel", "event", "live"]);
const states = new Set(["draft", "pending", "needs-changes", "approved", "scheduled", "live", "rejected", "expired"]);
const placements = new Set(["organic", "editorial", "sponsored"]);
function cleanText(value, maximum, label, required = false) {
  const text = String(value || "").trim();
  if (required && !text) throw new ApiError(400, label + " is required.");
  if (text.length > maximum) throw new ApiError(400, label + " is too long.");
  return text;
}
const OWN_MEDIA = /^\/media\/spotlight-media\/[A-Za-z0-9-]{8,64}\.(?:mp4|webm|jpg|png|webp)$/i;
const OWN_VIDEO = /^\/media\/spotlight-media\/[A-Za-z0-9-]{8,64}\.(?:mp4|webm)$/i;
const MAX_STORY_VIDEO_BYTES = 95 * 1024 * 1024;
const MAX_STORY_POSTER_BYTES = 5 * 1024 * 1024;
const isPlayableFullUrl = (value) => /^https:\/\//i.test(value || "") || OWN_VIDEO.test(value || "");
function safeUrl(value, label, required = false) {
  const text = cleanText(value, 2e3, label, required);
  if (!text) return null;
  if (OWN_MEDIA.test(text)) return text;
  if (/^(?:\/|\.\/)?(?:assets\/[^\s]*|(?:app|channels|channel-detail|channel-content|church-profile|event-profile)\.html(?:[?#][^\s]*)?)$/i.test(text)) return text;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new ApiError(400, "Use a valid " + label.toLowerCase() + ".");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new ApiError(400, label + " must use HTTPS.");
  return parsed.toString();
}
function integer(value, label, maximum = 86400) {
  if (value === "" || value === null || value === void 0) return null;
  const number2 = Number(value);
  if (!Number.isSafeInteger(number2) || number2 < 0 || number2 > maximum) throw new ApiError(400, "Invalid " + label.toLowerCase() + ".");
  return number2;
}
function isoDate(value, label) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new ApiError(400, "Invalid " + label.toLowerCase() + ".");
  return new Date(time).toISOString();
}
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
    allowDownload: Boolean(row.allow_download) && OWN_VIDEO.test(row.full_content_url || ""),
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
    disliked: Boolean(row.disliked),
    saved: Boolean(row.saved),
    followers: Number.isFinite(Number(row.followers)) ? Number(row.followers) : null,
    following: Boolean(row.following),
    reminderAt: row.reminder_at || null,
    channelUrl: row.channel_entity_id && ["short", "long-preview", "live"].includes(row.content_type) ? "/channels/" + encodeURIComponent(row.channel_entity_id) : row.subject_entity_id && row.content_type !== "event" ? "/channels/" + encodeURIComponent(row.subject_entity_id) : row.channel_entity_id ? "/channels/" + encodeURIComponent(row.channel_entity_id) : null,
    contentUrl: "app.html?view=channel-content&id=" + encodeURIComponent(row.channel_entity_id || "") + "&post=" + encodeURIComponent(row.id),
    permalink: "app.html?view=spotlight&post=" + encodeURIComponent(row.id)
  };
}
async function playbackViews(env, id) {
  try {
    const row = await env.DB.prepare("select coalesce((select sum(n) from (select item_id, day_bucket, count(*) n from watch_playback_events where item_id=? and day_bucket>=date('now','-31 days') group by item_id, day_bucket)),0) count from spotlight_items where id=?").bind(id, id).first();
    return Number(row?.count || 0);
  } catch (error) {
    if (/watch_playback_events|no such table/i.test(String(error?.message || error))) return 0;
    throw error;
  }
}
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
    commentsEnabled: input.commentsEnabled !== false,
    allowDownload: input.allowDownload === true
  };
}
async function verifyChannel(env, user, channelId, tenantId, owner) {
  if (!channelId) return null;
  const channel2 = await env.DB.prepare("select id,tenant_id,state,data_json from platform_entities where id=? and kind='channels'").bind(channelId).first();
  if (!channel2) throw new ApiError(404, "Selected channel was not found.");
  if (!owner && channel2.tenant_id !== tenantId) throw new ApiError(403, "Choose a channel you manage.");
  if (!owner && !["owner", "editor"].includes((await membership(env, user.id, channel2.tenant_id))?.role)) throw new ApiError(403, "Choose a channel you manage.");
  if (channel2.state !== "published") throw new ApiError(409, "Publish and verify the channel before submitting it to Spotlight.");
  return JSON.parse(channel2.data_json);
}
async function resolveChannel(env, user, channelId, tenantId, owner) {
  if (!channelId) return { data: null, contributor: false };
  const channel2 = await env.DB.prepare("select id,tenant_id,state,data_json from platform_entities where id=? and kind='channels'").bind(channelId).first();
  if (!channel2) throw new ApiError(404, "Selected channel was not found.");
  if (channel2.state !== "published") throw new ApiError(409, "Publish and verify the channel before submitting it to Spotlight.");
  let contributor = false;
  if (!owner) {
    const manages = channel2.tenant_id === tenantId && ["owner", "editor"].includes((await membership(env, user.id, channel2.tenant_id))?.role);
    contributor = !manages;
  }
  return { data: JSON.parse(channel2.data_json), contributor, tenantId: channel2.tenant_id };
}
async function resolveSubject(env, subjectId, channelTenantId) {
  if (subjectId) {
    const row = await env.DB.prepare("select id from platform_entities where id=? and kind in ('churches','channels') and state='published'").bind(subjectId).first();
    if (!row) throw new ApiError(400, "Choose a published church.");
    return subjectId;
  }
  if (!channelTenantId) return null;
  const church2 = await env.DB.prepare("select id from platform_entities where kind='churches' and state='published' and tenant_id=? order by created_at limit 1").bind(channelTenantId).first();
  return church2?.id || null;
}
function sniffStoryVideo(bytes) {
  if (bytes.length >= 12 && bytes[4] === 102 && bytes[5] === 116 && bytes[6] === 121 && bytes[7] === 112) return { ext: "mp4", type: "video/mp4" };
  if (bytes.length >= 4 && bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163) return { ext: "webm", type: "video/webm" };
  return null;
}
function sniffStoryPoster(bytes) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { ext: "jpg", type: "image/jpeg" };
  if (bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return { ext: "png", type: "image/png" };
  if (bytes.length >= 12 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) return { ext: "webp", type: "image/webp" };
  return null;
}
async function uploadStoryMedia(request, env, ctx) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  const user = await requireUser(request, env, ctx);
  if (!user.is_creator && !await isOwner(env, user)) throw new ApiError(403, "Creator account required.");
  if (!env.MEDIA) throw new ApiError(503, "Media uploads are not configured for this environment.");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new ApiError(415, "Choose a video from your device or record one.");
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_STORY_VIDEO_BYTES + MAX_STORY_POSTER_BYTES + 256 * 1024) throw new ApiError(413, "Choose a video smaller than 95 MB.");
  const form = await request.formData();
  const video = form.get("video"), poster = form.get("poster");
  const out = { ok: true };
  if (video && typeof video.arrayBuffer === "function") {
    if (video.size < 1 || video.size > MAX_STORY_VIDEO_BYTES) throw new ApiError(413, "Choose a video smaller than 95 MB.");
    const bytes = new Uint8Array(await video.arrayBuffer());
    const kind = sniffStoryVideo(bytes);
    if (!kind) throw new ApiError(400, "Use an MP4 or WebM video.");
    const key = "spotlight-media/" + crypto.randomUUID() + "." + kind.ext;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: kind.type, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { uploadedBy: String(user.id) } });
    out.videoUrl = "/media/" + key;
  }
  if (poster && typeof poster.arrayBuffer === "function") {
    if (poster.size < 1 || poster.size > MAX_STORY_POSTER_BYTES) throw new ApiError(413, "Choose a poster image smaller than 5 MB.");
    const bytes = new Uint8Array(await poster.arrayBuffer());
    const kind = sniffStoryPoster(bytes);
    if (!kind) throw new ApiError(400, "Use a JPG, PNG or WebP poster image.");
    const key = "spotlight-media/" + crypto.randomUUID() + "." + kind.ext;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: kind.type, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { uploadedBy: String(user.id) } });
    out.posterUrl = "/media/" + key;
  }
  if (!out.videoUrl && !out.posterUrl) throw new ApiError(400, "Choose a video from your device or record one.");
  return ctx.json(out, 201);
}
async function listFeed(request, env, ctx) {
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const now = (new Date()).toISOString();
  const user = await ctx.getSessionUser(request, env);
  const { results } = await env.DB.prepare(`
    select s.*,
      (select count(*) from spotlight_engagements e where e.item_id=s.id and e.action='like') likes,
      (select count(*) from spotlight_engagements e where e.item_id=s.id and e.action='save') saves,
      (select count(*) from spotlight_comments c where c.item_id=s.id and c.status='visible') comments,
      exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='like') liked,
      exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='save') saved,
      exists(select 1 from channel_follows f where f.channel_id=s.channel_entity_id and f.user_id=?) following,
      (select due_at from spotlight_reminders r where r.item_id=s.id and r.user_id=? and r.delivered_at is null) reminder_at
    from spotlight_items s
    where (
      s.status='live' or
      (s.status='approved' and (s.scheduled_at is null or s.scheduled_at<=?)) or
      (s.status='scheduled' and s.scheduled_at<=?)
    ) and (s.expires_at is null or s.expires_at>?)
    and exists(select 1 from platform_entities channel where channel.id=s.channel_entity_id and channel.kind='channels' and channel.state='published')
    and s.id not like 'spotlight-post-%'
    order by s.priority desc, coalesce(s.published_at,s.scheduled_at,s.updated_at) desc
    limit 100
  `).bind(user?.id || "", user?.id || "", user?.id || "", user?.id || "", now, now, now).all();
  return ctx.json({ ok: true, items: (results || []).map(itemRecord) });
}
async function workspace(request, env, ctx, id) {
  const user = await requireUser(request, env, ctx);
  const owner = await isOwner(env, user);
  if (request.method === "GET") {
    const tenant = owner ? null : await ownTenant(env, user);
    const items = await env.DB.prepare(owner ? "select * from spotlight_items order by updated_at desc limit 500" : "select * from spotlight_items where tenant_id=? order by updated_at desc limit 500").bind(...owner ? [] : [tenant]).all();
    const channels = await env.DB.prepare(owner ? "select id,data_json,tenant_id from platform_entities where kind='channels' and state='published' order by updated_at desc" : "select e.id,e.data_json,e.tenant_id from platform_entities e join tenant_memberships m on m.tenant_id=e.tenant_id where e.kind='channels' and e.state='published' and m.user_id=? and m.role in ('owner','editor') order by e.updated_at desc").bind(...owner ? [] : [user.id]).all();
    const churchRows = await env.DB.prepare("select id,tenant_id,data_json from platform_entities where kind='churches' and state='published' order by updated_at desc limit 500").all();
    const otherRows = owner ? { results: [] } : await env.DB.prepare("select id,tenant_id,data_json from platform_entities where kind='channels' and state='published' and tenant_id not in (select tenant_id from tenant_memberships where user_id=? and role in ('owner','editor')) order by updated_at desc limit 500").bind(user.id).all();
    const brief = ((row) => {
      const d = JSON.parse(row.data_json || "{}");
      return { id: row.id, tenantId: row.tenant_id, name: d.name || d.handle || row.id, handle: d.handle || "", city: d.city || "" };
    });
    return ctx.json({ ok: true, role: owner ? "owner" : "creator", churches: (churchRows.results || []).map(brief), otherChannels: (otherRows.results || []).map(brief), items: (items.results || []).map(itemRecord), channels: (channels.results || []).map((row) => ({ id: row.id, tenantId: row.tenant_id, ...JSON.parse(row.data_json) })) });
  }
  const input = await readJson(request);
  const data = validateItem(input);
  if (request.method === "POST") {
    const tenantId = owner && input.tenantId ? cleanText(input.tenantId, 128, "Tenant", true) : await ownTenant(env, user);
    if (!data.channelEntityId) throw new ApiError(400, "Choose the channel submitting this content.");
    const { data: channel2, contributor, tenantId: channelTenant } = await resolveChannel(env, user, data.channelEntityId, tenantId, owner);
    data.subjectEntityId = await resolveSubject(env, data.subjectEntityId, contributor ? channelTenant : null);
    if (["short", "long-preview", "live"].includes(data.contentType) && !isPlayableFullUrl(data.fullContentUrl)) throw new ApiError(400, "Upload or record a video, or add an HTTPS video URL.");
    const now = (new Date()).toISOString();
    const itemId = "spotlight-" + crypto.randomUUID();
    const existingStatus = null;
    const creatorName = data.creatorName || (contributor ? user.name : channel2?.name) || user.name;
    const creatorHandle = data.creatorHandle || (contributor ? "" : channel2?.handle) || "";
    const creatorAvatarUrl = data.creatorAvatarUrl || (contributor ? null : channel2?.avatar) || null;
    const status = input.saveAsDraft ? "draft" : !owner && !contributor && studioAutoApprove(env, user) && !["rejected", "expired"].includes(existingStatus) ? "approved" : "pending";
    await env.DB.batch([
      env.DB.prepare(`insert into spotlight_items
        (id,tenant_id,created_by,channel_entity_id,subject_entity_id,content_type,title,caption,creator_name,creator_handle,creator_avatar_url,media_url,poster_url,full_content_url,preview_source,preview_start_seconds,preview_end_seconds,duration_seconds,cta_label,cta_url,status,comments_enabled,allow_download,created_at,updated_at)
        values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(itemId, tenantId, user.id, data.channelEntityId, data.subjectEntityId, data.contentType, data.title, data.caption, creatorName, creatorHandle, creatorAvatarUrl, data.mediaUrl, data.posterUrl, data.fullContentUrl, data.previewSource, data.previewStartSeconds, data.previewEndSeconds, data.durationSeconds, data.ctaLabel, data.ctaUrl, status, Number(data.commentsEnabled), Number(data.allowDownload), now, now),
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
    const existingStatus = existing.status;
    if (!data.channelEntityId) throw new ApiError(400, "Choose the channel submitting this content.");
    const { data: channel2, contributor, tenantId: channelTenant } = await resolveChannel(env, user, data.channelEntityId, existing.tenant_id, owner);
    if (data.subjectEntityId !== existing.subject_entity_id || !data.subjectEntityId && contributor) data.subjectEntityId = await resolveSubject(env, data.subjectEntityId, contributor ? channelTenant : null);
    if (["short", "long-preview", "live"].includes(data.contentType) && !isPlayableFullUrl(data.fullContentUrl)) throw new ApiError(400, "Upload or record a video, or add an HTTPS video URL.");
    const now = (new Date()).toISOString();
    const status = input.saveAsDraft ? "draft" : !owner && !contributor && studioAutoApprove(env, user) && !["rejected", "expired"].includes(existingStatus) ? "approved" : "pending";
    const result = await env.DB.prepare(`update spotlight_items set channel_entity_id=?,subject_entity_id=?,content_type=?,title=?,caption=?,creator_name=?,creator_handle=?,creator_avatar_url=?,media_url=?,poster_url=?,full_content_url=?,preview_source=?,preview_start_seconds=?,preview_end_seconds=?,duration_seconds=?,cta_label=?,cta_url=?,comments_enabled=?,allow_download=?,status=?,moderation_note=null,revision=revision+1,updated_at=? where id=? and revision=? returning *`).bind(data.channelEntityId, data.subjectEntityId, data.contentType, data.title, data.caption, data.creatorName || (contributor ? user.name : channel2?.name) || user.name, data.creatorHandle || (contributor ? "" : channel2?.handle) || "", data.creatorAvatarUrl || (contributor ? null : channel2?.avatar) || null, data.mediaUrl, data.posterUrl, data.fullContentUrl, data.previewSource, data.previewStartSeconds, data.previewEndSeconds, data.durationSeconds, data.ctaLabel, data.ctaUrl, Number(data.commentsEnabled), Number(data.allowDownload), status, now, id, existing.revision).first();
    if (!result) throw new ApiError(409, "This submission changed. Reload and try again.");
    await auditStatement(env, user.id, "spotlight.resubmitted", id, existing.tenant_id).run();
    return ctx.json({ ok: true, item: itemRecord(result) });
  }
  throw new ApiError(405, "Method not allowed.");
}
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
  if (["live", "approved", "scheduled"].includes(status)) {
    if (!existing.channel_entity_id) throw new ApiError(409, "Assign a published channel before publishing.");
    await verifyChannel(env, user, existing.channel_entity_id, existing.tenant_id, true);
    if (["short", "long-preview", "live"].includes(existing.content_type) && !isPlayableFullUrl(existing.full_content_url)) throw new ApiError(409, "Add the HTTPS full video URL before publishing.");
  }
  const scheduledAt = isoDate(input.scheduledAt, "Schedule");
  const expiresAt = isoDate(input.expiresAt, "Expiry");
  if (status === "scheduled" && !scheduledAt) throw new ApiError(400, "Choose a publication time for scheduled content.");
  if (scheduledAt && expiresAt && Date.parse(expiresAt) <= Date.parse(scheduledAt)) throw new ApiError(400, "Expiry must be after publication.");
  const priority = integer(input.priority, "Priority", 1e3) ?? 0;
  const note = cleanText(input.moderationNote, 1e3, "Moderator note");
  const now = (new Date()).toISOString();
  const publishedAt = status === "live" ? existing.published_at || now : existing.published_at;
  const result = await env.DB.prepare("update spotlight_items set status=?,placement_kind=?,moderation_note=?,priority=?,scheduled_at=?,expires_at=?,published_at=?,revision=revision+1,updated_at=? where id=? and revision=? returning *").bind(status, placement, note || null, priority, scheduledAt, expiresAt, publishedAt, now, id, existing.revision).first();
  if (!result) throw new ApiError(409, "This submission changed. Reload and try again.");
  await auditStatement(env, user.id, "spotlight.moderated." + status, id, existing.tenant_id).run();
  return ctx.json({ ok: true, item: itemRecord(result) });
}
async function canModerateComment(env, user, item) {
  if (!user) return false;
  if (await isOwner(env, user).catch(() => false)) return true;
  if (item.tenant_id && await membership(env, user.id, item.tenant_id).catch(() => null)) return true;
  if (item.channel_entity_id) try {
    const channel2 = await env.DB.prepare("select t.owner_user_id from platform_entities e join tenants t on t.id=e.tenant_id where e.id=?").bind(item.channel_entity_id).first().catch(() => null);
    if (channel2?.owner_user_id === user.id) return true;
  } catch {
    return false;
  }
  return false;
}
async function comments(request, env, ctx, itemId, commentId) {
  if (request.method === "DELETE") {
    const user = await requireUser(request, env, ctx);
    if (!commentId || commentId.length > 64) throw new ApiError(404, "Comment not found.");
    const item2 = await env.DB.prepare("select id,tenant_id,channel_entity_id from spotlight_items where id=?").bind(itemId || "").first();
    if (!item2) throw new ApiError(404, "Comment not found.");
    const comment = await env.DB.prepare("select id,user_id from spotlight_comments where id=? and item_id=? and status='visible'").bind(commentId, item2.id).first();
    if (!comment) throw new ApiError(404, "Comment not found.");
    if (comment.user_id !== user.id && !await canModerateComment(env, user, item2)) throw new ApiError(403, "You cannot delete this comment.");
    await env.DB.prepare("update spotlight_comments set status='hidden' where id=?").bind(comment.id).run();
    await auditStatement(env, user.id, "spotlight.comment.deleted", item2.id, item2.tenant_id).run();
    return ctx.json({ ok: true, deleted: comment.id, item: await memberItem(env, item2.id, user.id) });
  }
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const item = await publicItem(env, itemId);
  const viewer = await ctx.getSessionUser(request, env);
  const moderator = await canModerateComment(env, viewer, item);
  const { results } = await env.DB.prepare(`select c.id,c.user_id,c.body,c.created_at,u.name from spotlight_comments c join users u on u.id=c.user_id where c.item_id=? and c.status='visible' order by c.created_at desc limit 100`).bind(itemId).all();
  return ctx.json({ ok: true, comments: (results || []).map((row) => ({ id: row.id, body: row.body, author: row.name, createdAt: row.created_at, own: !!viewer && row.user_id === viewer.id, canDelete: !!viewer && (row.user_id === viewer.id || moderator) })) });
}
async function engage(request, env, ctx, itemId) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  const user = await requireUser(request, env, ctx);
  const item = await publicItem(env, itemId);
  const input = await readJson(request);
  const action = cleanText(input.action, 20, "Action", true);
  const now = (new Date()).toISOString();
  if (action === "follow") {
    if (!item.channel_entity_id) throw new ApiError(409, "This post needs a channel association.");
    if (typeof input.active !== "boolean") throw new ApiError(400, "Choose follow or unfollow.");
    if (input.active) await env.DB.prepare("insert into channel_follows(user_id,channel_id,created_at) values (?,?,?) on conflict do nothing").bind(user.id, item.channel_entity_id, now).run();
    else await env.DB.prepare("delete from channel_follows where user_id=? and channel_id=?").bind(user.id, item.channel_entity_id).run();
    return ctx.json({ ok: true, active: input.active });
  }
  if (["like", "dislike"].includes(action)) {
    const bucket = await env.DB.prepare(`insert into spotlight_engagement_rate_limits(user_id,item_id,minute_bucket,attempts)
      values (?,?,?,1) on conflict(user_id,item_id,minute_bucket) do update set attempts=attempts+1
      where spotlight_engagement_rate_limits.attempts<12 returning attempts`).bind(user.id, itemId, now.slice(0, 16)).first();
    if (!bucket) throw new ApiError(429, "You are changing your rating too quickly. Please wait a minute.");
  }
  if (["like", "dislike", "save"].includes(action)) {
    if (input.active !== void 0 && typeof input.active !== "boolean") throw new ApiError(400, "Choose a valid engagement state.");
    if (typeof input.active === "boolean") {
      if (input.active) await env.DB.prepare("insert into spotlight_engagements values (?,?,?,?) on conflict do nothing").bind(itemId, user.id, action, now).run();
      else await env.DB.prepare("delete from spotlight_engagements where item_id=? and user_id=? and action=?").bind(itemId, user.id, action).run();
      return ctx.json({ ok: true, active: input.active, item: await memberItem(env, itemId, user.id) });
    }
    const existing = await env.DB.prepare("select action from spotlight_engagements where item_id=? and user_id=? and action=?").bind(itemId, user.id, action).first();
    if (existing) await env.DB.prepare("delete from spotlight_engagements where item_id=? and user_id=? and action=?").bind(itemId, user.id, action).run();
    else await env.DB.prepare("insert into spotlight_engagements values (?,?,?,?)").bind(itemId, user.id, action, now).run();
    return ctx.json({ ok: true, active: !existing, item: await memberItem(env, itemId, user.id) });
  }
  if (action === "report") {
    await env.DB.prepare("insert into spotlight_engagements values (?,?,'report',?) on conflict do nothing").bind(itemId, user.id, now).run();
    await auditStatement(env, user.id, "spotlight.reported", itemId, item.tenant_id).run();
    return ctx.json({ ok: true, active: true });
  }
  if (action === "comment") {
    if (!item.comments_enabled) throw new ApiError(409, "Comments are closed for this item.");
    const body = cleanText(input.body, 600, "Comment", true);
    const recent = await env.DB.prepare("select count(*) n from spotlight_comments where user_id=? and created_at>?").bind(user.id, new Date(Date.now() - 6e4).toISOString()).first();
    if (Number(recent?.n || 0) >= 5) throw new ApiError(429, "You are commenting too quickly. Please wait a minute.");
    const id = crypto.randomUUID();
    await env.DB.prepare("insert into spotlight_comments (id,item_id,user_id,body,created_at) values (?,?,?,?,?)").bind(id, itemId, user.id, body, now).run();
    return ctx.json({ ok: true, comment: { id, body, author: user.name, createdAt: now, own: true, canDelete: true }, item: await memberItem(env, itemId, user.id) }, 201);
  }
  throw new ApiError(400, "Unsupported Spotlight action.");
}
const visibleSql = `(s.status='live' or (s.status='approved' and (s.scheduled_at is null or s.scheduled_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))) or (s.status='scheduled' and s.scheduled_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))) and (s.expires_at is null or s.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) and exists(select 1 from platform_entities channel where channel.id=s.channel_entity_id and channel.kind='channels' and channel.state='published')`;
async function publicItem(env, id) {
  const row = await env.DB.prepare(`select s.* from spotlight_items s where s.id=? and ${visibleSql}`).bind(id).first();
  if (!row) throw new ApiError(404, "This Spotlight post is unavailable.");
  return row;
}
async function memberItem(env, id, userId = "") {
  const row = await publicItem(env, id);
  const stats = await env.DB.prepare(`select
    (select count(*) from spotlight_engagements where item_id=? and action='like') likes,
    (select count(*) from channel_follows where channel_id=?) followers,
    (select count(*) from spotlight_engagements where item_id=? and action='save') saves,
    (select count(*) from spotlight_comments where item_id=? and status='visible') comments,
    exists(select 1 from spotlight_engagements where item_id=? and user_id=? and action='like') liked,
    exists(select 1 from spotlight_engagements where item_id=? and user_id=? and action='dislike') disliked,
    exists(select 1 from spotlight_engagements where item_id=? and user_id=? and action='save') saved,
    exists(select 1 from channel_follows where channel_id=? and user_id=?) following,
    (select due_at from spotlight_reminders where item_id=? and user_id=? and delivered_at is null) reminder_at`).bind(id, row.channel_entity_id, id, id, id, userId, id, userId, id, userId, row.channel_entity_id, userId, id, userId).first();
  stats.followers = Number(stats.followers || 0);
  return itemRecord({ ...row, ...stats });
}
export async function deliverSpotlightNotifications(env) {
  if (!env.DB) return;
  const now = (new Date()).toISOString();
  await env.DB.batch([
    env.DB.prepare(`insert into spotlight_publications select s.id,coalesce(s.published_at,s.scheduled_at,s.updated_at) from spotlight_items s where ${visibleSql} and s.channel_entity_id is not null and not exists(select 1 from spotlight_publications p where p.item_id=s.id) limit 500`),
    env.DB.prepare(`insert or ignore into spotlight_notifications(id,user_id,item_id,kind,created_at)
      select 'publication:'||f.user_id||':'||s.id,f.user_id,s.id,'publication',p.published_at
      from spotlight_publications p join spotlight_items s on s.id=p.item_id join channel_follows f on f.channel_id=s.channel_entity_id
      where ${visibleSql} and f.created_at<=p.published_at
      and not exists(select 1 from spotlight_notifications n where n.id='publication:'||f.user_id||':'||s.id) limit 500`),
    env.DB.prepare(`insert or ignore into spotlight_notifications(id,user_id,item_id,kind,created_at)
      select 'reminder:'||r.user_id||':'||r.item_id||':'||r.due_at,r.user_id,r.item_id,'reminder',?
      from spotlight_reminders r join spotlight_items s on s.id=r.item_id where r.delivered_at is null and r.due_at<=? and ${visibleSql} limit 500`).bind(now, now),
    env.DB.prepare(`update spotlight_reminders set delivered_at=? where delivered_at is null and exists(select 1 from spotlight_notifications n where n.id='reminder:'||spotlight_reminders.user_id||':'||spotlight_reminders.item_id||':'||spotlight_reminders.due_at)`).bind(now)
  ]);
}
async function recordPlayback(request, env, ctx, itemId) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  await publicItem(env, itemId);
  const input = await readJson(request);
  const sessionKey = cleanText(input.playbackKey, 128, "Playback session", true);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(sessionKey)) throw new ApiError(400, "Start playback again to count this view.");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sessionKey)));
  const sessionHash = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const today = (new Date()).toISOString().slice(0, 10);
  try {
    const exists = await env.DB.prepare("select 1 present from sqlite_master where type='table' and name='watch_playback_events'").first();
    if (!exists) return ctx.json({ ok: true, recorded: false, unavailable: true });
    const activity = await env.DB.prepare("select count(*) count from watch_playback_events where session_hash=? and created_at>=?").bind(sessionHash, new Date(Date.now() - 36e5).toISOString()).first();
    if (Number(activity?.count || 0) >= 12) throw new ApiError(429, "Too many playback starts from this tab. Try again later.");
    await env.DB.prepare("insert into watch_playback_events(item_id,day_bucket,session_hash,created_at) values (?,?,?,?) on conflict do nothing").bind(itemId, today, sessionHash, (new Date()).toISOString()).run();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (/no such table.*watch_playback_events/i.test(String(error?.message || error))) return ctx.json({ ok: true, recorded: false, unavailable: true });
    throw error;
  }
  return ctx.json({ ok: true, recorded: true, views: await playbackViews(env, itemId) });
}
const POST_IMAGE = /^(?:https:\/\/[^\s]+\.(?:jpe?g|png|webp|gif)(?:\?[^\s]*)?|\/(?:media|assets)\/[A-Za-z0-9._\/-]+)$/i;
async function channelPost(request, env, ctx, channelId, indexText) {
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const index = Number(indexText);
  if (!channelId || channelId.length > 128 || !Number.isInteger(index) || index < 0 || index > 199) throw new ApiError(404, "This channel post is unavailable.");
  const channel = await env.DB.prepare("select e.id,e.tenant_id,e.data_json,t.owner_user_id from platform_entities e join tenants t on t.id=e.tenant_id where e.id=? and e.kind='channels' and e.state='published'").bind(channelId).first();
  if (!channel) throw new ApiError(404, "This channel post is unavailable.");
  let data;
  try { data = JSON.parse(channel.data_json); } catch { throw new ApiError(404, "This channel post is unavailable."); }
  const post = Array.isArray(data.posts) ? data.posts[index] : null;
  if (!post || typeof post !== "object" || !String(post.title || "").trim()) throw new ApiError(404, "This channel post is unavailable.");
  let media = "";
  for (const key of ["embedUrl", "mediaUrl", "audioSrc", "sourceUrl", "url"]) {
    const candidate = String(post[key] || "").trim();
    if (/^https:\/\/[^\s]+$/i.test(candidate) || OWN_VIDEO.test(candidate)) { media = candidate; break; }
  }
  const imageOf = (value) => POST_IMAGE.test(String(value || "").trim()) ? String(value).trim() : "";
  const poster = imageOf(post.image) || imageOf(data.cover) || imageOf(data.avatar) || "/assets/logo-grace-house.png";
  const id = "spotlight-post-" + channelId + "-" + index;
  const now = (new Date()).toISOString();
  const title = String(post.title).trim().slice(0, 160);
  const caption = String(post.summary || post.body || "").trim().slice(0, 4000);
  const creator = String(data.name || "Channel").slice(0, 120), handle = String(data.handle || "").slice(0, 120);
  await env.DB.prepare(`insert into spotlight_items
    (id,tenant_id,created_by,channel_entity_id,content_type,title,caption,creator_name,creator_handle,creator_avatar_url,media_url,poster_url,full_content_url,preview_source,status,comments_enabled,published_at,created_at,updated_at)
    values (?,?,?,?,'long-preview',?,?,?,?,?,null,?,?,'creator','live',1,?,?,?)
    on conflict(id) do update set title=excluded.title,caption=excluded.caption,creator_name=excluded.creator_name,creator_handle=excluded.creator_handle,creator_avatar_url=excluded.creator_avatar_url,poster_url=excluded.poster_url,full_content_url=excluded.full_content_url,updated_at=excluded.updated_at`)
    .bind(id, channel.tenant_id, channel.owner_user_id, channelId, title, caption, creator, handle, imageOf(data.avatar) || null, poster, media || null, now, now, now).run();
  const user = await ctx.getSessionUser(request, env);
  return ctx.json({ ok: true, item: await memberItem(env, id, user?.id || "") });
}
async function discovery(request, env, ctx, scope, id) {
  if (scope === "item" || scope === "channel") {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    const user2 = await ctx.getSessionUser(request, env);
    if (scope === "item") {
      const item = await memberItem(env, id, user2?.id || "");
      return ctx.json({ ok: true, item: { ...item, views: await playbackViews(env, id) } });
    }
    const channel2 = await env.DB.prepare("select id,data_json from platform_entities where id=? and kind='channels' and state='published'").bind(id).first();
    if (!channel2) throw new ApiError(404, "Channel unavailable.");
    const { results } = await env.DB.prepare(`select s.id from spotlight_items s where s.channel_entity_id=? and ${visibleSql} order by coalesce(s.published_at,s.updated_at) desc limit 100`).bind(id).all();
    const follow = await env.DB.prepare("select notifications_enabled from channel_follows where user_id=? and channel_id=?").bind(user2?.id || "", id).first();
    const counts = await env.DB.prepare("select count(*) count from channel_follows where channel_id=?").bind(id).first();
    let profile = { id: channel2.id };
    try {
      const data = JSON.parse(channel2.data_json || "{}");
      if (typeof data.seriesTitle === "string" && data.seriesTitle.trim()) profile.seriesTitle = data.seriesTitle.trim().slice(0, 120);
      profile.topic = String(data.topic || data.format || "").trim().slice(0, 80) || null;
      profile.name = String(data.name || "").trim().slice(0, 120) || null;
    } catch {
    }
    profile.topic = profile.topic || null;
    return ctx.json({ ok: true, following: !!follow, notificationsEnabled: !!follow, followers: counts.count, channel: profile, items: await Promise.all(results.map((row) => memberItem(env, row.id, user2?.id || ""))) });
  }
  const user = await requireUser(request, env, ctx);
  if (scope === "channel-follow") {
    if (request.method !== "PUT") throw new ApiError(405, "Method not allowed.");
    const channel2 = await env.DB.prepare("select id from platform_entities where id=? and kind='channels' and state='published'").bind(id).first();
    if (!channel2) throw new ApiError(404, "Channel unavailable.");
    const input = await readJson(request);
    if (typeof input.active !== "boolean") throw new ApiError(400, "Choose follow or unfollow.");
    if (input.active) await env.DB.prepare("insert into channel_follows(user_id,channel_id,notifications_enabled,created_at) values (?,?,1,?) on conflict(user_id,channel_id) do update set notifications_enabled=1").bind(user.id, id, (new Date()).toISOString()).run();
    else await env.DB.prepare("delete from channel_follows where user_id=? and channel_id=?").bind(user.id, id).run();
    const counts = await env.DB.prepare("select count(*) count from channel_follows where channel_id=?").bind(id).first();
    return ctx.json({ ok: true, following: input.active, notificationsEnabled: input.active, followers: counts.count });
  }
  if (scope === "saved" || scope === "following") {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    const cursor = new URL(request.url).searchParams.get("cursor") || "";
    const relation = scope === "saved" ? `exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='save')` : `exists(select 1 from channel_follows f where f.channel_id=s.channel_entity_id and f.user_id=?)`;
    const { results } = await env.DB.prepare(`select s.id from spotlight_items s where ${visibleSql} and ${relation} and s.id>? order by s.id limit 50`).bind(user.id, cursor).all();
    return ctx.json({ ok: true, items: await Promise.all(results.map((row) => memberItem(env, row.id, user.id))), nextCursor: results.length === 50 ? results.at(-1).id : null });
  }
  if (scope === "notifications") {
    if (request.method === "PUT") {
      if (id?.startsWith("live:")) {
        await env.DB.prepare("update live_notifications set read_at=? where user_id=? and session_id=?").bind((new Date()).toISOString(), user.id, id.slice(5)).run();
        return ctx.json({ ok: true });
      }
      await env.DB.prepare("update spotlight_notifications set read_at=? where user_id=? and id=?").bind((new Date()).toISOString(), user.id, id).run();
      return ctx.json({ ok: true });
    }
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    const { results } = await env.DB.prepare(`select n.*,s.title,s.channel_entity_id from spotlight_notifications n join spotlight_items s on s.id=n.item_id where n.user_id=? and ${visibleSql} order by n.created_at desc limit 100`).bind(user.id).all();
    const live = await env.DB.prepare("select n.*,s.title,s.channel_id from live_notifications n join channel_live_sessions s on s.id=n.session_id join platform_entities e on e.id=s.channel_id where n.user_id=? and e.state='published' order by n.created_at desc limit 100").bind(user.id).all();
    return ctx.json({ ok: true, notifications: [...results.map((row) => ({ id: row.id, itemId: row.item_id, title: row.title, kind: row.kind, read: !!row.read_at, createdAt: row.created_at, url: "app.html?view=spotlight&post=" + encodeURIComponent(row.item_id) })), ...live.results.map((row) => ({ id: "live:" + row.session_id, title: row.title, kind: "live", read: !!row.read_at, createdAt: row.created_at, url: "app.html?view=channel-live&id=" + encodeURIComponent(row.channel_id) + "&post=" + encodeURIComponent(row.session_id) }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100) });
  }
  if (scope === "reminders") {
    await publicItem(env, id);
    if (request.method === "DELETE") {
      await env.DB.prepare("delete from spotlight_reminders where user_id=? and item_id=?").bind(user.id, id).run();
      return ctx.json({ ok: true });
    }
    if (request.method !== "PUT") throw new ApiError(405, "Method not allowed.");
    const input = await readJson(request);
    const dueAt = isoDate(input.dueAt, "Reminder time");
    if (!dueAt || Date.parse(dueAt) <= Date.now() || Date.parse(dueAt) > Date.now() + 90 * 864e5) throw new ApiError(400, "Choose a future time within 90 days.");
    await env.DB.prepare("insert into spotlight_reminders(user_id,item_id,due_at) values (?,?,?) on conflict(user_id,item_id) do update set due_at=excluded.due_at,delivered_at=null").bind(user.id, id, dueAt).run();
    return ctx.json({ ok: true, dueAt });
  }
  throw new ApiError(404, "Spotlight endpoint not found.");
}
export async function handleSpotlightApi(request, env, ctx) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  if (parts[3]) {
    try {
      parts[3] = decodeURIComponent(parts[3]);
    } catch {
      throw new ApiError(400, "Invalid Spotlight identifier.");
    }
  }
  if (parts[0] !== "api" || parts[1] !== "spotlight") return null;
  if (!env.DB) throw new ApiError(503, "Storage unavailable.");
  const scope = parts[2] || "feed";
  if (scope === "channel-post") return channelPost(request, env, ctx, parts[3], parts[4]);
  if (scope === "playback") return recordPlayback(request, env, ctx, parts[3]);
  if (["item", "channel", "channel-follow", "saved", "following", "notifications", "reminders"].includes(scope)) return discovery(request, env, ctx, scope, parts[3]);
  if (scope === "feed") return listFeed(request, env, ctx);
  if (scope === "upload") return uploadStoryMedia(request, env, ctx);
  if (scope === "workspace") return workspace(request, env, ctx, parts[3]);
  if (scope === "admin") return moderate(request, env, ctx, parts[3]);
  if (scope === "comments") {
    let commentId = parts[4];
    if (commentId) {
      try {
        commentId = decodeURIComponent(commentId);
      } catch {
        throw new ApiError(400, "Invalid comment identifier.");
      }
    }
    return comments(request, env, ctx, parts[3], commentId);
  }
  if (scope === "engagement") return engage(request, env, ctx, parts[3]);
  throw new ApiError(404, "Spotlight endpoint not found.");
}

