/* Restored church profile: New Here card actions open the current RhemaSphere dialogs. */
(function () {
  var MODES = {
    visit: ['Request a visit', 'will get in touch to welcome you.', 'visit'],
    ride: ['Request a ride', 'will contact you to arrange transport to a service.', 'ride'],
    group: ['Join a group', 'will help you find a group that fits.', 'group'],
    ministry: ['Explore ministries', 'will connect you with a ministry team.', 'ministry'],
    prayer: ['Request prayer', 'will pray with you and follow up.', 'prayer']
  };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function toast(msg) { if (window.MWE && MWE.showToast) return MWE.showToast(msg); var t = document.querySelector('[data-toast]'); if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 3200); } }
  function session() { return fetch('/api/auth/session', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) { return d && d.user || null; }).catch(function () { return null; }); }
  function init() {
    var c = window.RS_CHURCH; if (!c) return;
    var fixLp = function () {
      var lp = document.getElementById('leader-profile-img'); if (!lp) return;
      var wrap = lp.closest('.leader-photo-wrap'); if (!wrap) return;
      var bad = /pastor-light-chapel|avatar-generic|photo-1560250097/.test(lp.getAttribute('src') || '') || (lp.complete && !lp.naturalWidth);
      if (!bad) { wrap.classList.remove('rs-no-photo'); var old = wrap.querySelector('.rs-pastor-initials'); if (old) old.remove(); return; }
      wrap.classList.add('rs-no-photo');
      var name = (c.pastor || c.pastorName || c.name || '').replace(/^(pastor|rev\.?|reverend|bishop|apostle|dr\.?)\s+/i, '');
      var ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || '?';
      var el = wrap.querySelector('.rs-pastor-initials');
      if (!el) { el = document.createElement('div'); el.className = 'rs-pastor-initials'; el.setAttribute('aria-hidden', 'true'); wrap.insertBefore(el, lp); }
      el.textContent = ini;
    };
    fixLp(); window.addEventListener('load', fixLp); setTimeout(fixLp, 1500);
    var lpi = document.getElementById('leader-profile-img'); if (lpi) { lpi.addEventListener('error', fixLp); lpi.addEventListener('load', fixLp); try { new MutationObserver(fixLp).observe(lpi, { attributes: true, attributeFilter: ['src'] }); } catch (e) {} }
    var phone = document.querySelectorAll('[data-rs-phone]'), email = document.querySelectorAll('[data-rs-email]');
    phone.forEach(function (el) { el.textContent = c.phone || 'Not listed'; });
    email.forEach(function (el) { el.textContent = c.email || 'Not listed'; });
    var wrap = document.createElement('div'); wrap.className = 'rsc-page rs-cp-dialogs';
    var mins = (c.ministries || []).map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('');
    wrap.innerHTML = '<dialog class="rsc-dialog" id="rsc-request"><form method="dialog" id="rsc-request-form"><button type="button" class="rsc-dialog-x" data-close aria-label="Close"><i data-lucide="x"></i></button><h2 id="rsc-request-title">Request a visit</h2><p class="rsc-muted" id="rsc-request-sub"></p>' +
      '<label>Full name<input name="fullName" required autocomplete="name" maxlength="120" /></label>' +
      '<label>Email<input name="email" type="email" required autocomplete="email" maxlength="200" /></label>' +
      '<label>Phone<input name="phone" type="tel" autocomplete="tel" maxlength="40" /></label>' +
      '<label id="rsc-interest-wrap" hidden>Interested in<select name="interest">' + (mins || '<option>Any group</option>') + '</select></label>' +
      '<label id="rsc-pickup-wrap"><span id="rsc-pickup-label">Pickup area</span><input name="city" autocomplete="address-level2" maxlength="160" /></label>' +
      '<label>Message<textarea name="message" rows="3" maxlength="2000"></textarea></label>' +
      '<div class="rsc-dialog-actions"><button type="button" class="rsc-btn rsc-btn-ghost" data-close>Cancel</button><button type="submit" class="rsc-btn rsc-btn-primary">Send request</button></div></form></dialog>';
    document.body.appendChild(wrap);
    var dlg = wrap.querySelector('dialog'), form = wrap.querySelector('form'), mode = 'visit';
    dlg.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var fd = Object.fromEntries(new FormData(form)); var btn = form.querySelector('[type=submit]'); btn.disabled = true;
      var interest = fd.interest; delete fd.interest;
      if (interest && (mode === 'group' || mode === 'ministry')) fd.message = (MODES[mode][0] + ': ' + interest + (fd.message ? '\n' + fd.message : ''));
      fetch('/api/visitor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign(fd, { churchId: c.id, needs: [MODES[mode][2]] })) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || !d.ok) throw new Error(d.error || 'Request failed'); }); })
        .then(function () { dlg.close(); form.reset(); toast(MODES[mode][0].replace(/^Request an? /, '').replace(/^./, function (s) { return s.toUpperCase(); }) + ' request sent to ' + c.name + '.'); })
        .catch(function (err) { toast(err.message ? err.message.charAt(0).toUpperCase() + err.message.slice(1) : 'Your request could not be sent.'); })
        .then(function () { btn.disabled = false; });
    });
    function open(act) {
      mode = act; var m = MODES[act];
      document.getElementById('rsc-request-title').textContent = m[0];
      document.getElementById('rsc-request-sub').textContent = c.name + ' ' + m[1];
      document.getElementById('rsc-pickup-label').textContent = act === 'ride' ? 'Pickup area' : 'Your city';
      document.getElementById('rsc-interest-wrap').hidden = !(act === 'group' || act === 'ministry');
      session().then(function (u) { if (u) { form.fullName.value = form.fullName.value || u.name || u.displayName || ''; form.email.value = form.email.value || u.email || ''; } });
      dlg.showModal(); if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rs-act]'); if (!b) return; var act = b.dataset.rsAct; e.preventDefault();
      if (MODES[act]) return open(act);
      if (act === 'message') { location.href = '/messages.html?compose=1&id=' + encodeURIComponent(c.id); return; }
      if (act === 'share') { var url = location.origin + '/churches/' + encodeURIComponent(c.id);
        if (navigator.share) navigator.share({ title: c.name, url: url }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied.'); }, function () { toast(url); });
        else toast(url); }
    });
    window.MWE = window.MWE || {};
    MWE.toggleVisitPanel = function (on) { if (on !== false) open('visit'); };
    MWE.openRideModal = function () { open('ride'); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
