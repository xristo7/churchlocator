(function () {
  'use strict';
  const state = { items:[], visible:[], activeIndex:0, tab:'featured', inspectorTab:'comments', sound:false, comments:new Map(), authenticated:false, inspectorRequest:0, observer:null };
  const feed = document.getElementById('spotlight-feed');
  const inspector = document.getElementById('spotlight-inspector-body');
  const commentForm = document.getElementById('spotlight-comment-form');
  const esc = value => window.MWE?.escapeHtml ? window.MWE.escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => '<i data-lucide="' + name + '"></i>';
  const compact = value => Number(value || 0) >= 1000 ? (Number(value) / 1000).toFixed(Number(value) >= 10000 ? 0 : 1) + 'K' : String(Number(value || 0));
  const duration = seconds => seconds ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0') : '';
  const authenticated = () => state.authenticated;
  function navigate(href) {
    const target=new URL(href,location.href);
    if(window.self!==window.top && target.origin===location.origin && target.pathname.endsWith('/app.html')) {
      window.parent.postMessage({type:'faithlink:navigate',view:target.searchParams.get('view'),id:target.searchParams.get('id')||'',post:target.searchParams.get('post')||''},location.origin);
    } else location.href=target.href;
  }

  async function api(path, body, method = body ? 'POST' : 'GET') {
    const response = await fetch('/api/spotlight/' + path, { method, credentials:'same-origin', cache:'no-store', headers:body?{'content-type':'application/json'}:{}, ...(body?{body:JSON.stringify(body)}:{}) });
    const data = await response.json();
    if (!response.ok || !data.ok) { const error = new Error(data.error || 'Spotlight is unavailable.'); error.status = response.status; throw error; }
    return data;
  }
  function requireSignIn() {
    if (authenticated()) return true;
    window.MWE?.openMemberLogin?.('app.html?view=spotlight&post='+encodeURIComponent(state.visible[state.activeIndex]?.id||''));
    window.showToast?.('Sign in to interact with Spotlight.');
    return false;
  }
  function actionButton(action, iconName, count, label, active) {
    return '<button class="spotlight-action' + (active ? ' is-active' : '') + '" type="button" data-spotlight-action="' + action + '" aria-label="' + label + '" aria-pressed="' + String(!!active) + '">' + icon(iconName) + '<span>' + esc(count) + '</span></button>';
  }
  function renderCard(item, index) {
    const feature = ['church','channel','event'].includes(item.contentType);
    const editorial = item.placementKind === 'sponsored' ? 'Sponsored' : feature ? 'Featured ' + item.contentType[0].toUpperCase() + item.contentType.slice(1) : item.placementKind === 'editorial' ? 'My Way selection' : '';
    const previewLength = item.previewEndSeconds ? item.previewEndSeconds - (item.previewStartSeconds || 0) : 0;
    const progress = item.durationSeconds ? Math.max(8, Math.min(100, ((item.previewEndSeconds || previewLength || 30) / item.durationSeconds) * 100)) : 38;
    const media = item.mediaUrl && /\.(mp4|webm)(?:\?|$)/i.test(item.mediaUrl)
      ? '<video class="spotlight-card-media" playsinline muted preload="metadata" poster="' + esc(item.posterUrl) + '" src="' + esc(item.mediaUrl) + '"></video>'
      : '<img class="spotlight-card-media" data-animated="true" src="' + esc(item.posterUrl) + '" alt="" />';
    const avatar = item.creatorAvatarUrl ? '<img src="' + esc(item.creatorAvatarUrl) + '" alt="" />' : icon(feature ? 'church' : 'user');
    const hasFullContent=/^https:\/\//i.test(item.fullContentUrl||'');
    const cta = hasFullContent ? item.contentUrl : item.channelUrl;
    return '<article tabindex="0" class="spotlight-card' + (feature ? ' spotlight-feature-card' : '') + '" data-spotlight-id="' + esc(item.id) + '" data-index="' + index + '" aria-label="Open channel: ' + esc(item.title) + '">' + media +
      '<div class="spotlight-card-top">' + (editorial ? '<span class="spotlight-editorial-label' + (item.placementKind === 'sponsored' ? ' spotlight-sponsored' : '') + '">' + icon(item.placementKind === 'sponsored' ? 'badge-dollar-sign' : 'sparkles') + esc(editorial) + '</span>' : '<span></span>') + '<button type="button" data-card-menu aria-label="Report this item">' + icon('ellipsis') + '</button></div>' +
      '<div class="spotlight-copy"><div class="spotlight-identity"><span class="spotlight-avatar">' + avatar + '</span><div><strong>' + esc(item.creatorName) + icon('badge-check') + '</strong><span>' + esc(item.creatorHandle) + '</span></div><button type="button" class="spotlight-follow' + (item.following ? ' is-active' : '') + '" data-follow>' + (item.following ? 'Following' : 'Follow') + '</button></div>' +
      '<h2>' + esc(item.title) + '</h2><p>' + esc(item.caption) + '</p>' +
      (feature ? '<div class="spotlight-member-row"><span class="spotlight-member-faces"><span></span><span></span><span></span></span><span>Growing community on My Way</span></div>' : '') +
      '<div class="spotlight-preview-row">' + (cta ? '<a class="spotlight-primary-cta" href="' + esc(cta) + '" data-spotlight-cta>' + icon(hasFullContent ? 'play' : 'arrow-up-right') + esc(hasFullContent?'Watch full video':'Open Channel') + '</a>' : '') + (!feature && item.contentType === 'long-preview' && hasFullContent ? '<span class="spotlight-preview-meta">Preview · ' + duration(item.durationSeconds) + ' full video</span>' : '') + '</div>' +
      (!feature ? '<div class="spotlight-progress" aria-hidden="true"><span style="--progress:' + progress + '%"></span></div>' : '') + '</div>' +
      '<div class="spotlight-actions">' + actionButton('like','heart',compact(item.likes),'Like',item.liked) + actionButton('comments','message-circle',compact(item.comments),'Open comments',false) + actionButton('save','bookmark',compact(item.saves),'Save',item.saved) + actionButton('share','share-2','Share','Share',false) + actionButton('remind','bell','Remind','Remind me to watch',!!item.reminderAt) + '</div></article>';
  }
  function filteredItems() { return state.items; }
  function renderFeed() {
    state.visible = filteredItems();
    state.activeIndex = Math.min(state.activeIndex, Math.max(0,state.visible.length - 1));
    if (!state.visible.length) {
      feed.innerHTML = '<div class="spotlight-empty">' + icon('users') + '<h2>No Spotlight posts here yet.</h2><p>Follow channels or save posts to find them here.</p></div>';
      inspector.innerHTML = '';
      window.lucide?.createIcons();
      return;
    }
    feed.innerHTML = state.visible.map(renderCard).join('');
    bindCards();
    requestAnimationFrame(() => activate(state.activeIndex, state.activeIndex>0));
    window.lucide?.createIcons();
  }
  function bindCards() {
    state.observer?.disconnect();
    const observer = new IntersectionObserver(entries => {
      const entry = entries.filter(item => item.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (entry && entry.intersectionRatio >= .62) activate(Number(entry.target.dataset.index), false);
    }, { root:feed, threshold:[.62,.82] });
    state.observer=observer;
    feed.querySelectorAll('.spotlight-card').forEach(card => observer.observe(card));
  }
  function activate(index, scroll = true) {
    if (!state.visible.length) return;
    state.activeIndex = Math.max(0, Math.min(index, state.visible.length - 1));
    feed.querySelectorAll('.spotlight-card').forEach((card, cardIndex) => {
      const active = cardIndex === state.activeIndex;
      card.classList.toggle('is-active', active);
      const video = card.querySelector('video');
      if (video) { video.muted = !state.sound; if (active) video.play().catch(()=>{}); else video.pause(); }
    });
    if (scroll) feed.children[state.activeIndex]?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
    renderInspector();
  }
  async function loadComments(item) {
    const result = await api('comments/' + encodeURIComponent(item.id));
    state.comments.set(item.id,result.comments);
    return state.comments.get(item.id);
  }
  async function renderInspector() {
    const request=++state.inspectorRequest;
    const item = state.visible[state.activeIndex];
    if (!item) return;
    commentForm.hidden=state.inspectorTab!=='comments';
    if(state.inspectorTab==='reminder') {
      inspector.innerHTML='<h3>Remind me to watch</h3><p>Receive an in-app notification at your chosen time.</p><form id="spotlight-reminder-form"><label>Local date and time<input type="datetime-local" name="dueAt" required /></label><button type="submit">Save reminder</button></form>'+(item.reminderAt?'<p>Scheduled: '+esc(new Date(item.reminderAt).toLocaleString())+'</p><button type="button" id="spotlight-reminder-cancel">Cancel reminder</button>':'');
      inspector.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!requireSignIn())return;const value=event.currentTarget.elements.dueAt.value;try{const result=await api('reminders/'+encodeURIComponent(item.id),{dueAt:new Date(value).toISOString()},'PUT');item.reminderAt=result.dueAt;window.showToast?.('Reminder saved.');renderInspector();}catch(error){window.showToast?.(error.message);}};
      inspector.querySelector('#spotlight-reminder-cancel')?.addEventListener('click',async()=>{try{await api('reminders/'+encodeURIComponent(item.id),null,'DELETE');item.reminderAt=null;renderInspector();window.showToast?.('Reminder cancelled.');}catch(error){window.showToast?.(error.message);}});
      return;
    }
    commentForm.querySelector('input').disabled=!item.commentsEnabled;
    commentForm.querySelector('button').disabled=!item.commentsEnabled;
    if (state.inspectorTab === 'details') {
      inspector.innerHTML = '<div class="spotlight-detail-card"><span class="spotlight-eyebrow">' + esc(item.placementKind === 'sponsored' ? 'SPONSORED' : 'CURATED SPOTLIGHT') + '</span><h3>' + esc(item.title) + '</h3><p>' + esc(item.caption) + '</p><div class="spotlight-detail-list"><span>Creator <strong>' + esc(item.creatorName) + '</strong></span><span>Format <strong>' + esc(item.contentType.replace('-', ' ')) + '</strong></span><span>Preview <strong>' + esc(item.previewSource === 'automatic' ? 'Automatic selection' : 'Creator selected') + '</strong></span></div></div>';
      window.lucide?.createIcons(); return;
    }
    inspector.innerHTML = '<div class="spotlight-loading">' + icon('loader-circle') + '<span>Loading conversation…</span></div>';
    window.lucide?.createIcons();
    let rows;
    try { rows = await loadComments(item); }
    catch (error) { if(request!==state.inspectorRequest)return; inspector.innerHTML = '<div class="spotlight-comment-empty">' + icon('wifi-off') + '<strong>Comments are unavailable.</strong><p>' + esc(error.message) + '</p></div>'; window.lucide?.createIcons(); return; }
    if(request!==state.inspectorRequest)return;
    if (!rows.length) inspector.innerHTML = '<div class="spotlight-comment-empty">' + icon('message-circle') + '<strong>Begin an encouraging conversation.</strong><p>Comments are reviewed under the My Way community standards.</p></div>';
    else inspector.innerHTML = rows.map(row => '<article class="spotlight-comment"><span class="spotlight-comment-avatar">' + icon('user') + '</span><div><strong>' + esc(row.author) + '</strong><p>' + esc(row.body) + '</p><small>' + new Date(row.createdAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) + '</small></div></article>').join('');
    window.lucide?.createIcons();
  }
  async function engage(item, action, button) {
    if (!requireSignIn()) return;
    if(button.disabled)return;button.disabled=true;
    try { const result=await api('engagement/' + encodeURIComponent(item.id), {action,active:!(action==='like'?item.liked:item.saved)}); Object.assign(item,result.item); syncCard(item); }
    catch (error) { if(error.status===401)state.authenticated=false; window.showToast?.(error.message); }
    finally{button.disabled=false;}
  }
  function syncCard(item) {
    const card=[...feed.querySelectorAll('[data-spotlight-id]')].find(card=>card.dataset.spotlightId===item.id);if(!card)return;
    for(const [action,key,active] of [['like','likes',item.liked],['save','saves',item.saved],['comments','comments',false]]) {const button=card.querySelector('[data-spotlight-action="'+action+'"]');button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));button.querySelector('span').textContent=compact(item[key]);}
  }
  feed.addEventListener('click', async event => {
    const card = event.target.closest('.spotlight-card'); if (!card) return;
    const item = state.visible[Number(card.dataset.index)];
    const actionButton = event.target.closest('[data-spotlight-action]');
    const follow = event.target.closest('[data-follow]');
    const menu = event.target.closest('[data-card-menu]');
    const cta = event.target.closest('[data-spotlight-cta]');
    if (cta) {event.preventDefault();navigate(cta.href);return;}
    if (actionButton) {
      const action = actionButton.dataset.spotlightAction;
      if (action === 'comments' || action==='remind') {state.inspectorTab=action==='remind'?'reminder':'comments';activate(Number(card.dataset.index),false);document.body.classList.add('spotlight-panel-open');syncInspectorTabs();return;}
      if (action === 'share') { const share={title:item.title,text:item.caption,url:new URL(item.permalink,location.href).href};if(navigator.share){try{await navigator.share(share);return;}catch(error){if(error.name==='AbortError')return;}}try{if(!navigator.clipboard)throw new Error('Copy unavailable');await navigator.clipboard.writeText(share.url);window.showToast?.('Spotlight link copied.');}catch{window.prompt('Copy this Spotlight link:',share.url);}return;}
      await engage(item,action,actionButton); return;
    }
    if (follow) {
      if (!requireSignIn()) return;
      if(follow.disabled)return;follow.disabled=true;
      try {const result=await api('engagement/'+encodeURIComponent(item.id),{action:'follow',active:!item.following});state.items.filter(row=>row.channelEntityId===item.channelEntityId).forEach(row=>row.following=result.active);renderFeed();}catch(error){window.showToast?.(error.message);}finally{follow.disabled=false;}
      return;
    }
    if (menu) { if (requireSignIn()) { try { await api('engagement/'+encodeURIComponent(item.id),{action:'report'}); window.showToast?.('Thanks. This item was sent for review.'); } catch(error){ window.showToast?.(error.message); } } return; }
    if (!event.target.closest('a,button')) navigate(item.channelUrl || item.contentUrl);
  });
  function syncInspectorTabs() { document.querySelectorAll('[data-inspector-tab]').forEach(button => button.classList.toggle('active',button.dataset.inspectorTab===state.inspectorTab)); }
  document.querySelectorAll('[data-inspector-tab]').forEach(button => button.addEventListener('click',()=>{state.inspectorTab=button.dataset.inspectorTab;syncInspectorTabs();renderInspector();}));
  document.querySelector('[data-inspector-close]')?.addEventListener('click',()=>document.body.classList.remove('spotlight-panel-open'));
  document.querySelector('[data-feed-previous]')?.addEventListener('click',()=>activate(state.activeIndex-1));
  document.querySelector('[data-feed-next]')?.addEventListener('click',()=>activate(state.activeIndex+1));
  let feedRequest=0;
  async function loadFeed(tab='featured',cursor=null) {
    if(tab!=='featured' && !requireSignIn())return;
    const request=++feedRequest;
    state.tab=tab;state.inspectorRequest++;document.querySelectorAll('[data-feed-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.feedTab===tab)));
    try {
      if(tab==='notifications') {
        const result=await api('notifications');if(request!==feedRequest)return;state.visible=[];state.items=[];inspector.innerHTML='';commentForm.hidden=true;
        feed.innerHTML='<section class="spotlight-notifications"><h2>Notifications</h2>'+ (result.notifications.length?result.notifications.map(row=>'<article><a href="'+esc(row.url)+'" data-notification-id="'+esc(row.id)+'">'+esc(row.read?'':'● ')+esc(row.kind==='live'?'Channel is live: ':row.kind==='reminder'?'Time to watch: ':'New Spotlight: ')+esc(row.title)+'</a><small>'+esc(new Date(row.createdAt).toLocaleString())+'</small></article>').join(''):'<p>No notifications yet. Follow a channel to hear about its new Spotlight posts.</p>')+'</section>';
        feed.querySelectorAll('[data-notification-id]').forEach(link=>link.onclick=async event=>{event.preventDefault();try{await api('notifications/'+encodeURIComponent(link.dataset.notificationId),{},'PUT');navigate(link.href);}catch(error){window.showToast?.(error.message);}});return;
      }
      const result=await api(tab==='featured'?'feed':tab+(cursor?'?cursor='+encodeURIComponent(cursor):''));if(request!==feedRequest)return;
      state.items=cursor?[...state.items,...result.items]:result.items;
      const post=new URLSearchParams(location.search).get('post')||location.hash.slice(1);
      if(post && !cursor && tab==='featured' && !state.items.some(item=>item.id===post)){try{state.items.unshift((await api('item/'+encodeURIComponent(post))).item);}catch(error){window.showToast?.(error.message);}}
      if(request!==feedRequest)return;state.activeIndex=Math.max(0,state.items.findIndex(item=>item.id===post));renderFeed();commentForm.hidden=!state.visible.length;
      if(result.nextCursor){const more=document.createElement('button');more.type='button';more.textContent='Load more posts';more.onclick=()=>loadFeed(tab,result.nextCursor);feed.append(more);}
    }catch(error){if(request===feedRequest){feed.innerHTML='<div class="spotlight-empty"><h2>Spotlight is unavailable.</h2><p>'+esc(error.message)+'</p></div>';window.showToast?.(error.message);}}
  }
  document.querySelectorAll('[data-feed-tab]').forEach(button=>button.addEventListener('click',()=>loadFeed(button.dataset.feedTab)));
  document.querySelector('[data-sound-toggle]')?.addEventListener('click',event=>{state.sound=!state.sound;event.currentTarget.innerHTML=icon(state.sound?'volume-2':'volume-x');event.currentTarget.setAttribute('aria-label',state.sound?'Mute':'Turn sound on');feed.querySelectorAll('video').forEach(video=>video.muted=!state.sound);window.lucide?.createIcons();});
  const about=document.getElementById('spotlight-about');
  document.querySelector('[data-feed-info]')?.addEventListener('click',()=>about?.showModal());
  document.querySelector('[data-about-close]')?.addEventListener('click',()=>about?.close());
  document.querySelector('[data-spotlight-back]')?.addEventListener('click',event=>{if(window.self!==window.top){event.preventDefault();window.parent.postMessage({type:'faithlink:navigate',view:'home'},window.location.origin);}});
  commentForm?.addEventListener('submit',async event=>{event.preventDefault();if(!requireSignIn())return;const input=document.getElementById('spotlight-comment-input');const body=input.value.trim();const item=state.visible[state.activeIndex];if(!body||!item||!item.commentsEnabled)return;const button=commentForm.querySelector('button');if(button.disabled)return;button.disabled=true;try{const result=await api('engagement/'+encodeURIComponent(item.id),{action:'comment',body});Object.assign(item,result.item);syncCard(item);if(state.visible[state.activeIndex]?.id===item.id){input.value='';renderInspector();}window.showToast?.('Your comment is live.');}catch(error){window.showToast?.(error.message);}finally{button.disabled=false;}});
  feed.addEventListener('keydown',event=>{if(event.target.matches('.spotlight-card')&&['Enter',' '].includes(event.key)){event.preventDefault();const item=state.visible[Number(event.target.dataset.index)];navigate(item.channelUrl||item.contentUrl);}});
  document.addEventListener('keydown',event=>{if(event.target.matches('input,textarea'))return;if(event.key==='ArrowDown'){event.preventDefault();activate(state.activeIndex+1);}if(event.key==='ArrowUp'){event.preventDefault();activate(state.activeIndex-1);}if(event.key.toLowerCase()==='m')document.querySelector('[data-sound-toggle]')?.click();if(event.key==='Escape')document.body.classList.remove('spotlight-panel-open');});
  function syncFullscreen() { if(window.self!==window.top) window.parent.postMessage({type:'mwe-fullscreen',fullscreen:matchMedia('(max-width:760px)').matches},window.location.origin); }
  window.addEventListener('resize',syncFullscreen); window.addEventListener('pagehide',()=>{if(window.self!==window.top)window.parent.postMessage({type:'mwe-fullscreen',fullscreen:false},window.location.origin);}); syncFullscreen();
  (async function init(){feed.innerHTML='<div class="spotlight-loading">'+icon('sparkles')+'<span>Curating Spotlight…</span></div>';window.lucide?.createIcons();try{const session=await (await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'})).json();state.authenticated=!!session.user;}catch{}await loadFeed();if(state.authenticated){const update=async()=>{try{const result=await api('notifications');const unread=result.notifications.filter(row=>!row.read).length;document.querySelector('[data-feed-tab="notifications"]').textContent='Notifications'+(unread?' ('+unread+')':'');}catch{}};await update();const timer=setInterval(update,60000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});}})();
})();
