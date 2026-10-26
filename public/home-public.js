/* RhemaSphere public Home: every card comes from the published catalog or the live directory. */
(function () {
  'use strict';
  const C = () => window.RSCatalog;
  const empty = (icon, title, text, href, label) =>
    '<div class="rs-home-empty"><span class="rs-home-empty-icon"><i data-lucide="' + icon + '"></i></span><div><strong>' + title + '</strong><p>' + text + '</p></div>' +
    (href ? '<a class="rs-btn rs-btn-ghost rs-btn-sm" href="' + href + '">' + label + '</a>' : '') + '</div>';
  const initials = name => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'RS';
  function card(r, opts = {}) {
    const c = C(), img = opts.image ?? c.image(r), name = c.title(r);
    const media = img
      ? '<img src="' + c.esc(img) + '" alt="" loading="lazy" data-initials="' + c.esc(initials(name)) + '" />'
      : '<span class="rs-card-fallback">' + c.esc(initials(name)) + '</span>';
    return '<a class="rs-card" href="' + c.esc(opts.href || c.href(r)) + '">' +
      '<span class="rs-card-media">' + media + (opts.badge ? '<span class="rs-card-badge' + (opts.badgeClass ? ' ' + opts.badgeClass : '') + '">' + opts.badge + '</span>' : '') + '</span>' +
      '<span class="rs-card-body"><strong>' + c.esc(name) + '</strong><span>' + c.esc(opts.sub ?? c.subtitle(r)) + '</span></span></a>';
  }
  const set = (key, html) => { const el = document.querySelector('[data-home-grid="' + key + '"]'); if (el) el.innerHTML = html; };
  const newest = list => [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  async function render() {
    const c = C();
    let records;
    try { records = await c.catalog(); }
    catch {
      ['churches', 'meditation', 'live', 'store', 'resources'].forEach(k => set(k, empty('wifi-off', 'Couldn’t load this section', 'Please refresh the page to try again.')));
      window.lucide?.createIcons(); return;
    }
    const of = kind => records.filter(r => r.kind === kind);

    const churches = of('churches').sort((a, b) => Number(!!b.verified) - Number(!!a.verified)).slice(0, 4);
    set('churches', churches.length ? churches.map(r => card(r, { badge: r.verified ? '<i data-lucide="badge-check"></i> Verified' : '' })).join('')
      : empty('church', 'No churches listed yet', 'Churches appear here once they’re published.', 'church-portal.html', 'Register a church'));

    const rooms = newest(of('meditation').filter(r => r.cover || r.image)).concat(newest(of('meditation').filter(r => !(r.cover || r.image)))).slice(0, 4);
    set('meditation', rooms.length ? rooms.map(r => card(r)).join('')
      : empty('sparkles', 'No meditation rooms yet', 'New rooms will show up here.'));

    const stores = of('store').slice(0, 4);
    set('store', stores.length ? stores.map(r => card(r, { sub: [r.ownerName, r.category].filter(Boolean).join(' · ') })).join('')
      : empty('shopping-bag', 'No community stores yet', 'Stores from churches and ministries will appear here.'));

    const resources = newest(of('resources')).slice(0, 4);
    set('resources', resources.length ? resources.map(r => card(r, { badge: r.type ? c.esc(r.type) : '' })).join('')
      : empty('book-open', 'No resources yet', 'Study guides and teachings will appear here.'));

    const live = await c.live();
    const byId = Object.fromEntries(records.map(r => [r.id, r]));
    const items = [
      ...(live.stages || []).map(s => { const ch = byId[s.channelId] || { id: s.channelId, kind: 'channels', name: 'Channel' };
        return card(ch, { href: 'channel-live.html?id=' + encodeURIComponent(s.channelId) + (s.sessionId ? '&session=' + encodeURIComponent(s.sessionId) : ''), sub: s.title || c.subtitle(ch), badge: '<i class="rs-live-dot"></i> Live', badgeClass: 'is-live' }); }),
      ...(live.broadcasts || []).map(b => { const ch = byId[b.churchId] || { id: b.churchId, kind: 'churches', name: 'Church' };
        return card(ch, { href: 'broadcast.html?type=church&id=' + encodeURIComponent(b.churchId), sub: 'Church broadcast', badge: '<i class="rs-live-dot"></i> Live', badgeClass: 'is-live' }); })
    ].slice(0, 4);
    set('live', items.length ? items.join('')
      : empty('radio', 'No one is live right now', 'Live services and channel streams show here the moment they start.', 'events.html', 'See upcoming events'));
    window.lucide?.createIcons();
  }
  document.addEventListener('error', e => { const img = e.target; if (img.tagName !== 'IMG' || !img.closest('.rs-card-media')) return; const f = document.createElement('span'); f.className = 'rs-card-fallback'; f.textContent = img.dataset.initials || 'RS'; img.replaceWith(f); }, true);
  const start = () => (C() ? render() : setTimeout(start, 50));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
