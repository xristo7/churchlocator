(function initializeChannelsModule() {
  function render() {
    const data = window.FaithLinkModules;
    const grid = document.getElementById("channels-grid");
    if (!data || !grid) return;

    const query = document.getElementById("channel-search")?.value.trim().toLowerCase() || "";
    const topic = document.getElementById("channel-topic")?.value || "all";
    const format = document.getElementById("channel-format")?.value || "all";
    const status = document.getElementById("channel-status")?.value || "all";
    const channels = data.getChannels().filter(channel => {
      const searchable = `${channel.name} ${channel.handle} ${channel.owner} ${channel.topic} ${channel.description}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (topic === "all" || channel.topic === topic)
        && (format === "all" || channel.format === format)
        && (status === "all" || (status === "live" && channel.live) || (status === "verified" && channel.verified));
    });

    document.getElementById("channel-result-count").textContent = `${channels.length} channel${channels.length === 1 ? "" : "s"}`;
    if (!channels.length) {
      grid.innerHTML = `<div class="module-empty"><i data-lucide="radio-tower"></i><strong>No channels match these filters.</strong><p>Try another topic, format, or search term.</p></div>`;
      window.lucide?.createIcons();
      return;
    }

    grid.innerHTML = channels.map(channel => `
      <article class="channel-card">
        <div class="channel-cover" style="background-image:url('${data.escapeHtml(channel.cover)}')">
          <span class="channel-format"><i data-lucide="${channel.format === "Podcast" ? "mic-2" : channel.format === "Livestream" ? "radio" : "play-square"}"></i>${data.escapeHtml(channel.format)}</span>
          ${channel.live ? `<span class="channel-live"><i data-lucide="radio"></i> Live</span>` : ""}
          <img class="channel-avatar" src="${data.escapeHtml(channel.avatar)}" alt="" />
        </div>
        <div class="channel-card-body">
          <span class="channel-owner">${channel.verified ? `<i data-lucide="badge-check"></i>` : ""}${data.escapeHtml(channel.owner)}</span>
          <h3>${data.escapeHtml(channel.name)}</h3>
          <span class="channel-handle">${data.escapeHtml(channel.handle)} · ${data.escapeHtml(channel.topic)}</span>
          <p>${data.escapeHtml(channel.description)}</p>
          <div class="channel-meta">
            <span><i data-lucide="users"></i>${Number(channel.followers).toLocaleString()} followers</span>
            <span><i data-lucide="play-circle"></i>${Number(channel.items).toLocaleString()} posts</span>
          </div>
        </div>
      </article>
    `).join("");
    window.lucide?.createIcons();
  }

  function setModal(open) {
    const modal = document.getElementById("channel-create-modal");
    modal?.classList.toggle("is-open", open);
    if (open) window.setTimeout(() => modal.querySelector("input")?.focus(), 50);
  }

  document.addEventListener("DOMContentLoaded", () => {
    ["channel-search", "channel-topic", "channel-format", "channel-status"].forEach(id => {
      document.getElementById(id)?.addEventListener(id === "channel-search" ? "input" : "change", render);
    });

    document.getElementById("create-channel-button")?.addEventListener("click", () => {
      if (!window.MWE?.isMemberAuthenticated()) {
        window.MWE?.openMemberLogin("app.html?view=channels");
        return;
      }
      setModal(true);
    });
    document.querySelector("#channel-create-modal .module-modal-close")?.addEventListener("click", () => setModal(false));
    document.getElementById("channel-create-modal")?.addEventListener("click", event => {
      if (event.target.id === "channel-create-modal") setModal(false);
    });
    document.getElementById("channel-create-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(event.currentTarget));
      window.FaithLinkModules.addChannel({
        ...form,
        handle: String(form.handle).startsWith("@") ? form.handle : `@${form.handle}`,
        cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=160&q=82"
      });
      event.currentTarget.reset();
      setModal(false);
      render();
      window.MWE?.showMemberToast?.("Channel created successfully");
    });
    render();
  });
})();
