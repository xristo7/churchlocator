(async function(){
  const root=document.getElementById('home-spotlight-posts');if(!root)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  try {
    const response=await fetch('/api/spotlight/feed',{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error();
    root.innerHTML=result.items.slice(0,4).map(item=>'<article><a href="'+esc(item.channelUrl)+'"><img loading="lazy" src="'+esc(item.posterUrl)+'" alt="" /><h3>'+esc(item.title)+'</h3><p>'+esc(item.creatorName)+'</p></a><a class="module-primary-action" href="'+esc(/^https:\/\//i.test(item.fullContentUrl||'')?item.contentUrl:item.channelUrl)+'">'+(/^https:\/\//i.test(item.fullContentUrl||'')?'Watch full video':'Open Channel')+'</a></article>').join('')||'<p>New Spotlight stories are coming soon.</p>';
  }catch{root.innerHTML='<p>Spotlight is temporarily unavailable. Please try again later.</p>';}
})();
