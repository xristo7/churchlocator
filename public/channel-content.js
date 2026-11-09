(function () {
  "use strict";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  async function readSessionSignedIn() {
    try { return Boolean((await fetchJson('/api/auth/session',10000))?.user); }
    catch { return null; }
  }

  function playbackKey() {
    let key = "";
    try { key = sessionStorage.getItem("mwe.watch.playback.key") || ""; } catch { /* per-tab fallback below */ }
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(key)) {
      key = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
      try { sessionStorage.setItem("mwe.watch.playback.key", key); } catch { /* memory only */ }
    }
    return key;
  }

  async function recordPlayback(root, item) {
    if (!item.id || item._rsViewRecording || item._rsViewCounted) return;
    item._rsViewRecording = true;
    try {
      const response = await fetch("/api/spotlight/playback/" + encodeURIComponent(item.id), {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ playbackKey: playbackKey() })
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.recorded) {
        item._rsViewCounted = true;
        item.views = result.views;
        const count = root.querySelector("[data-watch-views]");
        if (count) count.textContent = Number(result.views).toLocaleString() + (Number(result.views) === 1 ? " view" : " views");
      }
    } catch { /* view metrics never interrupt playback */ }
    finally { item._rsViewRecording = false; }
  }

  function loginDestination(item) {
    if (item?.id) return "channel-content.html?post=" + encodeURIComponent(item.id);
    return location.pathname + location.search;
  }

  function requireSignIn(item, message) {
    window.MWE?.openMemberLogin?.(loginDestination(item));
    window.showToast?.(message || "Sign in to continue.");
    return false;
  }

  async function fetchJson(url, timeout = 10000) {
    const controller = new AbortController();
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Read timed out after '+(timeout/1000)+' seconds. Please retry.')); }, timeout);
    });
    try {
      const response = await Promise.race([fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal}), timeoutPromise]);
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Content is unavailable.');
      return result;
    } finally { clearTimeout(timer); }
  }
  function get(path, timeout) { return fetchJson('/api/spotlight/' + path, timeout); }

  function isHttpsUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function youtubeId(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
        return url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] || null;
      }
      if (host === "youtu.be") return url.pathname.slice(1).match(/^([\w-]{11})/)?.[1] || null;
    } catch { /* ignore */ }
    return null;
  }

  function mediaKind(url) {
    if (!url || (!isHttpsUrl(url) && !/^\/media\/church-video\/[0-9a-f-]{36}\.(?:mp4|webm)$/i.test(url))) return "none";
    if (youtubeId(url)) return "youtube";
    if (/\.(mp4|webm)(?:\?|$)/i.test(url)) return "video";
    if (/\.(mp3|m4a|ogg)(?:\?|$)/i.test(url)) return "audio";
    if (/^https:\/\//i.test(url) && !/^https?:\/\/(?:app\.html|[\w.-]+\/app\.html)/i.test(url) && !url.includes("view=channels") && !url.includes("view=directory")) {
      return "external";
    }
    return "none";
  }

  function ytPoster(url, fallback) {
    const id = youtubeId(url || "");
    if (id) return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
    return fallback || "";
  }

  function formatWhen(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  function relativeAge(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (seconds < 60) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + " min ago";
    const hours = Math.round(minutes / 60);
    if (hours < 48) return hours + " hr ago";
    const days = Math.round(hours / 24);
    if (days < 45) return days + " days ago";
    return formatWhen(iso);
  }

  function viewClassFor(item) {
    const kind = mediaKind(item.fullContentUrl || "");
    if (kind === "audio") return "channel-audio-view";
    if (!item.fullContentUrl && item.body) return "channel-article-view";
    return "channel-video-view";
  }

  function mountPlayer(host, item, container) {
    const url = item.fullContentUrl || "";
    const kind = mediaKind(url);
    host.replaceChildren();
    host.dataset.mediaKind = kind;

    if (kind === "none") {
      const poster = ytPoster(url, item.posterUrl || item.imageUrl || item.thumbnailUrl || "");
      const empty = document.createElement("div");
      empty.className = "mwe-player-status";
      empty.innerHTML = poster
        ? '<img class="mwe-player-poster" src="' + esc(poster) + '" alt="" /><div class="mwe-player-status-copy"><strong>The full video has not been supplied yet.</strong><p>Open the channel for updates, or retry if the media link should load.</p><button type="button" class="mwe-chip" data-player-retry>Retry</button></div>'
        : '<div class="mwe-player-status-copy"><strong>No playable media on this post.</strong><p>A supported HTTPS video, audio, or YouTube link is required.</p><button type="button" class="mwe-chip" data-player-retry>Retry</button></div>';
      host.append(empty);
      empty.querySelector("[data-player-retry]")?.addEventListener("click", () => location.reload());
      window.lucide?.createIcons?.();
      return;
    }

    if (kind === "external") {
      const wrap = document.createElement("div");
      wrap.className = "mwe-player-status";
      wrap.innerHTML = '<div class="mwe-player-status-copy"><strong>This media opens on another site.</strong><p><a class="module-primary-action" href="' + esc(url) + '" target="_blank" rel="noopener">Watch full content</a></p><button type="button" class="mwe-chip" data-player-retry>Retry</button></div>';
      host.append(wrap);
      wrap.querySelector("[data-player-retry]")?.addEventListener("click", () => mountPlayer(host, item, container));
      return;
    }

    const loading = document.createElement("div");
    loading.className = "mwe-player-status is-loading";
    loading.innerHTML = '<div class="mwe-player-status-copy"><strong>Loading media…</strong></div>';
    host.append(loading);

    const fail = (message) => {
      host.replaceChildren();
      const box = document.createElement("div");
      box.className = "mwe-player-status is-error";
      box.innerHTML = '<div class="mwe-player-status-copy"><strong>' + esc(message) + '</strong><p>Check the media link, then try again.</p><button type="button" class="mwe-chip" data-player-retry>Retry</button></div>';
      host.append(box);
      box.querySelector("[data-player-retry]")?.addEventListener("click", () => mountPlayer(host, item, container));
      window.lucide?.createIcons?.();
    };

    if (kind === "youtube") {
      const id = youtubeId(url);
      if (!id) return fail("This YouTube link could not be opened.");
      const frame = document.createElement("iframe");
      frame.title = (item.title || "Video") + " player";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.src = "https://www.youtube.com/embed/" + id + "?rel=0";
      frame.addEventListener("load", () => loading.remove(), { once: true });
      frame.addEventListener("error", () => fail("The video player failed to load."), { once: true });
      host.append(frame);
      // YouTube rarely fires error; clear loading shortly so the frame is usable.
      setTimeout(() => loading.remove(), 1200);
      return;
    }

    const media = document.createElement(kind === "audio" ? "audio" : "video");
    media.controls = true;
    media.playsInline = true;
    media.preload = "metadata";
    media.src = url;
    if (kind === "video") media.setAttribute("controlslist", "nodownload");
    media.addEventListener("loadeddata", () => { loading.remove(); item._rsNativePlayerReady = true; }, { once: true });
    media.addEventListener("playing", () => recordPlayback(container, item), { once: true });
    media.addEventListener("error", () => fail("Playback failed for this media file."), { once: true });
    host.append(media);
  }

  function relatedCard(item) {
    const href = "channel-content.html?post=" + encodeURIComponent(item.id);
    const poster = ytPoster(item.fullContentUrl, item.posterUrl || "") || "";
    const when = relativeAge(item.publishedAt || item.createdAt || item.updatedAt || "");
    const meta = [item.creatorName, when].filter(Boolean).join(" · ");
    return '<a class="mwe-upnext-item" href="' + esc(href) + '">' +
      '<span class="mwe-upnext-thumb">' + (poster ? '<img src="' + esc(poster) + '" alt="" loading="lazy">' : "") + "</span>" +
      '<span class="mwe-upnext-copy"><b>' + esc(item.title || "Untitled") + "</b>" +
      (meta ? "<small>" + esc(meta) + "</small>" : "") +
      "</span></a>";
  }

  async function loadRelated(current, channel) {
    const empty = { all: [], channel: [], followed: [], series: [], seriesTitle: null };
    // Preserve fetch failures for the side rail's bounded error and retry UI.
    // An empty result is reserved for an actual successful empty response.
    const feed = await get("feed");
    const published = (Array.isArray(feed.items) ? feed.items : []).filter(row => row && row.id && row.id !== current.id && row.title && (mediaKind(row.fullContentUrl || "") !== "none" || row.posterUrl));
    let seriesTitle = null, series = [], channelItems = [];
    if (current.channelEntityId) {
      try {
        const profile = await get("channel/" + encodeURIComponent(current.channelEntityId));
        channelItems = (Array.isArray(profile.items) ? profile.items : []).filter(row => row && row.id && row.id !== current.id && row.title).slice(0, 8);
        seriesTitle = profile?.channel?.seriesTitle || null;
        if (seriesTitle) series = (Array.isArray(profile.items) ? profile.items : []).filter(row => row && row.id && row.id !== current.id && row.title).slice(0, 12);
      } catch { /* The series tab simply stays hidden when the channel profile is unavailable. */ }
    }
    return {
      series, seriesTitle,
      all: published.slice(0, 8),
      channel: channelItems.length ? channelItems : published.filter(row => current.channelEntityId && row.channelEntityId === current.channelEntityId).slice(0,8),
      followed: published.filter(row => row.following).slice(0,8)
    };
  }


  function bindEngagement(section, item, signedIn) {
    const update = () => {
      for (const [action, label, active, count] of [
        ["like", "Like", item.liked, item.likes],
        ["dislike", "Dislike", item.disliked, null],
        ["save", "Save", item.saved, item.saves]
      ]) {
        const button = section.querySelector('[data-post-action="' + action + '"]');
        if (!button) continue;
        const span = button.querySelector("span");
        const activeLabel = action === "like" ? "Liked" : action === "dislike" ? "Disliked" : "Saved";
        // The brief follows YouTube: a member's choice is visible, not a public dislike total.
        if (span) span.textContent = active ? activeLabel : label;
        button.setAttribute("aria-pressed", String(Boolean(active)));
        if (count !== null) {
          const countNode = button.querySelector("[data-like-count],[data-save-count]");
          if (countNode) countNode.textContent = " · " + Number(count || 0);
        }
      }
    };
    update();

    async function comments() {
      const host = section.querySelector("[data-post-comments]");
      if (!host) return;
      try {
        const result = await get("comments/" + encodeURIComponent(item.id));
        const list = Array.isArray(result.comments) ? result.comments : [];
        host.innerHTML = list.length
          ? list.map((comment) => "<article><strong>" + esc(comment.author) + "</strong><p>" + esc(comment.body) + "</p></article>").join("")
          : "<p>Be the first to comment.</p>";
      } catch (error) {
        host.textContent = error.message;
      }
    }

    async function engage(body) {
      const response = await fetch("/api/spotlight/engagement/" + encodeURIComponent(item.id), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          requireSignIn(item, "Sign in to continue.");
          throw new Error(result.error || "Sign in required.");
        }
        throw new Error(result.error || "Unable to update engagement.");
      }
      Object.assign(item, result.item || {});
      update();
      return result;
    }

    section.querySelectorAll("[data-post-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        const action = button.dataset.postAction;
        button.disabled = true;
        try {
          if (action === "share") {
            const share = { title: item.title, url: new URL(item.permalink || location.href, location.href).href };
            if (navigator.share) {
              try { await navigator.share(share); return; }
              catch (error) { if (error.name === "AbortError") return; }
            }
            try {
              await navigator.clipboard.writeText(share.url);
              window.showToast?.("Link copied.");
            } catch {
              window.prompt("Copy this link:", share.url);
            }
            return;
          }
          if (!signedIn) {
            requireSignIn(item, action === "like" ? "Sign in to like this post." : action === "dislike" ? "Sign in to rate this post as Disliked." : "Sign in to save this post.");
            return;
          }
          const active = action === "like" ? item.liked : action === "dislike" ? item.disliked : item.saved;
          await engage({ action, active: !active });
        } catch (error) {
          window.showToast?.(error.message);
        } finally {
          button.disabled = false;
        }
      });
    });

    const form = section.querySelector("form.mwe-comment-form");
    const gate = section.querySelector("[data-signin-comment]");
    if (gate) {
      gate.addEventListener("click", () => requireSignIn(item, "Sign in to comment."));
    }
    if (form) {
      form.hidden = !item.commentsEnabled || !signedIn;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!signedIn) {
          requireSignIn(item, "Sign in to comment.");
          return;
        }
        const body = form.elements.comment.value.trim();
        if (!body) return;
        const button = form.querySelector('button[type="submit"]');
        if (button?.disabled) return;
        if (button) button.disabled = true;
        try {
          await engage({ action: "comment", body });
          form.reset();
          await comments();
        } catch (error) {
          window.showToast?.(error.message);
        } finally {
          if (button) button.disabled = false;
        }
      });
    }

    comments();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(location.search);
    const root = document.getElementById("channel-content-detail");
    const back = document.getElementById("channel-content-back");
    const page = document.querySelector(".channel-content-page");
    if (!root) return;

    root.innerHTML = '<div class="mwe-player-status is-loading" role="status"><div class="mwe-player-status-copy"><strong>Loading watch page…</strong></div></div>';

    try {
      const requested = params.get("post");
      let item;
      if (requested && !/^\d+$/.test(requested)) {
        item = (await get("item/" + encodeURIComponent(requested),10000)).item;
      } else {
        const channelParam = params.get("channel") || "";
        // Native channel posts are served through the same watch-page item (player, engagement, comments, related)
        // as Spotlight posts, so every route to a post shows the same content and state.
        try {
          item = (await get("channel-post/" + encodeURIComponent(channelParam) + "/" + encodeURIComponent(requested || "0"), 10000)).item;
        } catch (postError) {
          if (/^Not found|unavailable|404/i.test(String(postError?.message || "")) === false) throw postError;
          item = (await get("channel/" + encodeURIComponent(channelParam), 10000)).items?.[0];
        }
      }

      if (!item) throw new Error("This channel has no published content yet.");
      if (params.get("channel") && item.channelEntityId !== params.get("channel")) {
        throw new Error("This post belongs to a different channel.");
      }

      document.title = item.title + " | " + (item.creatorName || "RhemaSphere");
      const channelUrl = item.channelUrl || "app.html?view=channels";
      if (back) back.href = channelUrl;

      document.body.classList.add("mwe-watch-page");
      page?.classList.add("mwe-watch-page", "recorded-watch-page");

      let signedIn = false;
      let channel = item.channelEntityId ? {followers:item.followers,following:item.following,seriesTitle:item.seriesTitle||null} : null;
      const followerLabel = channel && typeof channel.followers === "number" ? channel.followers.toLocaleString()+(channel.followers===1?" follower":" followers") : "";
      const related = {all:[],channel:[],followed:[],series:[],seriesTitle:null}; let relatedFailed = null;
      const hasRelated = true; // A stable player host outlives independently loaded discovery.
      const when = formatWhen(item.publishedAt || item.createdAt || item.updatedAt || "");
      const stats = [];
      const totalViews = typeof item.views === "number" ? Number(item.views) : null;
      const viewLabel = totalViews !== null ? "<span data-watch-views>" + totalViews.toLocaleString() + (totalViews === 1 ? " view" : " views") + "</span> (last 31 days)" : "";

      if (typeof item.likes === "number") stats.push(Number(item.likes) + " likes");
      if (typeof item.comments === "number") stats.push(Number(item.comments) + " comments");
      if (when) stats.push(when);

      const description = String(item.caption || item.body || "").trim();
      const canEngage = Boolean(item.permalink && item.id);
      const viewClass = viewClassFor(item);

      root.innerHTML =
        '<div class="mwe-watch ' + (hasRelated ? "recorded-watch-layout" : "") + " " + viewClass + '">' +
          '<section class="mwe-watch-main">' +
            '<div class="mwe-player-frame" data-player-host></div>' +
            '<div class="mwe-watch-info">' +
              '<h1 class="mwe-watch-title">' + esc(item.title || "Untitled") + "</h1>" +
              (totalViews !== null || stats.length ? '<div class="mwe-watch-stats"><span>' + (totalViews !== null ? viewLabel + (stats.length ? esc(" · " + stats.join(" · ")) : "") : esc(stats.join(" · "))) + "</span></div>" : "") +
              '<div class="mwe-channel-row">' +
                '<div class="mwe-channel-name"><b>' + esc(item.creatorName || "Publisher") + "</b>" +
                  "<small>" + esc([item.creatorHandle ? "@" + String(item.creatorHandle).replace(/^@/, "") : "From this channel", followerLabel].filter(Boolean).join(" · ")) + "</small>" +
                "</div>" +
                (channel && typeof channel.followers === "number"
                  ? '<button type="button" class="mwe-follow-btn" data-channel-subscribe aria-pressed="' + String(Boolean(channel.following)) + '"><span>' + (channel.following ? 'Subscribed' : 'Subscribe') + '</span></button>'
                  : '') +
                '<a class="mwe-follow-btn mwe-channel-link" href="' + esc(channelUrl) + '"><i data-lucide="radio-tower"></i> Open Channel</a>' +
              "</div>" +
              (canEngage
                ? '<div class="mwe-chip-row" data-engagement-actions>' +
                    '<button type="button" class="mwe-chip" data-post-action="like" aria-pressed="false"><i data-lucide="heart"></i><span>Like</span><span data-like-count></span></button>' +
                    '<button type="button" class="mwe-chip" data-post-action="dislike" aria-pressed="false" title="Dislike; no public dislike count"><i data-lucide="thumbs-down"></i><span>Dislike</span></button>' +
                    '<button type="button" class="mwe-chip" data-post-action="save" aria-pressed="false"><i data-lucide="bookmark"></i><span>Save</span><span data-save-count></span></button>' +
                    '<button type="button" class="mwe-chip" data-post-action="share"><i data-lucide="share-2"></i><span>Share</span></button>' +
                    (item.channelEntityId ? '<button type="button" class="mwe-chip" data-ask-publisher><i data-lucide="message-circle-question"></i><span>Ask</span></button>' : '') +
                    (item.allowDownload && /^\/media\/spotlight-media\//.test(item.fullContentUrl || '') ? '<a class="mwe-chip" data-download-video download href="' + esc(item.fullContentUrl) + '"><i data-lucide="download"></i><span>Download</span></a>' : '') +
                  "</div>"
                : "") +
              (description
                ? '<details class="mwe-desc-card" open><summary><span>' + esc(when || "Description") + '</span><span class="mwe-desc-more">Show more</span></summary><p>' + esc(description) + "</p></details>"
                : "") +
              (item.body && !item.fullContentUrl
                ? '<section class="channel-episode-about"><h2>Notes</h2><p>' + esc(item.body) + "</p></section>"
                : "") +
              (canEngage
                ? '<button type="button" class="mwe-report-link" data-report-post><i data-lucide="flag"></i> Report</button>'
                : "") +
              (canEngage
                ? '<section class="mwe-comments-below" data-engagement-root aria-label="Comments">' +
                    "<h2>Comments</h2>" +
                    '<div class="channel-post-comments" data-post-comments><p>Loading comments…</p></div>' +
                    (item.commentsEnabled
                      ? (signedIn
                          ? '<form class="mwe-comment-form"><label class="sr-only" for="channel-post-comment">Add a comment</label>' +
                              '<div class="channel-post-comment-compose">' +
                                '<input id="channel-post-comment" name="comment" maxlength="600" placeholder="Write your comment…" required />' +
                                '<button type="submit">Post comment</button>' +
                              "</div></form>"
                          : '<div class="mwe-signin-comment"><p>Sign in to join the conversation.</p>' +
                              '<button type="button" class="mwe-chip" data-signin-comment>Sign in to comment</button></div>')
                      : '<p class="mwe-comments-disabled">Comments are turned off for this post.</p>') +
                  "</section>"
                : "") +
            "</div>" +
          "</section>" +
          (hasRelated
            ? '<aside class="mwe-watch-side" aria-label="More videos"><section class="mwe-upnext"><div class="mwe-related-heading"><h2>More videos</h2><a href="' + esc(channelUrl) + '">Open channel</a></div>' +
                '<div class="mwe-side-tabs" role="tablist" aria-label="Video filters"><button type="button" role="tab" aria-selected="true" data-related-tab="all">All</button><button type="button" role="tab" aria-selected="false" data-related-tab="series" hidden title="Other videos in this channel\'s series">From this series</button><button type="button" role="tab" aria-selected="false" data-related-tab="channel" title="Videos published by this channel (no separate series assigned)">From this channel</button><button type="button" role="tab" aria-selected="false" data-related-tab="followed" title="' + (signedIn ? 'From channels you follow' : 'Sign in to see channels you follow') + '">For you</button></div>' +
                '<p class="mwe-related-note" data-related-note></p><div data-related-content></div>' +
              "</section></aside>"
            : "") +
        "</div>";

      const gatedButtons=[...root.querySelectorAll('[data-post-action]:not([data-post-action=share]),[data-channel-subscribe],[data-report-post]')];
      gatedButtons.forEach(button=>{button.disabled=true;});
      const sessionRead = readSessionSignedIn();
      const relatedRead = item.id ? loadRelated(item,channel) : Promise.resolve(related);
      const playerHost = root.querySelector("[data-player-host]");
      if (playerHost) {
        mountPlayer(playerHost, item, root);
        // Class-based layout only. Video/iframe identity and native controls survive mode switches.
        window.MWEWatchTheatre?.mount(root.querySelector(".mwe-watch"), playerHost, "watch", root.querySelector("[data-engagement-actions]"));
      }

      const [sessionResult, relatedResult] = await Promise.allSettled([sessionRead,relatedRead]);
      const sessionFailed = sessionResult.status === 'rejected' || sessionResult.status === 'fulfilled' && sessionResult.value === null;
      gatedButtons.forEach(button=>button.disabled=sessionFailed);
      signedIn = sessionResult.status === 'fulfilled' && sessionResult.value === true;
      if (relatedResult.status === 'fulfilled') {
        related.all = relatedResult.value.all; related.channel = relatedResult.value.channel; related.followed = relatedResult.value.followed; related.series = relatedResult.value.series; related.seriesTitle = relatedResult.value.seriesTitle;
      } else relatedFailed = relatedResult.reason;
      const askButton = root.querySelector("[data-ask-publisher]");
      if (askButton && !signedIn) askButton.remove();
      else if (askButton) askButton.addEventListener("click", () => {
        if (root.querySelector("[data-ask-form]")) return;
        const form = document.createElement("form");
        form.className = "mwe-ask-form"; form.dataset.askForm = "";
        form.innerHTML = '<label for="mwe-ask-text">Ask ' + esc(item.creatorName || "the publisher") + ' a private question</label><textarea id="mwe-ask-text" maxlength="1000" required placeholder="Only the publisher will see this. It is not posted publicly."></textarea><div><button type="submit" class="mwe-chip">Send privately</button> <button type="button" class="mwe-chip" data-ask-cancel>Cancel</button></div><p role="status" data-ask-status></p>';
        askButton.closest("[data-engagement-actions]").after(form);
        form.querySelector("textarea").focus();
        form.querySelector("[data-ask-cancel]").addEventListener("click", () => form.remove());
        form.addEventListener("submit", async event => {
          event.preventDefault();
          const status = form.querySelector("[data-ask-status]"), send = form.querySelector('[type=submit]');
          send.disabled = true; status.textContent = "Sending…";
          try {
            const response = await fetch("/api/private/message", {method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({entityId:item.channelEntityId,body:form.querySelector("textarea").value.trim(),subject:"Question about: " + (item.title || "your video")})});
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Your question could not be sent.");
            status.textContent = "Sent. The publisher will reply in your Messages.";
            form.querySelector("textarea").value = ""; form.querySelector("textarea").disabled = true;
          } catch (error) { status.textContent = error.message; send.disabled = false; }
        });
      });
      if (canEngage) {
        const combined = root.querySelector(".mwe-watch-info");
        if (combined) bindEngagement(combined, item, signedIn);
      }



      if (hasRelated) {
        const tabs = [...root.querySelectorAll('[data-related-tab]')];
        const seriesTab = tabs.find(tab => tab.dataset.relatedTab === 'series');
        if (seriesTab && related.seriesTitle) { seriesTab.hidden = false; seriesTab.textContent = 'From this series'; seriesTab.title = 'Series: ' + related.seriesTitle; }
        const content = root.querySelector('[data-related-content]');
        const note = root.querySelector('[data-related-note]');
        const drawRelated = key => {
          const label = {
            all: 'Latest published videos from all channels.',
            channel: 'Published by this channel; no separate editorial series label is inferred.',
            series: 'More from the series "' + (related.seriesTitle || '') + '".'
          }[key];
          note.textContent = signedIn && key === "followed" ? 'Latest from channels you follow.' : key === "followed" ? 'Sign in to see videos from channels you follow.' : label;
          if (related[key].length) content.innerHTML = related[key].map(relatedCard).join("");
          else {
            const paragraph = document.createElement("p");
            paragraph.className = "mwe-related-empty";
            if (key === "followed" && !signedIn) {
              const signin = document.createElement("button");
              signin.type = "button"; signin.className = "mwe-chip"; signin.dataset.relatedSignin = "";
              signin.textContent = "Sign in to see channels you follow";
              signin.addEventListener("click", () => requireSignIn(item, "Sign in to see channels you follow."));
              paragraph.append(signin);
            } else paragraph.textContent = key === "series" ? "No other videos in this series yet." : key === "channel" ? "No other published videos from this channel yet. A separate series is not assumed." : key === "followed" ? "No published videos from channels you follow yet." : "No published videos in this filter yet.";
            content.replaceChildren(paragraph);
          }
          history.replaceState(null, "", location.pathname + location.search + "#related-" + key);
        };
        tabs.forEach(tab => tab.addEventListener("click", () => {
          tabs.forEach(other => other.setAttribute("aria-selected", String(other === tab)));
          try { sessionStorage.setItem("mwe.watch.related." + item.id, tab.dataset.relatedTab); } catch { /* optional */ }
          drawRelated(tab.dataset.relatedTab);
          root.querySelector(".mwe-watch-side").scrollIntoView({behavior: "smooth", block: "nearest"});
        }));
        root.querySelector("[data-related-signin]")?.addEventListener("click", () => requireSignIn(item, "Sign in to see channels you follow."));
        let activeTab = ""; try { activeTab = sessionStorage.getItem("mwe.watch.related." + item.id) || ""; } catch { /* optional */ }
        const requestedTab = tabs.find(tab => tab.dataset.relatedTab === activeTab);
        if (requestedTab) {
          tabs.forEach(tab => tab.setAttribute("aria-selected", String(tab === requestedTab)));
          drawRelated(requestedTab.dataset.relatedTab);
        } else drawRelated("all");
        if (relatedFailed) {
          note.textContent=relatedFailed.message;
          content.innerHTML='<button type="button" class="mwe-chip" data-related-retry>Retry videos</button>';
          content.querySelector('button').addEventListener('click',async()=>{
            const retry=content.querySelector('button');retry.disabled=true;note.textContent='Loading published videos…';
            try {const next=await loadRelated(item,channel);related.all=next.all;related.channel=next.channel;related.followed=next.followed;related.series=next.series;related.seriesTitle=next.seriesTitle;drawRelated(tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.dataset.relatedTab||'all');}
            catch(error){note.textContent=error.message;content.innerHTML='<p role="alert">Could not load videos again. Reload the watch page to retry.</p>';}
          });
        }
      }
      if (sessionFailed) {
        const compose = root.querySelector(".mwe-comment-form,.mwe-signin-comment");
        if (compose) compose.innerHTML='<p role="alert">Could not verify your session. Account actions may require sign-in.</p><button type="button" class="mwe-chip" data-session-retry>Retry session</button>';
        root.querySelector('[data-session-retry]')?.addEventListener('click',()=>location.reload());
      }

      if (channel && typeof channel.followers === "number") {
        let following = Boolean(channel.following);
        let followers = Number(channel.followers);
        const button = root.querySelector("[data-channel-subscribe]");
        const count = root.querySelector(".mwe-channel-name small");
        const draw = () => {
          button.setAttribute("aria-pressed", String(following));
          button.querySelector("span").textContent = following ? "Subscribed" : "Subscribe";
          if (count) count.textContent = [item.creatorHandle ? "@" + item.creatorHandle.replace(/^@/,"") : "From this channel", followers.toLocaleString() + (followers === 1 ? " follower" : " followers"), "free"].filter(Boolean).join(" · ");
        };
        button.addEventListener("click", async () => {
          if (!signedIn) return requireSignIn(item, "Sign in to follow this channel. Subscribing is free.");
          if (button.disabled) return;
          button.disabled = true;
          const desired = !following;
          try {
            const response = await fetch("/api/spotlight/channel-follow/" + encodeURIComponent(item.channelEntityId), {method:"PUT",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({active:desired})});
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              if (response.status === 401) requireSignIn(item, "Sign in to follow this channel. Subscribing is free.");
              throw new Error(result.error || "Could not update your channel subscription.");
            }
            following = result.following;
            followers = Number.isFinite(Number(result.followers)) ? Number(result.followers) : Math.max(0, followers + (following === desired ? (following ? 1 : -1) : 0));
            window.showToast?.(following ? "Subscribed free to this channel." : "You are no longer following this channel.");
          } catch (error) { window.showToast?.(error.message); }
          finally { button.disabled = false; draw(); }
        });
        draw();
      }

      const report = root.querySelector("[data-report-post]");
      if (report) report.addEventListener("click", async () => {
        if (!signedIn) return requireSignIn(item, "Sign in to report this post to the moderation team.");
        if (report.disabled) return;
        if (!window.confirm("Report this post to the moderation team? You can submit this report once.")) return;
        report.disabled = true;
        try {
          const response = await fetch("/api/spotlight/engagement/" + encodeURIComponent(item.id), {method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({action:"report"})});
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "Report could not be sent.");
          report.textContent = "Report submitted for review";
          window.showToast?.("Your report was submitted once for moderation review.");
        } catch (error) { window.showToast?.(error.message); report.disabled = false; }
      });

      window.lucide?.createIcons?.();
    } catch (error) {
      root.innerHTML = '<div class="module-empty" role="alert"><strong>' + esc(error.message) + '</strong><p>Playback has not started.</p><button type="button" class="mwe-chip" data-retry-watch>Retry watch page</button><a href="channels.html">Return to Channels</a></div>';
      root.querySelector('[data-retry-watch]').addEventListener('click',()=>location.reload());
    }
  });
})();
