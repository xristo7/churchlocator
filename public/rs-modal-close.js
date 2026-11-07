/* Shared modal close: every pop-up closes via its X, a backdrop click/tap (never a click inside the card) and Escape.
   Runs after each page's own handlers; only steps in when the pop-up is still open. */
(function () {
  if (window.__rsModalClose) return; window.__rsModalClose = true;
  var MODALISH = /modal|dialog|overlay|backdrop|sheet|popover|lightbox|drawer|viewer|popup|auth/i;
  var OPEN_CLASS = /(?:^|\s)(?:open|is-open|active|is-active|show|is-shown|visible|is-visible|opened|is-opened)(?:\s|$)/;
  var CLOSE_SEL = '[data-close],[data-dismiss],[data-modal-close],[data-close-modal],[aria-label*="lose"],[title*="lose"],[class*="close"],[data-lucide="x"],.lucide-x';
  var BODY_LOCK = ['modal-open', 'no-scroll', 'is-locked', 'overflow-hidden', 'has-modal', 'sheet-open', 'menu-open', 'nav-open', 'auth-open', 'member-auth-open', 'lightbox-open'];
  var st = document.createElement('style'); st.textContent = 'dialog::backdrop{-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}'; (document.head || document.documentElement).appendChild(st);
  var lastFocus = null;
  function cls(el) { var c = el.className; return typeof c === 'string' ? c : (c && c.baseVal) || ''; }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    if (el.tagName === 'DIALOG') return el.open;
    var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
    var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  }
  function isOverlay(el) {
    if (!el || el.nodeType !== 1 || el === document.body || el.tagName === 'IFRAME') return false;
    if (el.tagName === 'DIALOG') return el.open;
    var sig = (el.id || '') + ' ' + cls(el) + ' ' + (el.getAttribute('role') || '') + (el.getAttribute('aria-modal') === 'true' ? ' dialog' : '');
    if (!MODALISH.test(sig)) return false;
    var cs = getComputedStyle(el); if (cs.position !== 'fixed') return false;
    var r = el.getBoundingClientRect(); return r.width >= innerWidth * 0.85 && r.height >= innerHeight * 0.6 && visible(el);
  }
  function openOverlays() {
    var out = [];
    document.querySelectorAll('dialog[open],[role=dialog],[aria-modal=true],[class*=modal],[class*=dialog],[class*=overlay],[class*=backdrop],[class*=sheet],[class*=popover],[class*=lightbox],[class*=drawer],[class*=viewer],[class*=popup],[id*=modal],[id*=dialog],[id*=overlay],[id*=sheet],[id*=popover],[id*=lightbox],[id*=viewer]').forEach(function (el) {
      if (isOverlay(el) && !out.some(function (o) { return o.contains(el); })) out.push(el);
    });
    return out;
  }
  function overlayFor(target) { var list = openOverlays(); for (var i = list.length - 1; i >= 0; i--) if (list[i] === target || list[i].contains(target)) return list[i]; return null; }
  function seeThrough(el) { // a backdrop is a scrim, not an opaque full-screen card
    if (/backdrop|overlay|scrim|shade/i.test(cls(el) + ' ' + el.id)) return true;
    var m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/); if (!m) return true;
    var p = m[1].split(','); return p.length < 4 ? false : parseFloat(p[3]) < 0.97;
  }
  function rememberFocus() {
    var a = document.activeElement;
    if (a && a !== document.body && a !== document.documentElement) lastFocus = a;
  }
  function restoreFocus() {
    var a = lastFocus;
    lastFocus = null;
    if (!a || !a.isConnected || typeof a.focus !== 'function') return;
    try { a.focus({ preventScroll: true }); } catch (e) { try { a.focus(); } catch (err) {} }
  }
  function unlockScroll() {
    if (openOverlays().length) return;
    [document.documentElement, document.body].forEach(function (n) {
      if (!n) return;
      BODY_LOCK.forEach(function (c) { n.classList.remove(c); });
      // Catch *-auth-open / *-modal-open variants the page may set (e.g. member-auth-open).
      Array.from(n.classList).forEach(function (c) {
        if (/(?:^|-)(?:auth|modal)-open$/.test(c) || c === 'rs-modal-open') n.classList.remove(c);
      });
      if (n.style.overflow === 'hidden') n.style.overflow = '';
    });
    document.documentElement.classList.remove('rs-modal-open');
  }
  function forceClose(ov) {
    if (!ov || !visible(ov)) return;
    if (ov.tagName === 'DIALOG') { try { ov.close(); } catch (e) {} unlockScroll(); restoreFocus(); return; }
    ['open', 'is-open', 'active', 'is-active', 'show', 'is-shown', 'visible', 'is-visible', 'opened', 'is-opened'].forEach(function (c) { ov.classList.remove(c); });
    ov.setAttribute('aria-hidden', 'true');
    // Always pin a forced hide so a CSS race (or !important display elsewhere) cannot leave the scrim up.
    ov.hidden = true;
    ov.dataset.rsForcedClosed = '1';
    ov.style.setProperty('display', 'none', 'important');
    // a backdrop that sits next to its card: hide the paired card too
    var pair = ov.nextElementSibling;
    if (pair && /backdrop/i.test(cls(ov)) && MODALISH.test(cls(pair) + ' ' + pair.id) && visible(pair)) { pair.hidden = true; }
    unlockScroll();
    restoreFocus();
  }
  // When a page re-opens a pop-up we hid, drop our inline hide so its own open logic works.
  // Only release on an *opening* class/open change — never when we ourselves set hidden during forceClose.
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      var el = m.target;
      if (!el || !el.dataset || !el.dataset.rsForcedClosed) return;
      if (m.attributeName === 'open') {
        if (el.tagName === 'DIALOG' && el.open) { el.style.removeProperty('display'); el.hidden = false; delete el.dataset.rsForcedClosed; }
        return;
      }
      if (m.attributeName === 'class') {
        if (OPEN_CLASS.test(cls(el))) { el.style.removeProperty('display'); el.hidden = false; delete el.dataset.rsForcedClosed; }
        return;
      }
      // Ignore 'hidden' mutations from our own forceClose.
    });
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class', 'open'] });
  function ownX(ov) { // the page's own close button: inside the pop-up or in the panel paired with its backdrop
    var scopes = [ov, ov.nextElementSibling, ov.previousElementSibling].filter(Boolean);
    for (var i = 0; i < scopes.length; i++) { var xs = scopes[i].querySelectorAll(CLOSE_SEL);
      for (var j = 0; j < xs.length; j++) { var b = xs[j].closest('button,a,[role=button]') || xs[j]; if (b.getBoundingClientRect().width > 0 && !/closed/i.test(cls(b))) return b; } }
    return null;
  }
  function later(ov, clicked) { setTimeout(function () {
    if (!(visible(ov) && (isOverlay(ov) || ov.tagName === 'DIALOG'))) return;
    var x = ownX(ov); if (x && x !== clicked && !x.contains(clicked || null)) { try { x.click(); } catch (e) {} }
    setTimeout(function () { if (visible(ov) && (isOverlay(ov) || ov.tagName === 'DIALOG')) forceClose(ov); }, 60);
  }, 90); }
  function clearForced() { document.querySelectorAll('[data-rs-forced-closed]').forEach(function (el) { el.style.removeProperty('display'); el.hidden = false; delete el.dataset.rsForcedClosed; }); }
  window.addEventListener('message', function (e) { if (!e.data || e.data.rsModalEsc !== 1) clearForced(); });
  document.addEventListener('click', function (e) {
    var t = e.target; if (!(t instanceof Element)) return;
    var ov = overlayFor(t);
    if (!ov) { clearForced(); return; }
    rememberFocus();
    var authX = t.closest('.member-auth-close');
    var auth = authX && authX.closest('#member-auth-modal');
    if (auth === ov && ov.classList.contains('is-open')) {
      // Resolve svg/path targets to the real X before the generic selector.
      // The shared later() path may otherwise enqueue an SVG.click() replay.
      e.stopPropagation();
      if (typeof auth._rsCloseMemberLogin === 'function') auth._rsCloseMemberLogin();
      else forceClose(auth);
      return;
    }
    var x = t.closest(CLOSE_SEL);
    // Prefer the actionable control (button) so page handlers and ownX stay aligned.
    if (x) { var btn = x.closest('button,a,[role=button]'); if (btn && ov.contains(btn)) x = btn; }
    if (x && ov.contains(x) && x !== ov && !/closed/i.test(cls(x))) { later(ov, x); return; }
    // Backdrop: the overlay itself, or a full-size layer inside it — never the card.
    var r = t.getBoundingClientRect(), o = ov.getBoundingClientRect();
    if ((t === ov || (r.width >= o.width * 0.85 && r.height >= o.height * 0.6)) && seeThrough(t)) {
      if (t.tagName === 'DIALOG') { var cr = t.getBoundingClientRect(); if (e.clientX >= cr.left && e.clientX <= cr.right && e.clientY >= cr.top && e.clientY <= cr.bottom && t.firstElementChild && t.firstElementChild.contains(document.elementFromPoint(e.clientX, e.clientY))) return; }
      later(ov);
    }
  }, true);
  // <dialog>: clicks on the ::backdrop target the dialog element itself
  document.addEventListener('click', function (e) {
    var d = e.target; if (!(d instanceof HTMLDialogElement) || !d.open) return;
    var r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { rememberFocus(); later(d); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.defaultPrevented && false) return;
    var list = openOverlays(); var ov = list[list.length - 1]; if (ov) { rememberFocus(); later(ov); return; }
    // Signed-in shell: the pop-up may live in the other document (parent ↔ page iframe)
    try { document.querySelectorAll('iframe').forEach(function (f) { f.contentWindow && f.contentWindow.postMessage({ rsModalEsc: 1 }, '*'); }); } catch (err) {}
    try { if (window.parent !== window) window.parent.postMessage({ rsModalEsc: 1 }, '*'); } catch (err) {}
  }, true);
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.rsModalEsc !== 1) return;
    var list = openOverlays(); var ov = list[list.length - 1]; if (ov) { rememberFocus(); later(ov); }
  });
  // Backdrops: slight transparency with a subtle blur, whichever page opened them.
  var blurQ = 0; function blurOpen() { blurQ = 0; openOverlays().forEach(function (ov) {
    if (ov.tagName === 'DIALOG' || !seeThrough(ov) || ov.dataset.rsBlur) return;
    var cs = getComputedStyle(ov); if (cs.backdropFilter && cs.backdropFilter !== 'none') return;
    ov.dataset.rsBlur = '1'; ov.style.backdropFilter = 'blur(6px)'; ov.style.webkitBackdropFilter = 'blur(6px)';
  }); }
  new MutationObserver(function () { if (!blurQ) blurQ = setTimeout(blurOpen, 60); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'open', 'style'] });
  window.RSModal = { close: forceClose, open: openOverlays };
})();
