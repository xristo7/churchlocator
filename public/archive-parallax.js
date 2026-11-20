/* Bounded scroll parallax for archive photography, including within the SPA frame. */
(function () {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=matchMedia('(max-width: 760px)');
  const states=[];
  for(const hero of document.querySelectorAll('.rs-hero,.rsc-dir-hero,.mwu-hero.module-directory-hero')) {
    const computed=getComputedStyle(hero);
    if(!computed.backgroundImage.includes('url('))continue;
    const layer=document.createElement('div');
    layer.className='archive-parallax-image';layer.setAttribute('aria-hidden','true');
    layer.style.backgroundImage=computed.backgroundImage;
    layer.style.backgroundPosition=computed.backgroundPosition;
    layer.hidden=true;hero.prepend(layer);
    states.push({hero,layer,image:hero.style.getPropertyValue('background-image'),priority:hero.style.getPropertyPriority('background-image')});
  }
  if(!states.length)return;
  let pending=false;
  function update() {
    pending=false;
    if(reduced.matches)return;
    for(const {hero,layer}of states) {
      const rect=hero.getBoundingClientRect();
      if(!rect.height||rect.bottom<0||rect.top>innerHeight)continue;
      const limit=mobile.matches?12:24,speed=mobile.matches ? 0.08 : 0.12;
      const offset=Math.max(-limit,Math.min(limit,-rect.top*speed));
      layer.style.setProperty('--archive-parallax-y',offset.toFixed(2)+'px');
    }
  }
  function queue() {if(!pending&&!reduced.matches){pending=true;requestAnimationFrame(update);}}
  function preference() {
    for(const state of states) {
      const {hero,layer,image,priority}=state;
      layer.hidden=reduced.matches;
      hero.classList.toggle('has-archive-parallax',!reduced.matches);
      if(reduced.matches) {
        if(image)hero.style.setProperty('background-image',image,priority);
        else hero.style.removeProperty('background-image');
        layer.style.removeProperty('--archive-parallax-y');
      } else hero.style.setProperty('background-image','none','important');
    }
    queue();
  }
  document.addEventListener('scroll',queue,{passive:true,capture:true});
  window.addEventListener('resize',queue,{passive:true});
  reduced.addEventListener('change',preference);
  mobile.addEventListener('change',queue);
  preference();
})();
