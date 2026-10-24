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
