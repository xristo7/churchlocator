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
      <article class="channel-profile-card">
        <a class="channel-profile-cover" href="channel-detail.html?id=${encodeURIComponent(channel.id)}" aria-label="Open ${data.escapeHtml(channel.name)}">
          <img src="${data.escapeHtml(channel.cover)}" alt="${data.escapeHtml(channel.name)} channel cover" />
          <span class="channel-format"><i data-lucide="${channel.format === "Podcast" ? "mic-2" : channel.format === "Livestream" ? "radio" : "play-square"}"></i>${data.escapeHtml(channel.format)}</span>
          ${channel.live ? `<span class="channel-live"><i data-lucide="radio"></i> Live</span>` : ""}
          <img class="channel-profile-avatar" src="${data.escapeHtml(channel.avatar)}" alt="" />
        </a>
        <button class="content-love-button content-love-overlay" type="button" data-love-type="channel" data-love-id="${data.escapeHtml(channel.id)}" aria-pressed="false"><i data-lucide="heart"></i><span data-love-count>0</span></button>
        <div class="channel-profile-body">
          <div class="channel-profile-identity"><div><h3><a href="channel-detail.html?id=${encodeURIComponent(channel.id)}">${data.escapeHtml(channel.name)}</a>${channel.verified ? `<i data-lucide="badge-check" aria-label="Verified"></i>` : ""}</h3><span>${data.escapeHtml(channel.owner)} · ${data.escapeHtml(channel.topic)}</span></div><span class="channel-online"><i></i>${channel.live ? "Live now" : "Active"}</span></div>
          <p>${data.escapeHtml(channel.description)}</p>
          <div class="channel-platform-stats">
            <span><strong>${Number(channel.followers) >= 1000 ? `${(Number(channel.followers) / 1000).toFixed(1)}K` : Number(channel.followers)}</strong><small>Followers</small></span>
            <span><strong>${Number(channel.items).toLocaleString()}</strong><small>${channel.format === "Podcast" ? "Episodes" : "Posts"}</small></span>
            <span><strong>${channel.verified ? "4.9" : "4.7"}</strong><small>Rating</small></span>
          </div>
          <a class="channel-contact-button" href="messages.html?compose=channel&id=${encodeURIComponent(channel.id)}"><i data-lucide="message-circle"></i> Get in touch</a>
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

  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
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
