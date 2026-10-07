(function(root){
  function source(value){
    let url;try{url=new URL(value);}catch{return {kind:'invalid'};}
    if(url.protocol!=='https:'||url.username||url.password)return {kind:'invalid'};
    const host=url.hostname.replace(/^www\./,'');
    const id=host==='youtu.be'?url.pathname.slice(1):['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)?url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|live)\/([\w-]{11})(?:\/|$)/)?.[1]:null;
    if(id&&/^[\w-]{11}$/.test(id))return {kind:'iframe',url:'https://www.youtube-nocookie.com/embed/'+id,provider:'YouTube'};
    if(['vimeo.com','player.vimeo.com'].includes(host)){
      const event=url.pathname.match(/^\/event\/(\d+)(?:\/embed)?\/?$/);if(event)return {kind:'iframe',url:'https://vimeo.com/event/'+event[1]+'/embed'+url.search,provider:'Vimeo Live'};
      const video=url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([\w]+))?\/?$/);if(video){const hash=url.searchParams.get('h')||video[2];return {kind:'iframe',url:'https://player.vimeo.com/video/'+video[1]+(hash?'?h='+encodeURIComponent(hash):''),provider:'Vimeo'};}
    }
    if(['facebook.com','m.facebook.com','fb.watch'].includes(host))return {kind:'iframe',url:'https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(url.href)+'&show_text=false',provider:'Facebook'};
    if(['x.com','twitter.com'].includes(host))return {kind:/^\/[^/]+\/status\/\d+\/?$/.test(url.pathname)?'x-post':'external',url:url.href,provider:'X'};
    if((host.endsWith('.cloudflarestream.com')||host==='iframe.videodelivery.net')&&/^\/[\w-]+\/iframe\/?$/.test(url.pathname))return {kind:'iframe',url:url.href,provider:'Cloudflare Stream'};
    if(['player.mediadelivery.net','iframe.mediadelivery.net'].includes(host)&&/^\/embed\/[\w-]+\/[\w-]+/.test(url.pathname))return {kind:'iframe',url:url.href,provider:'Bunny'};
    if(host==='player.cloudinary.com'&&url.pathname.startsWith('/embed/'))return {kind:'iframe',url:url.href,provider:'Cloudinary'};
    if(/\.m3u8$/i.test(url.pathname))return {kind:'hls',url:url.href,provider:'Direct broadcast'};
    if(/\.(mp4|webm)$/i.test(url.pathname))return {kind:'video',url:url.href,provider:'Direct video'};
    return {kind:'external',url:url.href,provider:'Streaming provider'};
  }
  async function mount(target,value,title){
    const resolved=source(value);target.replaceChildren();
    if(resolved.kind==='invalid'){target.textContent='No playable broadcast has been configured.';return ()=>{};}
    if(resolved.kind==='x-post'){
      const post=document.createElement('blockquote');post.className='twitter-tweet';
      const original=document.createElement('a');original.href=resolved.url;original.textContent='Watch this post on X';post.append(original);target.append(post);
      if(root.twttr?.widgets){root.twttr.widgets.load(target);}else if(!document.querySelector('script[data-live-x-widget]')){
        const script=document.createElement('script');script.src='https://platform.twitter.com/widgets.js';script.dataset.liveXWidget='true';script.async=true;document.head.append(script);
      }
    }else if(resolved.kind==='iframe'){
      const frame=document.createElement('iframe');frame.className='creator-live-player';frame.src=resolved.url;frame.title=title+' broadcast';frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';target.append(frame);
    }else if(['hls','video'].includes(resolved.kind)){
      const video=document.createElement('video');video.controls=true;video.playsInline=true;video.className='creator-live-player';target.append(video);
      if(resolved.kind==='hls'&&!video.canPlayType('application/vnd.apple.mpegurl')){
        if(!root.Hls){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/live/hls.min.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});}
        if(!root.Hls.isSupported()){target.textContent='This browser cannot play this live stream.';return ()=>{};}
        const hls=new root.Hls({enableWorker:false});hls.loadSource(resolved.url);hls.attachMedia(video);
        hls.on(root.Hls.Events.ERROR,(_,data)=>{if(data.fatal){let message=target.querySelector('[data-live-error]');if(!message){message=document.createElement('p');message.dataset.liveError='true';target.append(message);}message.textContent='The broadcast is offline or the provider is not allowing playback. Try again when the stream is on air.';}});
        return ()=>{hls.destroy();video.pause();};
      }
      video.src=resolved.url;return ()=>video.pause();
    }else{const note=document.createElement('p');note.textContent=resolved.provider+' requires playback on its own site for this link.';target.append(note);}
    const link=document.createElement('a');link.href=resolved.url;link.textContent='Open on '+resolved.provider;link.target='_blank';link.rel='noopener noreferrer';target.append(link);
    return ()=>target.replaceChildren();
  }
  root.MWELivePlayer={source,mount};
})(window);
