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

    const K = window.RSCards, title = r => r.name || r.title || '';
    const arch = (key, cls) => { const el = document.querySelector('[data-home-grid="' + key + '"]'); if (el) el.classList.add('rs-home-archive', cls); };

    /* Churches: the /churches directory card (rsc-card). */
    const churches = of('churches').sort((a, b) => Number(!!b.verified) - Number(!!a.verified)).slice(0, 4);
    let liveIds = null; try { liveIds = await window.RSChurchDirectory?.liveChurchIds?.(); } catch { liveIds = null; }
    arch('churches', 'rsc-grid');
    set('churches', churches.length ? churches.map(r => window.RSChurchDirectory.churchCard(r, liveIds)).join('')
      : empty('church', 'No churches listed yet', 'Churches appear here once they’re published.', 'church-portal.html', 'Register a church'));

    /* Meditation: the meditation.html room card. */
    const cap = v => String(v || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    const rooms = newest(of('meditation').filter(r => r.cover || r.image)).concat(newest(of('meditation').filter(r => !(r.cover || r.image)))).slice(0, 4);
    arch('meditation', 'rooms-grid');
    set('meditation', rooms.length ? rooms.map(r => K.room({ ...r, cover: r.cover || r.image || '', categoryLabel: r.categoryLabel || cap(r.category) }, { href: c.href(r) })).join('')
      : empty('sparkles', 'No meditation rooms yet', 'New rooms will show up here.'));

    /* Store: the store.html product card (sf-card). */
    const storesById = Object.fromEntries(of('store').map(s => [s.id, s]));
    const products = of('products').filter(p => !p.status || p.status === 'Active').slice(0, 4);
    arch('store', 'sf-grid');
    set('store', products.length ? products.map(p => K.product({ ...p, seller: p.seller || storesById[p.storeId]?.name || '' }, { linkActions: true })).join('')
      : empty('shopping-bag', 'No community stores yet', 'Stores from churches and ministries will appear here.'));

    /* Resources: the resources.html card. */
    const resources = newest(of('resources')).slice(0, 4);
    arch('resources', 'resources-grid');
    set('resources', resources.length ? resources.map(r => K.resource(r, { channels: of('channels'), linkActions: true })).join('')
      : empty('book-open', 'No resources yet', 'Study guides and teachings will appear here.'));

    /* Live: the livestream.html card. */
    const live = await c.live();
    const byId = Object.fromEntries(records.map(r => [r.id, r]));
    const items = [
      ...(live.stages || []).map(s => { const ch = byId[s.channelId] || {};
        return K.live({ name: title(ch) || s.title || 'Channel', type: 'channel', description: s.title || ch.description }, { href: 'channel-live.html?id=' + encodeURIComponent(s.channelId) + (s.sessionId ? '&session=' + encodeURIComponent(s.sessionId) : ''), thumb: c.image(ch) }); }),
      ...(live.broadcasts || []).map(b => { const ch = byId[b.churchId] || {};
        return K.live({ name: title(ch) || 'Church', type: 'church', description: ch.description }, { href: 'broadcast.html?type=church&id=' + encodeURIComponent(b.churchId), thumb: c.image(ch) }); })
    ].slice(0, 4);
    if (items.length) arch('live', 'streams-hub-grid');
    set('live', items.length ? items.join('')
      : empty('radio', 'No one is live right now', 'Live services and channel streams show here the moment they start.', 'events.html', 'See upcoming events'));
    window.lucide?.createIcons();
  }
  document.addEventListener('error', e => { const img = e.target; if (img.tagName !== 'IMG' || !img.closest('.rs-card-media')) return; const f = document.createElement('span'); f.className = 'rs-card-fallback'; f.textContent = img.dataset.initials || 'RS'; img.replaceWith(f); }, true);
  const start = () => (C() ? render() : setTimeout(start, 50));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
