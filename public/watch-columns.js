/* Short columns wait alongside longer content; tall columns scroll to their end first. */
(function () {
  'use strict';
  const watched = new WeakSet();
  let pending = false;
  const resize = new ResizeObserver(entries => {
    for (const { target } of entries) measure(target);
  });
  function measure(column) {
    const header = document.querySelector('body > .topbar');
    const headerBox = header?.getBoundingClientRect();
    const inset = header && ['fixed','sticky'].includes(getComputedStyle(header).position) && headerBox.top <= 0 ? Math.max(16, headerBox.bottom + 16) : 16;
    const value = Math.min(inset, window.innerHeight - column.getBoundingClientRect().height - 16) + 'px';
    if (column.style.getPropertyValue('--watch-sticky-top') !== value) column.style.setProperty('--watch-sticky-top', value);
  }
  function update() {
    pending = false;
    document.querySelectorAll('.mwe-watch:is(.broadcast-watch-layout,.recorded-watch-layout) > :is(.mwe-watch-main,.mwe-watch-side)').forEach(column => {
      if (!watched.has(column)) { watched.add(column); resize.observe(column); }
      measure(column);
    });
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  const changes = new MutationObserver(schedule);
  changes.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('resize', schedule, { passive:true });
  window.addEventListener('pagehide', event => { if (!event.persisted) { resize.disconnect(); changes.disconnect(); window.removeEventListener('resize', schedule); } });
  window.addEventListener('pageshow', schedule);
  schedule();
})();
