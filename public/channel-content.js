(function () {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function get(path) {const response=await fetch('/api/spotlight/'+path,{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'Content is unavailable.');return result;}
  function playback(url,title) {
    let target;try{target=new URL(url);}catch{return '<p>The full video has not been supplied yet.</p>';}
    if(target.protocol!=='https:')return '<p>The full video is unavailable.</p>';
    const host=target.hostname.toLowerCase();
    const youtube=['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)?target.searchParams.get('v')||target.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1]:host==='youtu.be'?target.pathname.slice(1):null;
    if(youtube && /^[\w-]{11}$/.test(youtube))return '<iframe src="https://www.youtube.com/embed/'+youtube+'?rel=0" title="'+esc(title)+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    if(/\.(mp4|webm)(?:\?|$)/i.test(target.href))return '<video controls playsinline preload="metadata" src="'+esc(target.href)+'"></video>';
    if(/\.(mp3|m4a|ogg)(?:\?|$)/i.test(target.href))return '<audio controls preload="metadata" src="'+esc(target.href)+'"></audio>';
    return '<a class="module-primary-action" href="'+esc(target.href)+'" target="_blank" rel="noopener">Watch full content</a>';
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    const params=new URLSearchParams(location.search),root=document.getElementById('channel-content-detail');
    try {
      const requested=params.get('post');
      let item;
      if(requested && !/^\d+$/.test(requested))item=(await get('item/'+encodeURIComponent(requested))).item;
      else {
        await window.MWEPlatform?.ready;
        const channel=window.FaithLinkModules?.getChannels().find(row=>row.id===params.get('channel'));
        const post=channel?.posts?.[Number(requested||0)];
        if(post)item={title:post.title,caption:post.summary||post.body,creatorName:channel.name,channelEntityId:channel.id,channelUrl:'app.html?view=channel-detail&id='+encodeURIComponent(channel.id),fullContentUrl:post.embedUrl||post.audioSrc||post.sourceUrl,body:post.body};
        else item=(await get('channel/'+encodeURIComponent(params.get('channel')||''))).items[0];
      }
      if(!item)throw new Error('This channel has no published content yet.');
      if(params.get('channel') && item.channelEntityId!==params.get('channel'))throw new Error('This post belongs to a different channel.');
      document.title=item.title+' | '+item.creatorName;
      const channelUrl=item.channelUrl||'app.html?view=channels';document.getElementById('channel-content-back').href=channelUrl;
      const viewClass=/\.(mp3|m4a|ogg)(?:\?|$)/i.test(item.fullContentUrl||'')?'channel-audio-view':item.body&&!item.fullContentUrl?'channel-article-view':'channel-video-view';
      const poster=item.posterUrl||item.imageUrl||item.thumbnailUrl||'';
      const media=item.fullContentUrl?'<div class="channel-post-media channel-post-player"><div class="channel-video-player">'+playback(item.fullContentUrl,item.title)+'</div></div>':poster?'<div class="channel-post-media"><img class="channel-post-poster" src="'+esc(poster)+'" alt="" /><span class="channel-post-media-label">'+esc(item.format||'Channel post')+'</span></div>':'';
      root.innerHTML='<div class="channel-content-layout"><article class="channel-post-view '+viewClass+'">'+media+'<div class="channel-post-copy"><span class="channel-post-kicker">'+esc(item.format||'Channel post')+'</span><h1>'+esc(item.title)+'</h1><p class="channel-post-lead">'+esc(item.caption)+'</p><div class="channel-post-author"><div><strong>Posted by '+esc(item.creatorName)+'</strong><span>From this channel</span></div><a href="'+esc(channelUrl)+'">Open Channel</a></div><div class="channel-post-actions">'+(item.permalink?'<a class="module-primary-action" href="'+esc(item.permalink)+'">Open in Spotlight</a>':'')+'</div>'+(item.body&&!item.fullContentUrl?'<section class="channel-episode-about"><h2>Notes</h2><p>'+esc(item.body)+'</p></section>':'')+'</div></article></div>';
      if(item.permalink)root.querySelector('.channel-content-layout').classList.add('has-engagement');
      root.querySelectorAll('.channel-post-poster').forEach(image=>image.addEventListener('error',()=>{image.hidden=true;},{once:true}));
      if(item.permalink) {
        const section=document.createElement('aside');section.className='channel-post-engagement';section.setAttribute('aria-label','Post engagement and comments');section.innerHTML='<div class="channel-post-engagement-heading"><span>Community</span><h2>Join the conversation</h2><p>Share a thoughtful response with this channel community.</p></div><div class="channel-post-engagement-actions"><button type="button" data-post-action="like"><i data-lucide="heart"></i><span></span></button><button type="button" data-post-action="save"><i data-lucide="bookmark"></i><span></span></button><button type="button" data-post-action="share"><i data-lucide="share-2"></i><span>Share</span></button></div><div class="channel-post-comments" data-post-comments></div><form><label for="channel-post-comment">Add a comment</label><div class="channel-post-comment-compose"><input id="channel-post-comment" name="comment" maxlength="600" placeholder="Write your comment…" required /><button type="submit">Post comment</button></div></form>';root.querySelector('.channel-content-layout').append(section);window.lucide?.createIcons();
        const update=()=>{for(const [action,label,count,active] of [['like','Like',item.likes,item.liked],['save','Save',item.saves,item.saved]]){const button=section.querySelector('[data-post-action="'+action+'"][type="button"]');button.querySelector('span').textContent=(active?(action==='like'?'Liked':'Saved'):label)+' · '+Number(count||0);button.setAttribute('aria-pressed',String(active));}};update();
        async function comments(){try{const result=await get('comments/'+encodeURIComponent(item.id));section.querySelector('[data-post-comments]').innerHTML=result.comments.map(comment=>'<article><strong>'+esc(comment.author)+'</strong><p>'+esc(comment.body)+'</p></article>').join('')||'<p>Be the first to comment.</p>';}catch(error){section.querySelector('[data-post-comments]').textContent=error.message;}}await comments();
        async function engage(body){const response=await fetch('/api/spotlight/engagement/'+encodeURIComponent(item.id),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok){if(response.status===401)window.MWE?.openMemberLogin?.(item.contentUrl);throw new Error(result.error);}Object.assign(item,result.item);update();return result;}
        section.querySelectorAll('[data-post-action]').forEach(button=>button.onclick=async()=>{if(button.disabled)return;const action=button.dataset.postAction;button.disabled=true;try{if(action==='share'){const share={title:item.title,url:new URL(item.permalink,location.href).href};if(navigator.share){try{await navigator.share(share);return;}catch(error){if(error.name==='AbortError')return;}}try{await navigator.clipboard.writeText(share.url);window.showToast?.('Link copied.');}catch{window.prompt('Copy this link:',share.url);}}else await engage({action,active:!(action==='like'?item.liked:item.saved)});}catch(error){window.showToast?.(error.message);}finally{button.disabled=false;}});
        const form=section.querySelector('form');form.hidden=!item.commentsEnabled;form.onsubmit=async event=>{event.preventDefault();const body=form.elements.comment.value.trim();if(!body)return;const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;try{await engage({action:'comment',body});form.reset();await comments();}catch(error){window.showToast?.(error.message);}finally{button.disabled=false;}};
      }
    }catch(error){root.innerHTML='<div class="module-empty"><strong>'+esc(error.message)+'</strong><a href="channels.html">Return to Channels</a></div>';}
  });
})();
