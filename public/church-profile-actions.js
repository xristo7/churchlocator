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
    function open(act) { window.MWEChurchActions?.open(c, act); }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rs-act]'); if (!b) return; var act = b.dataset.rsAct; e.preventDefault();
      if (MODES[act]) return open(act);
      if (act === 'message') return open('message');
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
