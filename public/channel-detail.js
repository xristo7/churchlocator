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
    const renderDetail = () => {
      const currentChannel = data().getChannels().find(item => item.id === channelId);
      if (!currentChannel) return;
      const posts = Array.isArray(currentChannel.posts) ? currentChannel.posts : [];
      document.title = `${currentChannel.name} | My Way`;
      root.innerHTML = `<article class="channel-detail-hero channel-detail-modern">
      <div class="channel-detail-cover"><img src="${data().escapeHtml(currentChannel.cover)}" alt="${data().escapeHtml(currentChannel.name)} cover" /><span class="channel-cover-type"><i data-lucide="${currentChannel.format === "Podcast" ? "headphones" : "radio"}"></i>${data().escapeHtml(currentChannel.format)} · ${data().escapeHtml(currentChannel.topic)}</span></div>
      <div class="channel-detail-profile"><img src="${data().escapeHtml(currentChannel.avatar)}" alt="${data().escapeHtml(currentChannel.owner)}" /><div class="channel-detail-identity"><h1>${data().escapeHtml(currentChannel.name)} ${currentChannel.verified ? `<i data-lucide="badge-check"></i>` : ""}</h1><p>${data().escapeHtml(currentChannel.handle)} <span>·</span> Created by ${data().escapeHtml(currentChannel.owner)}</p></div><button class="content-love-button content-love-detail" type="button" data-love-type="channel" data-love-id="${data().escapeHtml(currentChannel.id)}" aria-pressed="false"><i data-lucide="heart"></i><span data-love-count>0</span></button><button class="channel-follow-button${currentChannel.isFollowing ? " is-following" : ""}" type="button" data-channel-follow="${data().escapeHtml(currentChannel.id)}" aria-pressed="${currentChannel.isFollowing ? "true" : "false"}">${currentChannel.isFollowing ? "Following" : "Follow"}</button><a href="messages.html?compose=channel&id=${encodeURIComponent(currentChannel.id)}"><i data-lucide="message-circle"></i> Get in touch</a></div>
      <div class="channel-detail-summary"><div class="channel-detail-description"><span>About the channel</span><p>${data().escapeHtml(currentChannel.description)}</p></div><div class="channel-detail-stats"><span><i data-lucide="users"></i><strong>${Number(currentChannel.followers).toLocaleString()}</strong><small>Followers</small></span><span><i data-lucide="${currentChannel.format === "Podcast" ? "mic-2" : "play-square"}"></i><strong>${Number(currentChannel.items).toLocaleString()}</strong><small>${currentChannel.format === "Podcast" ? "Episodes" : "Posts"}</small></span><span><i data-lucide="star"></i><strong>${currentChannel.verified ? "4.9" : "4.7"}</strong><small>Member rating</small></span></div></div>
      <nav class="channel-detail-tabs"><a class="active" href="#latest">Home</a><a href="#latest">Posts</a><a href="#about">About</a></nav>
    </article>
    <section class="channel-content-section" id="latest"><div class="module-results-head"><h2>Latest from this channel</h2><span>${data().escapeHtml(currentChannel.format)}</span></div><div class="channel-content-grid">${posts.length ? posts.map((post,index) => `<article><a class="channel-content-cover" href="${data().escapeHtml(post.url || `channel-content.html?channel=${encodeURIComponent(currentChannel.id)}&post=${index}`)}" style="background-image:url('${data().escapeHtml(currentChannel.cover)}')" aria-label="Open ${data().escapeHtml(post.title)}"><span><i data-lucide="${currentChannel.format === "Podcast" ? "headphones" : "play"}"></i></span></a><small>${data().escapeHtml(currentChannel.format)}</small><h3><a href="${data().escapeHtml(post.url || `channel-content.html?channel=${encodeURIComponent(currentChannel.id)}&post=${index}`)}">${data().escapeHtml(post.title)}</a></h3><p>${data().escapeHtml(post.summary)}</p></article>`).join("") : `<div class="module-empty"><i data-lucide="file-video"></i><strong>No posts published yet.</strong><p>Saved creator channels only show content added by the creator or admin.</p></div>`}</div></section>`;
      root.querySelector("[data-channel-follow]")?.addEventListener("click", event => {
        event.preventDefault();
        const next = data().toggleChannelFollow(currentChannel.id);
        window.MWE?.showMemberToast?.(next ? "Channel followed" : "Channel unfollowed");
        renderDetail();
      });
      window.lucide?.createIcons();
    };
    renderDetail();
  });
})();
