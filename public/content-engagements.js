(function initializeContentEngagements() {
  const allowed = new Set(["channel", "product", "resource", "livestream"]);
  const hydrated = new Set();
  let timer = 0;

  const controls = () => [...document.querySelectorAll("[data-love-type][data-love-id]")]
    .filter(button => allowed.has(button.dataset.loveType));

  function paint(button, loved, count) {
    button.classList.toggle("is-loved", loved);
    button.setAttribute("aria-pressed", String(loved));
    button.setAttribute("aria-label", `${loved ? "Remove love from" : "Love"} this ${button.dataset.loveType}`);
    const countNode = button.querySelector("[data-love-count]");
    if (countNode) countNode.textContent = Number(count || 0).toLocaleString();
  }

  async function hydrate() {
    timer = 0;
    const groups = {};
    controls().forEach(button => {
      const key = `${button.dataset.loveType}:${button.dataset.loveId}`;
      if (hydrated.has(key)) return;
      hydrated.add(key);
      (groups[button.dataset.loveType] ||= []).push(button);
    });
    await Promise.all(Object.entries(groups).map(async ([type, buttons]) => {
      const ids = [...new Set(buttons.map(button => button.dataset.loveId))];
      try {
        const response = await fetch(`/api/content-engagements?type=${encodeURIComponent(type)}&ids=${encodeURIComponent(ids.join(","))}`, { credentials: "same-origin" });
        if (!response.ok) throw new Error();
        const result = await response.json();
        const loved = new Set(result.loved || []);
        buttons.forEach(button => paint(button, loved.has(button.dataset.loveId), result.counts?.[button.dataset.loveId] || 0));
      } catch {
        buttons.forEach(button => button.classList.add("is-unavailable"));
      }
    }));
  }

  function queueHydrate() {
    if (timer) return;
    timer = window.setTimeout(hydrate, 20);
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-love-type][data-love-id]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    button.disabled = true;
    try {
      const response = await fetch("/api/content-engagements", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: button.dataset.loveType, id: button.dataset.loveId })
      });
      if (response.status === 401) {
        window.MWE?.openMemberLogin?.(`${location.pathname.split("/").pop()}${location.search}${location.hash}`);
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error();
      controls().filter(match => match.dataset.loveType === result.type && match.dataset.loveId === result.id)
        .forEach(match => paint(match, result.loved, result.count));
      window.MWE?.showMemberToast?.(result.loved ? "Added to loved content" : "Removed from loved content");
    } catch {
      window.MWE?.showMemberToast?.("Unable to update this reaction right now");
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    queueHydrate();
    new MutationObserver(queueHydrate).observe(document.body, { childList: true, subtree: true });
  });
})();
