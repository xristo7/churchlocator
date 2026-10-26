/* RhemaSphere public catalog: one source for the Home page and the unified header search. Reads only real published records. */
(function (root) {
  'use strict';
  let catalogPromise = null, livePromise = null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getJson = url => fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()).then(d => { if (!d || !d.ok) throw new Error(d?.error || 'Request failed'); return d; });
  /* Churches come from the church database (/api/churches); every other kind stays on the published catalog. */
  const churchesApi = () => getJson('/api/churches').then(d => (d.churches || []).map(c => ({ ...c, kind: 'churches' })));
  const catalog = () => (catalogPromise ||= Promise.all([getJson('/api/catalog').then(d => d.records || []), churchesApi()])
    .then(([records, churches]) => [...records.filter(r => r.kind !== 'churches'), ...churches])
    .catch(e => { catalogPromise = null; throw e; }));
  const churches = () => catalog().then(list => list.filter(r => r.kind === 'churches'));
  const live = () => (livePromise ||= getJson('/api/live/directory').catch(() => ({ stages: [], broadcasts: [] })));
  const groups = [
    { key: 'churches', kinds: ['churches'], label: 'Churches', icon: 'church' },
    { key: 'meditation', kinds: ['meditation'], label: 'Meditation rooms', icon: 'sparkles' },
    { key: 'channels', kinds: ['channels'], label: 'Channels', icon: 'podcast' },
    { key: 'events', kinds: ['events'], label: 'Events', icon: 'calendar-days' },
    { key: 'stores', kinds: ['store', 'products'], label: 'Stores', icon: 'shopping-bag' },
    { key: 'resources', kinds: ['resources'], label: 'Resources', icon: 'book-open' }
  ];
  const title = r => r.name || r.title || 'Untitled';
  const image = r => r.photo || r.cover || r.coverImageUrl || r.image || r.avatar || r.logo || '';
  const href = r => {
    const id = encodeURIComponent(r.id);
    return ({ churches: '/churches/', meditation: 'meditation.html?room=', channels: 'channel-detail.html?id=', events: 'event-profile.html?id=',
      store: 'storefront.html?id=', products: 'product-detail.html?id=', resources: 'resource-detail.html?id=' }[r.kind] || '#') + id;
  };
  const subtitle = r => {
    switch (r.kind) {
      case 'churches': return [r.denomination, r.city].filter(Boolean).join(' · ');
      case 'meditation': return [r.categoryLabel, r.durationMinutes ? r.durationMinutes + ' min' : '', r.ownerName].filter(Boolean).join(' · ');
      case 'channels': return [r.owner, r.topic].filter(Boolean).join(' · ');
      case 'events': { const d = r.startsAt ? new Date(r.startsAt) : null; return [d && !isNaN(d) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '', r.venueName, r.city].filter(Boolean).join(' · '); }
      case 'store': return ['Store', r.ownerName, r.category].filter(Boolean).join(' · ');
      case 'products': return ['Product', r.seller, Number(r.price) > 0 ? '$' + Number(r.price).toFixed(2) : ''].filter(Boolean).join(' · ');
      case 'resources': return [r.type, r.creator, r.topic].filter(Boolean).join(' · ');
    }
    return '';
  };
  const haystack = r => [title(r), r.subtitle, r.description, r.about, r.city, r.country, r.denomination, r.topic, r.owner, r.ownerName, r.creator, r.seller, r.category, r.categoryLabel, r.handle, r.pastor, r.pastorName, r.state, r.venueName].filter(Boolean).join(' ').toLowerCase();
  async function search(query) {
    const q = String(query || '').trim().toLowerCase();
    const records = await catalog();
    const terms = q.split(/\s+/).filter(Boolean);
    return groups.map(g => {
      const items = records.filter(r => g.kinds.includes(r.kind) && terms.every(t => haystack(r).includes(t)));
      return { ...g, items };
    });
  }
  root.RSCatalog = { catalog, churches, live, search, groups, title, image, href, subtitle, esc };
})(window);
