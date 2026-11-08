/* Class-only Theatre changes layout and focus; real media remains mounted. */
(function () {
  "use strict";
  function mount(root, player, variant, controls) {
    if (!root || !player || root.querySelector('[data-watch-theatre]')) return null;
    const isProvider = variant === 'stage' && player.tagName.toLowerCase() === 'rtk-meeting';
    if (!isProvider && !player.querySelector('video,iframe')) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = variant === 'stage' ? 'mwe-round' : 'mwe-chip mwe-theatre-button';
    if (variant === 'stage') button.dataset.ctl = 'theatre';
    button.dataset.watchTheatre = '';
    const set = active => {
      root.classList.toggle('is-theatre', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? 'Exit theatre' : 'Theatre');
      const label = button.querySelector('[data-theatre-label]');
      if (label) label.textContent = active ? 'Exit theatre' : 'Theatre';
      if (!active) button.focus({ preventScroll: true });
    };
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Theatre');
    button.innerHTML = (variant === 'stage' ? '<i data-lucide="rows-3"></i>' : '<i data-lucide="rectangle-horizontal"></i>') + '<span data-theatre-label>Theatre</span>';
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !root.classList.contains('is-theatre')) return;
      // A visible modal may own Escape. Inactive Theatre never consumes the event.
      if (document.querySelector('#member-auth-modal.is-open,[role="dialog"]:not([hidden]):not([aria-hidden="true"]),dialog[open]')) return;
      event.preventDefault();
      set(false);
    };
    const onClick = () => set(!root.classList.contains('is-theatre'));
    button.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (!controls) return null;
    controls.append(button);
    window.lucide?.createIcons?.();
    return { button, set, destroy() { document.removeEventListener('keydown', onKey); button.removeEventListener('click', onClick); button.remove(); root.classList.remove('is-theatre'); } };
  }
  window.MWEWatchTheatre = { mount };
})();
