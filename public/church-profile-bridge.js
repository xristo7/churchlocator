/* Feeds the restored church profile (app.js renderProfile) from the public church API. */
(function () {
  var params = new URLSearchParams(location.search);
  var m = location.pathname.match(/^\/churches\/([^/]+)\/?$/);
  var id = params.get('id') || (m && decodeURIComponent(m[1])) || '';
  function get(url) {
    try { var x = new XMLHttpRequest(); x.open('GET', url, false); x.send(null); if (x.status !== 200) return null; var d = JSON.parse(x.responseText); return d && d.ok ? d : null; } catch (e) { return null; }
  }
  function abs(u) { try { return u ? new URL(u, location.origin + '/').href : ''; } catch (e) { return ''; } }
  function fmt(s) { return [s.day, s.time].filter(Boolean).join(' '); }
  function map(c) {
    var sv = Array.isArray(c.services) ? c.services : [];
    var place = [c.city, c.state, c.country].filter(Boolean).join(', ');
    return {
      id: c.id, name: c.name, denomination: c.denomination || '', language: c.language || 'English', worship: c.worshipStyle || 'Contemporary',
      city: c.city || '', state: c.state || '', country: c.country || '', postal: c.postalCode || '', area: c.city || '',
      location: c.address || place, website: c.website || '#', phone: c.phone || '', email: c.email || '',
      photo: abs(c.photo), coverImage: abs(c.photo), logo: abs(c.logo), about: c.about || '', tagline: c.about || '',
      firstVisit: c.firstVisit || '', pastor: c.pastorName || 'Pastoral Team', pastorTitle: c.pastorTitle || 'Lead Pastor', pastorPhoto: abs(c.pastorPhoto || c.pastorImage || '/assets/avatar-generic.svg'), pastorBio: c.pastorBio || c.about || '',
      ministries: Array.isArray(c.ministries) ? c.ministries : [], verified: c.verified !== false,
      sunday: sv[0] ? fmt(sv[0]) : '', midweek: sv[1] ? (sv[1].type || 'Gathering') + ' · ' + fmt(sv[1]) : '',
      schedule: sv.filter(function (s) { return fmt(s); }).map(function (s) { return [s.type || 'Gathering', fmt(s)]; }),
      livestream: { enabled: !!c.livestreamEnabled }, tenantId: c.tenantId || '', canMessage: !!c.canMessage
    };
  }
  var list = (get('/api/churches') || {}).churches || [];
  var one = id ? (get('/api/churches/' + encodeURIComponent(id)) || {}).church : null;
  if (!id && list[0]) one = list[0];
  if (!one) { window.RS_CHURCH = null; return; }
  var all = list.filter(function (c) { return c.id !== one.id; }); all.unshift(one);
  try { localStorage.setItem('mwe.platform.churches.v1', JSON.stringify(all.map(map))); } catch (e) {}
  window.RS_CHURCH = one;
  if (params.get('id') !== one.id) { params.set('id', one.id); history.replaceState(history.state, '', location.pathname + '?' + params.toString() + location.hash); }
})();
