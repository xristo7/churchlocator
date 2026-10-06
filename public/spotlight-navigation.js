(function(){
  if(window.self===window.top)return;
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target==='_blank')return;
    const target=new URL(link.href,location.href);if(target.origin!==location.origin)return;
    const route=target.pathname.split('/').pop();
    let view,id='',post='',compose='';
    if(route==='app.html'){view=target.searchParams.get('view');id=target.searchParams.get('id')||'';post=target.searchParams.get('post')||'';}
    else if(route==='channel-detail.html'){view='channel-detail';id=target.searchParams.get('id')||'';}
    else if(route==='channel-content.html'){view='channel-content';id=target.searchParams.get('channel')||'';post=target.searchParams.get('post')||'';}
    else if(route==='channels.html')view='channels';
    else if(route==='messages.html'){view='messages';id=target.searchParams.get('id')||'';compose=target.searchParams.get('compose')||'';}
    if(!view||target.hash)return;
    event.preventDefault();window.parent.postMessage({type:'faithlink:navigate',view,id,post,compose},location.origin);
  });
})();
