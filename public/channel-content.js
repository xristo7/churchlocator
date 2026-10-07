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
      root.innerHTML='<article class="'+viewClass+'">'+(item.fullContentUrl?'<div class="channel-video-player">'+playback(item.fullContentUrl,item.title)+'</div>':'')+'<div class="channel-video-copy"><h1>'+esc(item.title)+'</h1><p>'+esc(item.caption)+'</p><p>Posted by '+esc(item.creatorName)+'</p><a href="'+esc(channelUrl)+'">Open Channel</a>'+(item.permalink?'<p><a class="module-primary-action" href="'+esc(item.permalink)+'">Open in Spotlight</a></p>':'<section class="channel-episode-about"><h2>Notes</h2><p>'+esc(item.body||'')+'</p></section>')+'</div></article>';
      if(item.permalink) {
        const section=document.createElement('section');section.className='channel-post-engagement';section.innerHTML='<h2>Join the conversation</h2><div><button type="button" data-post-action="like"></button><button type="button" data-post-action="save"></button><button type="button" data-post-action="share">Share</button></div><div data-post-comments></div><form><label>Comment<input name="comment" maxlength="600" required /></label><button type="submit">Post comment</button></form>';root.append(section);
        const update=()=>{for(const [action,label,count,active] of [['like','Like',item.likes,item.liked],['save','Save',item.saves,item.saved]]){const button=section.querySelector('[data-post-action="'+action+'"]');button.textContent=(active?(action==='like'?'Liked':'Saved'):label)+' · '+Number(count||0);button.setAttribute('aria-pressed',String(active));}};update();
        async function comments(){try{const result=await get('comments/'+encodeURIComponent(item.id));section.querySelector('[data-post-comments]').innerHTML=result.comments.map(comment=>'<article><strong>'+esc(comment.author)+'</strong><p>'+esc(comment.body)+'</p></article>').join('')||'<p>Be the first to comment.</p>';}catch(error){section.querySelector('[data-post-comments]').textContent=error.message;}}await comments();
        async function engage(body){const response=await fetch('/api/spotlight/engagement/'+encodeURIComponent(item.id),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok){if(response.status===401)window.MWE?.openMemberLogin?.(item.contentUrl);throw new Error(result.error);}Object.assign(item,result.item);update();return result;}
        section.querySelectorAll('[data-post-action]').forEach(button=>button.onclick=async()=>{if(button.disabled)return;const action=button.dataset.postAction;button.disabled=true;try{if(action==='share'){const share={title:item.title,url:new URL(item.permalink,location.href).href};if(navigator.share){try{await navigator.share(share);return;}catch(error){if(error.name==='AbortError')return;}}try{await navigator.clipboard.writeText(share.url);window.showToast?.('Link copied.');}catch{window.prompt('Copy this link:',share.url);}}else await engage({action,active:!(action==='like'?item.liked:item.saved)});}catch(error){window.showToast?.(error.message);}finally{button.disabled=false;}});
        const form=section.querySelector('form');form.hidden=!item.commentsEnabled;form.onsubmit=async event=>{event.preventDefault();const body=form.elements.comment.value.trim();if(!body)return;const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;try{await engage({action:'comment',body});form.reset();await comments();}catch(error){window.showToast?.(error.message);}finally{button.disabled=false;}};
      }
    }catch(error){root.innerHTML='<div class="module-empty"><strong>'+esc(error.message)+'</strong><a href="channels.html">Return to Channels</a></div>';}
  });
})();
