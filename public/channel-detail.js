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
    const channelPosts = Array.isArray(channel.posts) ? channel.posts : [];
    const posts = channelPosts.map(post=>post.title);
    const listedPostCount = Number(channel.items ?? (Array.isArray(channel.posts) ? channel.posts.length : channel.posts)) || 0;
    document.title = `${channel.name} | My Way`;
    const liveStatus=await fetch('/api/live/channels/'+encodeURIComponent(channel.id),{credentials:'same-origin',cache:'no-store'}).then(response=>response.json()).catch(()=>null);
    root.innerHTML = `<article class="channel-detail-hero channel-detail-modern">
      <div class="channel-detail-cover"><img src="${data().escapeHtml(channel.cover)}" alt="${data().escapeHtml(channel.name)} cover" /><span class="channel-cover-type"><i data-lucide="${channel.format === "Podcast" ? "headphones" : "radio"}"></i>${data().escapeHtml(channel.format)} · ${data().escapeHtml(channel.topic)}</span><a class="channel-contact-button" href="messages.html?compose=channel&id=${encodeURIComponent(channel.id)}"><i data-lucide="message-circle"></i> Get in touch</a></div>
      <div class="channel-detail-profile"><img src="${data().escapeHtml(channel.avatar)}" alt="${data().escapeHtml(channel.owner)}" /><div class="channel-detail-identity"><h1>${data().escapeHtml(channel.name)} ${channel.verified ? `<i data-lucide="badge-check"></i>` : ""}</h1><p>${data().escapeHtml(channel.handle)} <span>·</span> Created by ${data().escapeHtml(channel.owner)}</p></div><div class="channel-detail-actions"><div class="channel-follow-controls" aria-live="polite"><span class="channel-follow-loading">Loading follow status…</span></div><button class="content-love-button content-love-detail" type="button" data-love-type="channel" data-love-id="${data().escapeHtml(channel.id)}" aria-pressed="false" aria-label="Like this channel"><i data-lucide="heart"></i><span data-love-count>0</span></button></div></div>
      <div class="channel-detail-summary"><div class="channel-detail-description"><span>About the channel</span><p>${data().escapeHtml(channel.description)}</p></div><div class="channel-detail-stats"><span><i data-lucide="users"></i><strong>${(Number(channel.followers) || 0).toLocaleString()}</strong><small>Followers</small></span><span><i data-lucide="${channel.format === "Podcast" ? "mic-2" : "play-square"}"></i><strong>${listedPostCount.toLocaleString()}</strong><small>${channel.format === "Podcast" ? "Episodes" : "Posts"}</small></span><span><i data-lucide="star"></i><strong>${channel.verified ? "4.9" : "4.7"}</strong><small>Member rating</small></span></div></div>
      <nav class="channel-detail-tabs"><a class="active" href="#latest">Home</a><a href="#latest">Posts</a><a href="#about">About</a></nav>
    </article>
    <section class="channel-content-section" id="latest"><div class="module-results-head"><h2>Latest from this channel</h2><span>${data().escapeHtml(channel.format)}</span></div><div class="channel-content-grid">${posts.map((title,index) => `<article><a class="channel-content-cover" href="channel-content.html?channel=${encodeURIComponent(channel.id)}&post=${index}" style="background-image:url('${data().escapeHtml(channel.cover)}')" aria-label="Open ${data().escapeHtml(title)}"><span><i data-lucide="${channel.format === "Podcast" ? "headphones" : "play"}"></i></span></a><small>${data().escapeHtml(channel.format)} · ${index + 2} days ago</small><h3><a href="channel-content.html?channel=${encodeURIComponent(channel.id)}&post=${index}">${data().escapeHtml(title)}</a></h3><p>${index === 0 ? "A practical invitation to begin again with grace, truth, and a faithful community." : index === 1 ? "Simple rhythms that keep the Word close in a noisy, demanding week." : "A thoughtful conversation about bringing prayer into ordinary decisions."}</p></article>`).join("")}</div></section>`;
    if(liveStatus?.ok){const action=document.createElement('a');action.className='module-primary-action';action.href=liveStatus.session?'channel-live.html?id='+encodeURIComponent(channel.id)+'&session='+encodeURIComponent(liveStatus.session.id):'live-setup.html';action.textContent=liveStatus.session?'Join Live Stage':'Set up Channel Live';if(liveStatus.session||liveStatus.canManage)document.querySelector('.channel-detail-actions').append(action);}
    try {
      const result=await fetch('/api/spotlight/channel/'+encodeURIComponent(channel.id),{credentials:'same-origin',cache:'no-store'}).then(response=>response.json());
      if(!result.ok)throw new Error(result.error);
      const grid=document.querySelector('.channel-content-grid');
      const actualPosts=[...result.items,...channelPosts.map((post,index)=>({id:String(index),title:post.title,caption:post.summary,posterUrl:post.image||channel.cover}))];
      const stats=document.querySelectorAll('.channel-detail-stats strong');stats[0].textContent=(Number(result.followers)||Number(channel.followers)||0).toLocaleString();stats[1].textContent=actualPosts.length||listedPostCount;
      grid.innerHTML=actualPosts.length?actualPosts.map(item=>`<article><a class="channel-content-cover" href="channel-content.html?channel=${encodeURIComponent(channel.id)}&post=${encodeURIComponent(item.id)}"><img src="${data().escapeHtml(item.posterUrl)}" alt="" /><span><i data-lucide="play"></i></span></a><h3><a href="channel-content.html?channel=${encodeURIComponent(channel.id)}&post=${encodeURIComponent(item.id)}">${data().escapeHtml(item.title)}</a></h3><p>${data().escapeHtml(item.caption)}</p></article>`).join(''):'<p>No published content yet.</p>';
      const controls=document.querySelector('.channel-follow-controls');
      let following=result.following;
      function draw(){controls.innerHTML=`<button type="button" data-channel-follow aria-pressed="${following}">${following?'Following':'Follow'}</button>`;controls.querySelector('button').onclick=()=>save(!following);}
      async function save(active){controls.querySelector('button').disabled=true;try{const response=await fetch('/api/spotlight/channel-follow/'+encodeURIComponent(channel.id),{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({active})});const updated=await response.json();if(!response.ok){if(response.status===401)window.MWE?.openMemberLogin?.('app.html?view=channel-detail&id='+encodeURIComponent(channel.id));throw new Error(updated.error);}following=updated.following;}catch(error){window.showToast?.(error.message);}draw();}draw();
    }catch(error){document.querySelector('.channel-content-grid').innerHTML='<p>Channel content is temporarily unavailable.</p>';}
    window.lucide?.createIcons();
  });
})();
