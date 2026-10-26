/* RhemaSphere church directory, church profile and church channel.
   All church data comes from the public read API (/api/churches, /api/churches/:id).
   Nothing here reads or writes church data in localStorage. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getJson = async url => { const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' }); const d = await r.json().catch(() => ({})); if (!r.ok || !d.ok) { const e = new Error(d.error || 'Request failed'); e.status = r.status; throw e; } return d; };
  const icons = () => window.lucide?.createIcons?.();
  const COUNTRY = { CA: 'Canada', US: 'United States', GB: 'United Kingdom', UK: 'United Kingdom' };
  const countryName = c => COUNTRY[String(c || '').toUpperCase()] || c || '';
  const place = c => [c.city, c.state, countryName(c.country)].filter(Boolean).join(', ');
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const safeImg = u => { const s = String(u || ''); return /^(https?:\/\/|\/)/.test(s) && !/["'()\\]/.test(s) ? s : ''; };
  const profileUrl = id => '/churches/' + encodeURIComponent(id);
  const channelUrl = id => '/channels/' + encodeURIComponent(id);
  const serviceLine = s => [s.type, [s.day && s.day !== 'Sunday' || !/sunday/i.test(s.type) ? s.day : '', s.time].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const toast = msg => { const t = $('[data-toast]'); if (window.MWE?.showMemberToast) return MWE.showMemberToast(msg); if (!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };
  let sessionPromise;
  const session = () => (sessionPromise ||= getJson('/api/auth/session').then(d => d.user || null).catch(() => null));
  async function requireSignIn(why) {
    if (await session()) return true;
    if (window.MWE?.openMemberLogin) MWE.openMemberLogin(location.pathname + location.search);
    else location.href = '/app.html?signin=1&next=' + encodeURIComponent(location.pathname);
    toast(why || 'Please sign in to continue.');
    return false;
  }
  const liveDirectory = () => getJson('/api/live/directory').catch(() => ({ stages: [], broadcasts: [] }));
  let catalogPromise;
  const catalog = () => (catalogPromise ||= getJson('/api/catalog').then(d => d.records || []).catch(() => []));
  async function liveChurchIds() {
    const [live, records] = await Promise.all([liveDirectory(), catalog()]);
    const ids = new Set((live.broadcasts || []).map(b => b.churchId));
    const liveChannels = new Set((live.stages || []).map(s => s.channelId));
    const channelTenant = new Map(records.filter(r => r.kind === 'channels').map(r => [r.id, r.tenantId]));
    const liveTenants = new Set([...liveChannels].map(id => channelTenant.get(id)).filter(Boolean));
    return { ids, liveTenants, stages: live.stages || [], broadcasts: live.broadcasts || [] };
  }
  const isLive = (c, live) => live.ids.has(c.id) || (c.tenantId && live.liveTenants.has(c.tenantId));
  const cover = (c, cls) => { const src = safeImg(c.photo); return src
    ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} rsc-fallback',textContent:'${esc(initials(c.name))}'}))" />`
    : `<div class="${cls} rsc-fallback">${esc(initials(c.name))}</div>`; };
  const badges = (c, live) => `${c.verified ? '<span class="rsc-badge rsc-badge-verified"><i data-lucide="badge-check"></i> Verified</span>' : ''}${live && isLive(c, live) ? '<span class="rsc-badge rsc-badge-live"><span class="rsc-dot"></span> Live</span>' : ''}`;

  /* ---------- Dropdown filters (close on outside click / Escape) ---------- */
  function closeAll(except) { document.querySelectorAll('.rsc-filter.open').forEach(f => { if (f !== except) { f.classList.remove('open'); f.querySelector('button')?.setAttribute('aria-expanded', 'false'); } }); }
  document.addEventListener('click', e => { if (!e.target.closest('.rsc-filter')) closeAll(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const open = $('.rsc-filter.open'); closeAll(); open?.querySelector('button')?.focus(); } });
  function filterControl(key, label) {
    return `<div class="rsc-filter" data-filter="${key}"><button type="button" class="rsc-filter-btn" aria-haspopup="true" aria-expanded="false"><span data-label>${esc(label)}</span><i data-lucide="chevron-down"></i></button><div class="rsc-filter-panel" role="group" aria-label="${esc(label)}"></div></div>`;
  }

  /* ---------- Directory list ---------- */
  async function initList() {
    const root = $('#rsc-directory');
    const state = { q: '', country: '', region: '', city: '', denomination: '', service: '' };
    root.innerHTML = `
      <div class="rsc-toolbar">
        <label class="rsc-search"><i data-lucide="search"></i><input type="search" id="rsc-q" placeholder="Search churches, cities or pastors" aria-label="Search churches" autocomplete="off" /></label>
        <div class="rsc-filters">${filterControl('country', 'Region')}${filterControl('region', 'State / Province')}${filterControl('city', 'City')}${filterControl('denomination', 'Denomination')}${filterControl('service', 'Service')}
          <button type="button" class="rsc-reset" id="rsc-reset" hidden><i data-lucide="rotate-ccw"></i> Reset</button></div>
      </div>
      <p class="rsc-count" id="rsc-count" role="status" aria-live="polite">Loading churches…</p>
      <div class="rsc-grid" id="rsc-grid"></div>`;
    icons();
    let churches = [], live = { ids: new Set(), liveTenants: new Set() };
    try { churches = (await getJson('/api/churches')).churches || []; }
    catch { $('#rsc-count').textContent = ''; $('#rsc-grid').innerHTML = `<div class="rsc-empty"><i data-lucide="wifi-off"></i><h3>Churches could not load</h3><p>Please check your connection and try again.</p><button class="rsc-btn rsc-btn-primary" onclick="location.reload()">Try again</button></div>`; icons(); return; }
    liveChurchIds().then(l => { live = l; render(); });
    const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const serviceKey = s => s.type;
    const options = {
      country: () => uniq(churches.map(c => c.country)).map(v => [v, countryName(v)]),
      region: () => uniq(churches.filter(c => !state.country || c.country === state.country).map(c => c.state)).map(v => [v, v]),
      city: () => uniq(churches.filter(c => (!state.country || c.country === state.country) && (!state.region || c.state === state.region)).map(c => c.city)).map(v => [v, v]),
      denomination: () => uniq(churches.map(c => c.denomination)).map(v => [v, v]),
      service: () => uniq(churches.flatMap(c => (c.services || []).map(serviceKey))).map(v => [v, v])
    };
    const labels = { country: 'Region', region: 'State / Province', city: 'City', denomination: 'Denomination', service: 'Service' };
    function drawFilters() {
      root.querySelectorAll('.rsc-filter').forEach(f => {
        const key = f.dataset.filter, opts = options[key]();
        const val = state[key];
        f.querySelector('[data-label]').textContent = val ? (opts.find(o => o[0] === val)?.[1] || val) : labels[key];
        f.classList.toggle('is-set', !!val);
        const btn = f.querySelector('button');
        const empty = !opts.length;
        btn.disabled = empty; btn.title = empty ? (key === 'region' ? 'No state or province listed yet' : 'No options yet') : '';
        f.querySelector('.rsc-filter-panel').innerHTML = `<button type="button" class="rsc-opt${!val ? ' is-active' : ''}" data-value="">Any ${esc(labels[key].toLowerCase())}</button>` + opts.map(([v, l]) => `<button type="button" class="rsc-opt${v === val ? ' is-active' : ''}" data-value="${esc(v)}">${esc(l)}</button>`).join('');
      });
      $('#rsc-reset').hidden = !Object.values(state).some(Boolean);
    }
    root.addEventListener('click', e => {
      const btn = e.target.closest('.rsc-filter-btn');
      if (btn) { const f = btn.parentElement; const open = !f.classList.contains('open'); closeAll(f); f.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); return; }
      const opt = e.target.closest('.rsc-opt');
      if (opt) { const key = opt.closest('.rsc-filter').dataset.filter; state[key] = opt.dataset.value;
        if (key === 'country') { state.region = ''; state.city = ''; } if (key === 'region') state.city = '';
        closeAll(); render(); }
    });
    $('#rsc-reset').addEventListener('click', () => { Object.keys(state).forEach(k => state[k] = ''); $('#rsc-q').value = ''; render(); });
    $('#rsc-q').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); render(); });
    const preset = new URLSearchParams(location.search).get('q'); if (preset) { $('#rsc-q').value = preset; state.q = preset.toLowerCase(); }
    function card(c) {
      const svc = (c.services || [])[0];
      return `<article class="rsc-card" data-church-id="${esc(c.id)}">
        <a class="rsc-card-media" href="${profileUrl(c.id)}" aria-label="${esc(c.name)}">${cover(c, 'rsc-card-img')}<div class="rsc-card-badges">${badges(c, live)}</div></a>
        <div class="rsc-card-body">
          <h3><a href="${profileUrl(c.id)}">${esc(c.name)}</a></h3>
          <p class="rsc-meta">${[c.denomination, place(c)].filter(Boolean).map(esc).join(' · ')}</p>
          ${svc ? `<p class="rsc-meta rsc-meta-service"><i data-lucide="clock"></i> ${esc(serviceLine(svc))}</p>` : ''}
          <div class="rsc-card-actions"><a class="rsc-btn rsc-btn-primary" href="${channelUrl(c.id)}"><i data-lucide="tv"></i> Open Channel</a><a class="rsc-btn rsc-btn-ghost" href="${profileUrl(c.id)}">View profile</a></div>
        </div></article>`;
    }
    function render() {
      drawFilters();
      const list = churches.filter(c => {
        const hay = [c.name, c.city, c.state, countryName(c.country), c.denomination, c.pastorName, c.language, ...(c.ministries || [])].join(' ').toLowerCase();
        return (!state.q || state.q.split(/\s+/).every(t => hay.includes(t))) && (!state.country || c.country === state.country) && (!state.region || c.state === state.region)
          && (!state.city || c.city === state.city) && (!state.denomination || c.denomination === state.denomination) && (!state.service || (c.services || []).some(s => serviceKey(s) === state.service));
      });
      $('#rsc-count').textContent = `${list.length} ${list.length === 1 ? 'church' : 'churches'}${list.length !== churches.length ? ` of ${churches.length}` : ''}`;
      $('#rsc-grid').innerHTML = list.length ? list.map(card).join('') : `<div class="rsc-empty"><i data-lucide="search-x"></i><h3>No churches match</h3><p>Try another search or clear the filters.</p></div>`;
      icons();
    }
    render();
  }

  /* ---------- Shared church loader ---------- */
  function routeId(prefix) {
    const m = location.pathname.match(new RegExp('^/' + prefix + '/([^/]+)/?$'));
    if (m) { try { return decodeURIComponent(m[1]); } catch { return ''; } }
    return new URLSearchParams(location.search).get('id') || '';
  }
  function notFound(root, id) {
    root.innerHTML = `<div class="rsc-empty rsc-empty-page"><i data-lucide="church"></i><h2>We couldn't find that church</h2><p>${id ? 'It may have been unpublished or the link may be wrong.' : 'No church was chosen.'}</p><a class="rsc-btn rsc-btn-primary" href="/churches"><i data-lucide="arrow-left"></i> Browse churches</a></div>`; icons();
  }

  /* ---------- Church profile ---------- */
  async function initProfile() {
    const root = $('#rsc-profile');
    const id = routeId('churches');
    if (!id) return notFound(root);
    let c;
    try { c = (await getJson('/api/churches/' + encodeURIComponent(id))).church; }
    catch (e) { if (e.status === 404) return notFound(root, id); root.innerHTML = `<div class="rsc-empty rsc-empty-page"><i data-lucide="wifi-off"></i><h2>This church could not load</h2><p>Please try again.</p><button class="rsc-btn rsc-btn-primary" onclick="location.reload()">Try again</button></div>`; icons(); return; }
    document.title = `${c.name} | RhemaSphere`;
    const [live, records] = await Promise.all([liveChurchIds(), catalog()]);
    const channel = records.find(r => r.kind === 'channels' && c.tenantId && r.tenantId === c.tenantId);
    const services = c.services || [];
    const contact = [c.address && ['map-pin', c.address], c.phone && ['phone', `<a href="tel:${esc(c.phone.replace(/[^+\d]/g, ''))}">${esc(c.phone)}</a>`, true], c.email && ['mail', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`, true], /^https?:\/\//.test(c.website) && ['globe', `<a href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website.replace(/^https?:\/\//, ''))}</a>`, true]].filter(Boolean);
    root.innerHTML = `
      <a class="rsc-back" href="/churches"><i data-lucide="arrow-left"></i> All churches</a>
      <section class="rsc-hero">${cover(c, 'rsc-hero-img')}<div class="rsc-hero-shade"></div>
        <div class="rsc-hero-copy"><div class="rsc-hero-badges">${badges(c, live)}</div><h1>${esc(c.name)}</h1>
        <p>${[c.denomination, place(c)].filter(Boolean).map(esc).join(' · ')}</p></div></section>
      <div class="rsc-actions" role="group" aria-label="Church actions">
        <a class="rsc-btn rsc-btn-primary" href="${channelUrl(c.id)}"><i data-lucide="tv"></i> Open Channel</a>
        <button class="rsc-btn" type="button" data-act="message"><i data-lucide="message-circle"></i> Message</button>
        <button class="rsc-btn" type="button" data-act="ride"><i data-lucide="car"></i> Request Ride</button>
        <button class="rsc-btn" type="button" data-act="visit"><i data-lucide="calendar-check"></i> Request Visit</button>
        <button class="rsc-btn" type="button" data-act="follow" aria-pressed="false"><i data-lucide="user-plus"></i> <span>Follow</span></button>
        <button class="rsc-btn" type="button" data-act="share"><i data-lucide="share-2"></i> Share</button>
        <button class="rsc-btn" type="button" data-act="save" aria-pressed="false"><i data-lucide="bookmark"></i> <span>Save</span></button>
      </div>
      <div class="rsc-profile-grid">
        <div class="rsc-col">
          <section class="rsc-panel"><h2>About</h2>${c.about ? `<p>${esc(c.about)}</p>` : '<p class="rsc-muted">This church hasn\'t added an about section yet.</p>'}
            ${c.ministries?.length ? `<div class="rsc-chips">${c.ministries.map(m => `<span class="rsc-chip">${esc(m)}</span>`).join('')}</div>` : ''}</section>
          ${c.pastorName ? `<section class="rsc-panel"><h2>Leadership</h2><div class="rsc-leader"><div class="rsc-avatar">${esc(initials(c.pastorName))}</div><div><strong>${esc(c.pastorName)}</strong>${c.pastorTitle ? `<span class="rsc-muted">${esc(c.pastorTitle)}</span>` : ''}</div></div>${c.pastorBio ? `<p>${esc(c.pastorBio)}</p>` : ''}</section>` : ''}
          ${c.firstVisit ? `<section class="rsc-panel"><h2>Your first visit</h2><p>${esc(c.firstVisit)}</p></section>` : ''}
        </div>
        <aside class="rsc-col">
          <section class="rsc-panel"><h2>Service times</h2>${services.length ? `<ul class="rsc-services">${services.map(s => `<li><i data-lucide="clock"></i><div><strong>${esc(s.type)}</strong><span>${esc([s.day, s.time].filter(Boolean).join(' · ') || 'Time not listed')}</span>${s.notes ? `<small>${esc(s.notes)}</small>` : ''}</div></li>`).join('')}</ul>` : '<p class="rsc-muted">Service times haven\'t been listed yet.</p>'}</section>
          <section class="rsc-panel"><h2>Details</h2><ul class="rsc-facts">
            <li><i data-lucide="${c.verified ? 'badge-check' : 'shield-question'}"></i><span>${c.verified ? 'Verified profile' : 'Not yet verified'}</span></li>
            ${c.denomination ? `<li><i data-lucide="church"></i><span>${esc(c.denomination)}</span></li>` : ''}
            ${place(c) ? `<li><i data-lucide="map-pin"></i><span>${esc(place(c))}${c.postalCode ? ' ' + esc(c.postalCode) : ''}</span></li>` : ''}
            ${c.language ? `<li><i data-lucide="languages"></i><span>${esc(c.language)}</span></li>` : ''}
            ${contact.map(([i, v, raw]) => `<li><i data-lucide="${i}"></i><span>${raw ? v : esc(v)}</span></li>`).join('')}
          </ul></section>
        </aside>
      </div>
      <dialog class="rsc-dialog" id="rsc-request"><form method="dialog" id="rsc-request-form"><h2 id="rsc-request-title">Request a visit</h2><p class="rsc-muted" id="rsc-request-sub"></p>
        <label>Full name<input name="fullName" required autocomplete="name" maxlength="120" /></label>
        <label>Email<input name="email" type="email" required autocomplete="email" maxlength="200" /></label>
        <label>Phone<input name="phone" type="tel" autocomplete="tel" maxlength="40" /></label>
        <label id="rsc-pickup-wrap">Pickup area<input name="city" autocomplete="address-level2" maxlength="160" /></label>
        <label>Message<textarea name="message" rows="3" maxlength="2000"></textarea></label>
        <div class="rsc-dialog-actions"><button type="button" class="rsc-btn rsc-btn-ghost" data-close>Cancel</button><button type="submit" class="rsc-btn rsc-btn-primary">Send request</button></div></form></dialog>`;
    icons();
    const followBtn = root.querySelector('[data-act="follow"]'), saveBtn = root.querySelector('[data-act="save"]');
    const setPressed = (b, on, a, b2) => { b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on); b.querySelector('span').textContent = on ? b2 : a; };
    session().then(async user => {
      if (!user) return;
      if (channel) getJson('/api/spotlight/channel/' + encodeURIComponent(channel.id)).then(d => setPressed(followBtn, !!d.following, 'Follow', 'Following')).catch(() => {});
      getJson('/api/content-engagements?type=church&ids=' + encodeURIComponent(c.id)).then(d => setPressed(saveBtn, (d.loved || []).includes(c.id), 'Save', 'Saved')).catch(() => {});
    });
    const dlg = $('#rsc-request'), form = $('#rsc-request-form'); let mode = 'visit';
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    form.addEventListener('submit', async e => {
      e.preventDefault(); const fd = Object.fromEntries(new FormData(form)); const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      try { const r = await fetch('/api/visitor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...fd, churchId: c.id, needs: [mode === 'ride' ? 'ride' : 'visit'] }) }); const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) throw new Error(d.error || 'Request failed'); dlg.close(); form.reset(); toast(mode === 'ride' ? `Ride request sent to ${c.name}.` : `Visit request sent to ${c.name}.`); }
      catch (err) { toast(err.message ? err.message.charAt(0).toUpperCase() + err.message.slice(1) : 'Your request could not be sent.'); } finally { btn.disabled = false; }
    });
    root.querySelector('.rsc-actions').addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act;
      if (act === 'share') { const url = location.origin + profileUrl(c.id);
        try { if (navigator.share) await navigator.share({ title: c.name, url }); else { await navigator.clipboard.writeText(url); toast('Link copied.'); } } catch (err) { if (err?.name !== 'AbortError') toast(url); } return; }
      if (act === 'visit' || act === 'ride') { mode = act; $('#rsc-request-title').textContent = act === 'ride' ? 'Request a ride' : 'Request a visit';
        $('#rsc-request-sub').textContent = act === 'ride' ? `${c.name} will contact you to arrange transport to a service.` : `${c.name} will get in touch to welcome you.`;
        $('#rsc-pickup-wrap').firstChild.textContent = act === 'ride' ? 'Pickup area' : 'Your city';
        const u = await session(); if (u) { form.fullName.value ||= u.name || u.displayName || ''; form.email.value ||= u.email || ''; }
        dlg.showModal(); return; }
      if (act === 'message') { if (!await requireSignIn('Sign in to message this church.')) return; location.href = '/messages.html?compose=1&id=' + encodeURIComponent(c.id); return; }
      if (act === 'follow') { if (!channel) { toast(`${c.name} hasn't opened a channel to follow yet.`); return; } if (!await requireSignIn('Sign in to follow this church.')) return;
        const on = b.getAttribute('aria-pressed') !== 'true'; b.disabled = true;
        try { const r = await fetch('/api/spotlight/channel-follow/' + encodeURIComponent(channel.id), { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: on }) }); if (!r.ok) throw 0; setPressed(b, on, 'Follow', 'Following'); toast(on ? `Following ${c.name}.` : 'Unfollowed.'); }
        catch { toast('Could not update follow. Please try again.'); } finally { b.disabled = false; } return; }
      if (act === 'save') { if (!await requireSignIn('Sign in to save this church.')) return; b.disabled = true;
        try { const r = await fetch('/api/content-engagements', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'church', id: c.id }) }); const d = await r.json(); if (!r.ok || !d.ok) throw 0; const on = !!(d.loved ?? d.active ?? (b.getAttribute('aria-pressed') !== 'true')); setPressed(b, on, 'Save', 'Saved'); toast(on ? 'Saved.' : 'Removed from saved.'); }
        catch { toast('Could not save. Please try again.'); } finally { b.disabled = false; } }
    });
  }

  /* ---------- Church channel ---------- */
  async function initChannel() {
    const root = $('#rsc-channel');
    const id = routeId('channels');
    if (!id) return notFound(root);
    let c;
    try { c = (await getJson('/api/churches/' + encodeURIComponent(id))).church; }
    catch (e) {
      if (e.status === 404) { const recs = await catalog(); if (recs.some(r => r.kind === 'channels' && r.id === id)) { location.replace('/channel-detail.html?id=' + encodeURIComponent(id)); return; } return notFound(root, id); }
      root.innerHTML = `<div class="rsc-empty rsc-empty-page"><h2>This channel could not load</h2><button class="rsc-btn rsc-btn-primary" onclick="location.reload()">Try again</button></div>`; return;
    }
    document.title = `${c.name} Channel | RhemaSphere`;
    const [records, live, spot] = await Promise.all([catalog(), liveChurchIds(), getJson('/api/spotlight').then(d => d.items || []).catch(() => [])]);
    const mine = r => r.churchId === c.id || r.subjectEntityId === c.id || (c.tenantId && r.tenantId === c.tenantId);
    const channels = records.filter(r => r.kind === 'channels' && mine(r));
    const channelIds = new Set(channels.map(ch => ch.id));
    const spotlight = spot.filter(i => i.subjectEntityId === c.id || channelIds.has(i.channelEntityId));
    const events = records.filter(r => r.kind === 'events' && mine(r));
    const stores = records.filter(r => (r.kind === 'store' || r.kind === 'products') && mine(r));
    const resources = records.filter(r => r.kind === 'resources' && mine(r));
    const liveNow = [...live.broadcasts.filter(b => b.churchId === c.id).map(() => ({ title: `${c.name} is live`, href: '/broadcast.html?type=church&id=' + encodeURIComponent(c.id) })),
      ...live.stages.filter(s => channelIds.has(s.channelId)).map(s => ({ title: s.title || 'Live now', href: '/channel-live.html?id=' + encodeURIComponent(s.channelId) }))];
    const img = r => safeImg(r.posterUrl || r.cover || r.coverImageUrl || r.image || r.photo || r.avatar || r.logo);
    const tile = (title, sub, href, src, tag) => `<a class="rsc-tile" href="${esc(href)}"><div class="rsc-tile-media">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('rsc-fallback');this.remove()" />` : ''}${tag ? `<span class="rsc-tile-tag">${esc(tag)}</span>` : ''}</div><div class="rsc-tile-body"><strong>${esc(title)}</strong>${sub ? `<span>${esc(sub)}</span>` : ''}</div></a>`;
    const fmtDate = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
    const section = (key, icon, title, items, emptyText) => `<section class="rsc-section" id="ch-${key}"><div class="rsc-section-head"><h2><i data-lucide="${icon}"></i> ${title}</h2>${items.length ? `<span class="rsc-muted">${items.length}</span>` : ''}</div>${items.length ? `<div class="rsc-tiles">${items.join('')}</div>` : `<div class="rsc-empty rsc-empty-inline"><i data-lucide="${icon}"></i><p>${emptyText}</p></div>`}</section>`;
    root.innerHTML = `
      <a class="rsc-back" href="${profileUrl(c.id)}"><i data-lucide="arrow-left"></i> ${esc(c.name)} profile</a>
      <section class="rsc-channel-head">${cover(c, 'rsc-channel-cover')}<div class="rsc-channel-id"><div class="rsc-channel-avatar">${safeImg(c.logo) ? `<img src="${esc(safeImg(c.logo))}" alt="" onerror="this.replaceWith(document.createTextNode('${esc(initials(c.name))}'))" />` : esc(initials(c.name))}</div>
        <div><div class="rsc-hero-badges">${badges(c, live)}</div><h1>${esc(c.name)}</h1><p class="rsc-muted">${[c.denomination, place(c)].filter(Boolean).map(esc).join(' · ')}</p></div>
        <a class="rsc-btn rsc-btn-ghost rsc-channel-profile" href="${profileUrl(c.id)}"><i data-lucide="church"></i> Church profile</a></div></section>
      <nav class="rsc-jump" aria-label="Channel sections">${[['spotlight', 'Spotlight'], ['live', 'Live'], ['events', 'Events'], ['store', 'Store'], ['resources', 'Resources']].map(([k, l]) => `<a href="#ch-${k}">${l}</a>`).join('')}</nav>
      ${section('spotlight', 'sparkles', 'Spotlight', spotlight.map(i => tile(i.title, i.creatorName, '/spotlight.html?post=' + encodeURIComponent(i.id), img(i), 'Spotlight')), `${esc(c.name)} hasn't shared any Spotlight videos yet.`)}
      ${section('live', 'radio', 'Live', liveNow.map(l => tile(l.title, 'Watch now', l.href, safeImg(c.photo), 'Live')), `${esc(c.name)} isn't live right now.`)}
      ${section('events', 'calendar-days', 'Events', events.map(e => tile(e.title || e.name, [fmtDate(e.startsAt), e.venueName || e.city].filter(Boolean).join(' · '), '/event-profile.html?id=' + encodeURIComponent(e.id), img(e))), 'No upcoming events yet.')}
      ${section('store', 'shopping-bag', 'Store', stores.map(s => s.kind === 'store' ? tile(s.name, 'Store', '/storefront.html?id=' + encodeURIComponent(s.id), img(s)) : tile(s.name || s.title, Number(s.price) > 0 ? '$' + Number(s.price).toFixed(2) : 'Product', '/product-detail.html?id=' + encodeURIComponent(s.id), img(s))), 'No store items yet.')}
      ${section('resources', 'book-open', 'Resources', resources.map(r => tile(r.title || r.name, [r.type, r.topic].filter(Boolean).join(' · '), '/resource-detail.html?id=' + encodeURIComponent(r.id), img(r))), 'No resources shared yet.')}`;
    icons();
  }

  function boot() {
    const page = document.body.dataset.page;
    if (page === 'church-directory') initList();
    if (page === 'church-detail') initProfile();
    if (page === 'church-channel') initChannel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
