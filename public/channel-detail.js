(function initializeChannelDetail() {
  const data = () => window.FaithLinkModules;
  const channelId = new URLSearchParams(location.search).get("id");
  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
    const channel = data().getChannels().find(item => item.id === channelId);
    const root = document.getElementById("channel-detail");
    if (!channel) {
      root.innerHTML = `<div class="module-empty"><i data-lucide="radio-tower"></i><strong>Channel not found.</strong><a href="channels.html">Return to Channels</a></div>`;
      window.lucide?.createIcons();
      return;
    }
    const posts = ["A new beginning in faith", "How to stay grounded in Scripture", "Prayer, purpose, and everyday life"];
    document.title = `${channel.name} | My Way`;
    root.innerHTML = `<article class="channel-detail-hero channel-detail-modern">
      <div class="channel-detail-cover"><img src="${data().escapeHtml(channel.cover)}" alt="${data().escapeHtml(channel.name)} cover" /><span class="channel-cover-type"><i data-lucide="${channel.format === "Podcast" ? "headphones" : "radio"}"></i>${data().escapeHtml(channel.format)} · ${data().escapeHtml(channel.topic)}</span></div>
      <div class="channel-detail-profile"><img src="${data().escapeHtml(channel.avatar)}" alt="${data().escapeHtml(channel.owner)}" /><div class="channel-detail-identity"><h1>${data().escapeHtml(channel.name)} ${channel.verified ? `<i data-lucide="badge-check"></i>` : ""}</h1><p>${data().escapeHtml(channel.handle)} <span>·</span> Created by ${data().escapeHtml(channel.owner)}</p></div><a href="messages.html?compose=channel&id=${encodeURIComponent(channel.id)}"><i data-lucide="message-circle"></i> Get in touch</a></div>
      <div class="channel-detail-summary"><div class="channel-detail-description"><span>About the channel</span><p>${data().escapeHtml(channel.description)}</p></div><div class="channel-detail-stats"><span><i data-lucide="users"></i><strong>${Number(channel.followers).toLocaleString()}</strong><small>Followers</small></span><span><i data-lucide="${channel.format === "Podcast" ? "mic-2" : "play-square"}"></i><strong>${Number(channel.items).toLocaleString()}</strong><small>${channel.format === "Podcast" ? "Episodes" : "Posts"}</small></span><span><i data-lucide="star"></i><strong>${channel.verified ? "4.9" : "4.7"}</strong><small>Member rating</small></span></div></div>
      <nav class="channel-detail-tabs"><a class="active" href="#latest">Home</a><a href="#latest">Posts</a><a href="#about">About</a></nav>
    </article>
    <section class="channel-content-section" id="latest"><div class="module-results-head"><h2>Latest from this channel</h2><span>${data().escapeHtml(channel.format)}</span></div><div class="channel-content-grid">${posts.map((title,index) => `<article><a class="channel-content-cover" href="channel-content.html?channel=${encodeURIComponent(channel.id)}&post=${index}" style="background-image:url('${data().escapeHtml(channel.cover)}')" aria-label="Open ${data().escapeHtml(title)}"><span><i data-lucide="${channel.format === "Podcast" ? "headphones" : "play"}"></i></span></a><small>${data().escapeHtml(channel.format)} · ${index + 2} days ago</small><h3><a href="channel-content.html?channel=${encodeURIComponent(channel.id)}&post=${index}">${data().escapeHtml(title)}</a></h3><p>${index === 0 ? "A practical invitation to begin again with grace, truth, and a faithful community." : index === 1 ? "Simple rhythms that keep the Word close in a noisy, demanding week." : "A thoughtful conversation about bringing prayer into ordinary decisions."}</p></article>`).join("")}</div></section>`;
    window.lucide?.createIcons();
  });
})();
