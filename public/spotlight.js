(function () {
  'use strict';
  const fallbackItems = [
    { id:'spotlight-grace-story', contentType:'long-preview', title:'A new beginning in faith', caption:'Grace shares how one faithful conversation helped her begin again.', creatorName:'Grace Stories', creatorHandle:'@gracestories', posterUrl:'assets/spotlight/grace-testimony.webp', fullContentUrl:'app.html?view=channels', previewSource:'creator', previewStartSeconds:42, previewEndSeconds:87, durationSeconds:1920, ctaLabel:'Watch full video', ctaUrl:'app.html?view=channels', placementKind:'editorial', likes:2400, comments:320, saves:128, commentsEnabled:true },
    { id:'spotlight-marcus-word', contentType:'short', title:'Faith moves when we step out', caption:'Pastor Marcus shares what God taught him in the waiting.', creatorName:'Pastor Marcus Hale', creatorHandle:'@marcushale', posterUrl:'assets/spotlight/pastor-marcus.webp', previewSource:'automatic', previewStartSeconds:0, previewEndSeconds:60, durationSeconds:80, ctaLabel:'Open Channel', ctaUrl:'app.html?view=channels', placementKind:'organic', likes:912, comments:84, saves:147, commentsEnabled:true },
    { id:'spotlight-river-city', contentType:'church', title:'River City Fellowship', caption:'A welcoming church for real people, real faith and a brighter tomorrow.', creatorName:'River City Fellowship', creatorHandle:'@rivercity', posterUrl:'assets/spotlight/river-city-fellowship.webp', ctaLabel:'View Church', ctaUrl:'app.html?view=directory', placementKind:'editorial', likes:340, comments:41, saves:93, commentsEnabled:true }
  ];
  const fallbackComments = [
    { id:'demo-1', author:'Tasha M.', body:'This spoke right to my season. 🙏', createdAt:'2026-09-16T08:00:00Z' },
    { id:'demo-2', author:'Daniel K.', body:'Faith really does make a way.', createdAt:'2026-09-16T07:00:00Z' },
    { id:'demo-3', author:'Alicia R.', body:'Needed this today. Thank you!', createdAt:'2026-09-16T06:00:00Z' }
  ];
  const savedFollowing = (() => { try { return JSON.parse(localStorage.getItem('mwe.spotlight.following.v1') || '[]'); } catch { return []; } })();
  const state = { items:[], visible:[], activeIndex:0, tab:'featured', inspectorTab:'comments', sound:false, comments:new Map(), following:new Set(savedFollowing) };
  const feed = document.getElementById('spotlight-feed');
  const inspector = document.getElementById('spotlight-inspector-body');
  const commentForm = document.getElementById('spotlight-comment-form');
  const esc = value => window.MWE?.escapeHtml ? window.MWE.escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => '<i data-lucide="' + name + '"></i>';
  const compact = value => Number(value || 0) >= 1000 ? (Number(value) / 1000).toFixed(Number(value) >= 10000 ? 0 : 1) + 'K' : String(Number(value || 0));
  const duration = seconds => seconds ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2,'0') : '';
  const authenticated = () => localStorage.getItem('mwe.userLoggedIn') === 'true';

  async function api(path, body, method = body ? 'POST' : 'GET') {
    const response = await fetch('/api/spotlight/' + path, { method, credentials:'same-origin', cache:'no-store', headers:body?{'content-type':'application/json'}:{}, ...(body?{body:JSON.stringify(body)}:{}) });
    const data = await response.json();
    if (!response.ok || !data.ok) { const error = new Error(data.error || 'Spotlight is unavailable.'); error.status = response.status; throw error; }
    return data;
  }
  function requireSignIn() {
    if (authenticated()) return true;
    window.MWE?.openMemberLogin?.('app.html?view=spotlight');
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
    const cta = item.ctaUrl || item.fullContentUrl;
    return '<article class="spotlight-card' + (feature ? ' spotlight-feature-card' : '') + '" data-spotlight-id="' + esc(item.id) + '" data-index="' + index + '" aria-label="' + esc(item.title) + '">' + media +
      '<div class="spotlight-card-top">' + (editorial ? '<span class="spotlight-editorial-label' + (item.placementKind === 'sponsored' ? ' spotlight-sponsored' : '') + '">' + icon(item.placementKind === 'sponsored' ? 'badge-dollar-sign' : 'sparkles') + esc(editorial) + '</span>' : '<span></span>') + '<button type="button" data-card-menu aria-label="Report this item">' + icon('ellipsis') + '</button></div>' +
      '<div class="spotlight-copy"><div class="spotlight-identity"><span class="spotlight-avatar">' + avatar + '</span><div><strong>' + esc(item.creatorName) + icon('badge-check') + '</strong><span>' + esc(item.creatorHandle) + '</span></div>' + (!feature ? '<button type="button" class="spotlight-follow' + (state.following.has(item.creatorHandle) ? ' is-active' : '') + '" data-follow>' + (state.following.has(item.creatorHandle) ? 'Following' : 'Follow') + '</button>' : '') + '</div>' +
      '<h2>' + esc(item.title) + '</h2><p>' + esc(item.caption) + '</p>' +
      (feature ? '<div class="spotlight-member-row"><span class="spotlight-member-faces"><span></span><span></span><span></span></span><span>Growing community on My Way</span></div>' : '') +
      '<div class="spotlight-preview-row">' + (cta ? '<a class="spotlight-primary-cta" href="' + esc(cta) + '" data-spotlight-cta>' + icon(feature ? 'arrow-up-right' : 'play') + esc(item.ctaLabel || (item.contentType === 'long-preview' ? 'Watch full video' : 'Open')) + '</a>' : '') + (!feature && item.contentType === 'long-preview' ? '<span class="spotlight-preview-meta">Preview · ' + duration(item.durationSeconds) + ' full video</span>' : '') + '</div>' +
      (!feature ? '<div class="spotlight-progress" aria-hidden="true"><span style="--progress:' + progress + '%"></span></div>' : '') + '</div>' +
      (!feature ? '<div class="spotlight-actions">' + actionButton('like','heart',compact(item.likes),'Like',item.liked) + actionButton('comments','message-circle',compact(item.comments),'Open comments',false) + actionButton('save','bookmark',compact(item.saves),'Save',item.saved) + actionButton('share','share-2','Share','Share',false) + '</div>' : '') + '</article>';
  }
  function filteredItems() { return state.tab === 'following' ? state.items.filter(item => state.following.has(item.creatorHandle)) : state.items; }
  function renderFeed() {
    state.visible = filteredItems();
    state.activeIndex = Math.min(state.activeIndex, Math.max(0,state.visible.length - 1));
    if (!state.visible.length) {
      feed.innerHTML = '<div class="spotlight-empty">' + icon('users') + '<h2>Your following feed is ready for its first story.</h2><p>Follow a creator in Featured and their approved Spotlight content will appear here.</p></div>';
      inspector.innerHTML = '';
      window.lucide?.createIcons();
      return;
    }
    feed.innerHTML = state.visible.map(renderCard).join('');
    bindCards();
    requestAnimationFrame(() => activate(state.activeIndex, false));
    window.lucide?.createIcons();
  }
  function bindCards() {
    const observer = new IntersectionObserver(entries => {
      const entry = entries.filter(item => item.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (entry && entry.intersectionRatio >= .62) activate(Number(entry.target.dataset.index), false);
    }, { root:feed, threshold:[.62,.82] });
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
    if (state.comments.has(item.id)) return state.comments.get(item.id);
    try { const result = await api('comments/' + encodeURIComponent(item.id)); state.comments.set(item.id,result.comments); }
    catch { state.comments.set(item.id,fallbackComments); }
    return state.comments.get(item.id);
  }
  async function renderInspector() {
    const item = state.visible[state.activeIndex];
    if (!item) return;
    if (state.inspectorTab === 'details') {
      inspector.innerHTML = '<div class="spotlight-detail-card"><span class="spotlight-eyebrow">' + esc(item.placementKind === 'sponsored' ? 'SPONSORED' : 'CURATED SPOTLIGHT') + '</span><h3>' + esc(item.title) + '</h3><p>' + esc(item.caption) + '</p><div class="spotlight-detail-list"><span>Creator <strong>' + esc(item.creatorName) + '</strong></span><span>Format <strong>' + esc(item.contentType.replace('-', ' ')) + '</strong></span><span>Preview <strong>' + esc(item.previewSource === 'automatic' ? 'Automatic selection' : 'Creator selected') + '</strong></span></div></div>';
      window.lucide?.createIcons(); return;
    }
    inspector.innerHTML = '<div class="spotlight-loading">' + icon('loader-circle') + '<span>Loading conversation…</span></div>';
    window.lucide?.createIcons();
    const rows = await loadComments(item);
    if (!rows.length) inspector.innerHTML = '<div class="spotlight-comment-empty">' + icon('message-circle') + '<strong>Begin an encouraging conversation.</strong><p>Comments are reviewed under the My Way community standards.</p></div>';
    else inspector.innerHTML = rows.map(row => '<article class="spotlight-comment"><span class="spotlight-comment-avatar">' + icon('user') + '</span><div><strong>' + esc(row.author) + '</strong><p>' + esc(row.body) + '</p><small>' + new Date(row.createdAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) + '</small></div></article>').join('');
    window.lucide?.createIcons();
  }
  async function engage(item, action, button) {
    if (!requireSignIn()) return;
    const active = button.classList.toggle('is-active');
    button.setAttribute('aria-pressed', String(active));
    const key = action === 'like' ? 'likes' : 'saves';
    item[key] = Math.max(0, Number(item[key] || 0) + (active ? 1 : -1));
    const span = button.querySelector('span'); if (span) span.textContent = compact(item[key]);
    try { await api('engagement/' + encodeURIComponent(item.id), {action}); }
    catch (error) { button.classList.toggle('is-active', !active); window.showToast?.(error.message); }
  }
  feed.addEventListener('click', async event => {
    const card = event.target.closest('.spotlight-card'); if (!card) return;
    const item = state.visible[Number(card.dataset.index)];
    const actionButton = event.target.closest('[data-spotlight-action]');
    const follow = event.target.closest('[data-follow]');
    const menu = event.target.closest('[data-card-menu]');
    const cta = event.target.closest('[data-spotlight-cta]');
    if (cta && window.self !== window.top) {
      const target = new URL(cta.href, window.location.href);
      if (target.origin === window.location.origin && target.pathname.endsWith('/app.html')) {
        event.preventDefault();
        window.parent.postMessage({type:'faithlink:navigate',view:target.searchParams.get('view') || 'home'},window.location.origin);
        return;
      }
    }
    if (actionButton) {
      const action = actionButton.dataset.spotlightAction;
      if (action === 'comments') { document.body.classList.add('spotlight-panel-open'); state.inspectorTab='comments'; syncInspectorTabs(); renderInspector(); return; }
      if (action === 'share') { const share={title:item.title,text:item.caption,url:location.href.split('#')[0]+'#'+item.id}; if(navigator.share) await navigator.share(share).catch(()=>{}); else { await navigator.clipboard?.writeText(share.url); window.showToast?.('Spotlight link copied.'); } return; }
      await engage(item,action,actionButton); return;
    }
    if (follow) {
      if (!requireSignIn()) return;
      const wasFollowing = state.following.has(item.creatorHandle);
      if (wasFollowing) state.following.delete(item.creatorHandle); else state.following.add(item.creatorHandle);
      localStorage.setItem('mwe.spotlight.following.v1',JSON.stringify([...state.following]));
      follow.classList.toggle('is-active',!wasFollowing); follow.textContent = wasFollowing ? 'Follow' : 'Following';
      try { await api('engagement/'+encodeURIComponent(item.id),{action:'follow'}); } catch {}
      return;
    }
    if (menu) { if (requireSignIn()) { try { await api('engagement/'+encodeURIComponent(item.id),{action:'report'}); window.showToast?.('Thanks. This item was sent for review.'); } catch(error){ window.showToast?.(error.message); } } return; }
    if (!event.target.closest('a,button')) { const video=card.querySelector('video'); if(video) video.paused?video.play():video.pause(); }
  });
  function syncInspectorTabs() { document.querySelectorAll('[data-inspector-tab]').forEach(button => button.classList.toggle('active',button.dataset.inspectorTab===state.inspectorTab)); }
  document.querySelectorAll('[data-inspector-tab]').forEach(button => button.addEventListener('click',()=>{state.inspectorTab=button.dataset.inspectorTab;syncInspectorTabs();renderInspector();}));
  document.querySelector('[data-inspector-close]')?.addEventListener('click',()=>document.body.classList.remove('spotlight-panel-open'));
  document.querySelector('[data-feed-previous]')?.addEventListener('click',()=>activate(state.activeIndex-1));
  document.querySelector('[data-feed-next]')?.addEventListener('click',()=>activate(state.activeIndex+1));
  document.querySelectorAll('[data-feed-tab]').forEach(button => button.addEventListener('click',()=>{state.tab=button.dataset.feedTab;state.activeIndex=0;document.querySelectorAll('[data-feed-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===button)));renderFeed();}));
  document.querySelector('[data-sound-toggle]')?.addEventListener('click',event=>{state.sound=!state.sound;event.currentTarget.innerHTML=icon(state.sound?'volume-2':'volume-x');event.currentTarget.setAttribute('aria-label',state.sound?'Mute':'Turn sound on');feed.querySelectorAll('video').forEach(video=>video.muted=!state.sound);window.lucide?.createIcons();});
  const about=document.getElementById('spotlight-about');
  document.querySelector('[data-feed-info]')?.addEventListener('click',()=>about?.showModal());
  document.querySelector('[data-about-close]')?.addEventListener('click',()=>about?.close());
  document.querySelector('[data-spotlight-back]')?.addEventListener('click',event=>{if(window.self!==window.top){event.preventDefault();window.parent.postMessage({type:'faithlink:navigate',view:'home'},window.location.origin);}});
  commentForm?.addEventListener('submit',async event=>{event.preventDefault();if(!requireSignIn())return;const input=document.getElementById('spotlight-comment-input');const body=input.value.trim();if(!body)return;const item=state.visible[state.activeIndex];try{const result=await api('engagement/'+encodeURIComponent(item.id),{action:'comment',body});const list=state.comments.get(item.id)||[];list.unshift(result.comment);state.comments.set(item.id,list);item.comments=Number(item.comments||0)+1;input.value='';renderInspector();window.showToast?.('Your comment is live.');}catch(error){window.showToast?.(error.message);}});
  document.addEventListener('keydown',event=>{if(event.target.matches('input,textarea'))return;if(event.key==='ArrowDown'){event.preventDefault();activate(state.activeIndex+1);}if(event.key==='ArrowUp'){event.preventDefault();activate(state.activeIndex-1);}if(event.key.toLowerCase()==='m')document.querySelector('[data-sound-toggle]')?.click();if(event.key==='Escape')document.body.classList.remove('spotlight-panel-open');});
  function syncFullscreen() { if(window.self!==window.top) window.parent.postMessage({type:'mwe-fullscreen',fullscreen:matchMedia('(max-width:760px)').matches},window.location.origin); }
  window.addEventListener('resize',syncFullscreen); window.addEventListener('pagehide',()=>{if(window.self!==window.top)window.parent.postMessage({type:'mwe-fullscreen',fullscreen:false},window.location.origin);}); syncFullscreen();
  (async function init(){feed.innerHTML='<div class="spotlight-loading">'+icon('sparkles')+'<span>Curating Spotlight…</span></div>';window.lucide?.createIcons();try{state.items=(await api('feed')).items;if(!state.items.length)state.items=fallbackItems;}catch{state.items=fallbackItems;}const match=state.items.findIndex(item=>item.id===location.hash.slice(1));if(match>=0)state.activeIndex=match;renderFeed();})();
})();
