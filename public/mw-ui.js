/* Wires mockup-style chips/sub-nav to the existing filter selects (no new data). */
(function(){
  function sync(group){
    var sel=document.getElementById(group.getAttribute('data-mwu-select'));
    if(!sel) return;
    group.addEventListener('click',function(e){
      var b=e.target.closest('[data-value]'); if(!b||!group.contains(b)) return;
      sel.value=b.getAttribute('data-value');
      sel.dispatchEvent(new Event('change',{bubbles:true}));
      group.querySelectorAll('[data-value]').forEach(function(x){var on=x===b;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',on?'true':'false');});
    });
    sel.addEventListener('change',function(){group.querySelectorAll('[data-value]').forEach(function(x){var on=x.getAttribute('data-value')===sel.value;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',on?'true':'false');});});
  }
  function init(){
    document.querySelectorAll('[data-mwu-select]').forEach(sync);
    var j=document.querySelector('[data-mwu-join-link]');
    if(j) j.addEventListener('click',function(){
      var v=window.prompt('Paste the meditation invitation link');
      if(!v) return;
      try{var u=new URL(v.trim(),location.href); if(u.origin===location.origin){location.href=u.href;} else {alert('That link is not a My Way invitation link.');}}catch(_){alert('That does not look like a valid link.');}
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

/* ui-fix2: graceful broken-image fallbacks */
(function(){
  var AV='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9962b"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="31" r="13" fill="#fff" opacity=".9"/><path d="M16 70c3-14 13-21 24-21s21 7 24 21z" fill="#fff" opacity=".9"/></svg>');
  function initials(t){return (t||'').replace(/channel cover|cover/ig,'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0]}).join('').toUpperCase()}
  function fix(img){
    if(img.dataset.mwuFixed)return; img.dataset.mwuFixed='1';
    var isAvatar=/avatar/i.test(img.className)||img.width&&img.width<=96&&img.height<=96;
    if(isAvatar){img.src=AV;img.alt='';return}
    var box=img.parentElement; if(!box)return;
    var card=img.closest('article,[class*=card]');
    var name=(card&&card.querySelector('h3,h2'))?card.querySelector('h3,h2').textContent:img.alt;
    img.classList.add('mwu-img-broken'); img.alt='';
    box.classList.add('mwu-img-fallback');
    if(!box.querySelector(':scope>.mwu-initials')){var s=document.createElement('span');s.className='mwu-initials';s.setAttribute('aria-hidden','true');s.textContent=initials(name);box.insertBefore(s,box.firstChild)}
  }
  document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG')fix(t)},true);
  function scan(){document.querySelectorAll('img').forEach(function(i){if(i.complete&&i.naturalWidth===0&&i.getAttribute('src'))fix(i)})}
  if(document.readyState!=='loading')scan();else document.addEventListener('DOMContentLoaded',scan);
  window.addEventListener('load',scan);
  new MutationObserver(function(){setTimeout(scan,300)}).observe(document.documentElement,{childList:true,subtree:true});
})();
