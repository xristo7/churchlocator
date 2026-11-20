/* Shared church connection forms: accessible steps, inline feedback and server-backed delivery. */
(function () {
  'use strict';
  const modes = {
    visit: { title:'Plan your visit', icon:'map-pinned', headline:'A warm welcome awaits.', intro:'Let us help make your first visit feel familiar.', detail:'Plan your welcome', hint:'Tell the welcome team a little about your visit.', send:'Request a visit', need:'visit' },
    ride: { title:'Request a ride', icon:'car', headline:'Let’s get you there.', intro:'Connect with the church team about transport to a service.', detail:'Your journey', hint:'Share your pickup area and any travel needs.', send:'Request a ride', need:'ride' },
    group: { title:'Join a group', icon:'users', headline:'Find your people.', intro:'Take a small step towards friendship and community.', detail:'Find your community', hint:'Choose an interest and tell the team what you’re looking for.', send:'Send group request', need:'group' },
    ministry: { title:'Explore ministries', icon:'book-open', headline:'Make room for your gifts.', intro:'Discover a team where you can connect, grow and serve.', detail:'A place to serve', hint:'Tell the team where you’d like to get involved.', send:'Connect with a team', need:'ministry' },
    prayer: { title:'Request prayer', icon:'hand-heart', headline:'You don’t have to carry it alone.', intro:'Share what is on your heart with the church team.', detail:'Your prayer request', hint:'Share only what you feel comfortable sharing.', send:'Send prayer request', need:'prayer' },
    message: { title:'Message the church', icon:'message-circle', headline:'Start a conversation.', intro:'Ask a question or reach out to the church team directly.', detail:'What’s on your mind?', hint:'Your message goes to this church’s team.', send:'Send message' }
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let current = null;
  function open(church, mode) {
    const config = modes[mode];
    if (!church?.id || !config) return;
    if (current?.busy) return;
    current?.dialog.close();
    document.getElementById('cp-action-dialog')?.remove();
    const opener = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.id = 'cp-action-dialog'; dialog.className = 'cp-action-dialog';
    dialog.setAttribute('aria-labelledby','cp-action-title'); dialog.setAttribute('aria-describedby','cp-action-hint');
    function imageUrl(value) {
      try { const url=new URL(value,location.origin); return value && ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
    }
    const mainImage=imageUrl(church.photo || church.coverImage);
    const safeImage=imageUrl(church[mode+'FormImage']) || mainImage;
    const interests = Array.isArray(church.ministries) ? church.ministries : [];
    const requestLabel = mode === 'ride' ? 'Anything we should know?' : mode === 'prayer' ? 'What can we pray for?' : 'A note for the team';
    dialog.innerHTML = '<aside class="cp-action-visual">' + (safeImage ? '<img src="'+esc(safeImage)+'" alt="" />' : '') +
      '<div class="cp-action-story"><span class="cp-action-emblem"><i data-lucide="'+config.icon+'"></i></span><div><p class="cp-action-eyebrow">YOU BELONG HERE</p><h2>'+config.headline+'</h2><p>'+config.intro+'</p></div><div class="cp-action-church"><i data-lucide="church"></i><span>'+esc(church.name)+'</span></div></div></aside>' +
      '<form class="cp-action-form" novalidate><header><p class="cp-action-kicker">LET’S CONNECT</p><h2 id="cp-action-title">'+config.title+'</h2><p id="cp-action-hint">'+esc(church.name)+' · '+config.hint+'</p></header>' +
      (mode !== 'message' ? '<ol class="cp-action-progress" aria-label="Request progress"><li data-progress="0" aria-current="step"><span>01</span>Your details</li><li data-progress="1"><span>02</span>Your request</li></ol>' : '') +
      '<div class="cp-action-content">' +
      (mode !== 'message' ? '<section data-step="0" aria-labelledby="cp-details-title"><h3 id="cp-details-title" tabindex="-1">A little about you</h3><p class="cp-action-help">So the team knows how to reach you.</p><label>Full name <span aria-hidden="true">*</span><input name="fullName" required autocomplete="name" maxlength="120" placeholder="Your name" /></label><label>Email address <span aria-hidden="true">*</span><input name="email" type="email" required autocomplete="email" maxlength="200" placeholder="you@example.com" /></label><label>Phone <small>Optional</small><input name="phone" type="tel" autocomplete="tel" maxlength="40" placeholder="A number the team can reach you on" /></label></section>' : '') +
      '<section data-step="'+(mode === 'message' ? '0' : '1')+'" '+(mode !== 'message' ? 'hidden' : '')+' aria-labelledby="cp-request-title"><h3 id="cp-request-title" tabindex="-1">'+config.detail+'</h3>' +
      (mode === 'group' || mode === 'ministry' ? '<label>Interested in<select name="interest"><option value="">Help me find a fit</option>'+interests.map(item => '<option>'+esc(typeof item === 'string' ? item : item.name || item.title || '')+'</option>').join('')+'</select></label>' : '') +
      (mode !== 'message' ? '<label>'+(mode === 'ride' ? 'Pickup area' : 'Your city')+' <small>Optional</small><input name="city" autocomplete="address-level2" maxlength="160" placeholder="'+(mode === 'ride' ? 'Neighbourhood or pickup area' : 'City or town')+'" /></label>' : '<label>Subject <small>Optional</small><input name="subject" maxlength="160" placeholder="How can we help?" /></label>') +
      '<label>'+ (mode === 'message' ? 'Message' : requestLabel) +(mode === 'prayer' || mode === 'message' ? ' <span aria-hidden="true">*</span>' : ' <small>Optional</small>')+'<textarea name="message" rows="4" maxlength="'+(mode === 'message' ? '1000' : '2000')+'" '+(mode === 'prayer' || mode === 'message' ? 'required' : '')+' placeholder="'+(mode === 'prayer' ? 'Share your prayer request…' : mode === 'visit' ? 'Visiting with family? Have a question? Let us know…' : 'Tell the team a little more…')+'"></textarea></label><p class="cp-action-privacy"><i data-lucide="lock-keyhole"></i>Sent to the church team. Never posted publicly.</p></section></div>' +
      '<p class="cp-action-error" role="alert" hidden></p><p class="cp-action-session" role="status" hidden></p><div class="cp-action-footer"><button type="button" class="cp-action-back"><i data-lucide="arrow-left"></i><span>Cancel</span></button><button type="submit" class="cp-action-primary"><span>'+(mode === 'message' ? config.send : 'Continue')+'</span><i data-lucide="arrow-right"></i></button></div></form><button type="button" class="cp-action-close" aria-label="Close"><i data-lucide="x"></i></button>';
    document.body.append(dialog);
    const picture=dialog.querySelector('.cp-action-visual>img');
    picture?.addEventListener('error',()=>{
      if(mainImage && picture.src!==mainImage) picture.src=mainImage;
      else picture.remove();
    });
    const form = dialog.querySelector('form'), back = form.querySelector('.cp-action-back'), send = form.querySelector('[type=submit]');
    const error = form.querySelector('.cp-action-error'), sessionNote = form.querySelector('.cp-action-session');
    const state = current = { dialog, busy:false, step:0, user:null, loaded:false, done:false };
    const steps = [...form.querySelectorAll('[data-step]')];
    function icons() { window.lucide?.createIcons?.(); }
    function go(step, focus = true) {
      state.step = step;
      steps.forEach((section,index) => { section.hidden = index !== step; });
      form.querySelectorAll('[data-progress]').forEach((item,index) => { if (index === step) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current'); item.classList.toggle('is-complete',index < step); });
      back.querySelector('span').textContent = step ? 'Back' : 'Cancel';
      send.querySelector('span').textContent = step === steps.length - 1 ? config.send : 'Continue';
      error.hidden = true; form.scrollTop = 0;
      if (focus) steps[step].querySelector('h3').focus({preventScroll:true});
    }
    function close() { if (!state.busy) dialog.close(); }
    dialog.querySelector('.cp-action-close').addEventListener('click',close);
    dialog.addEventListener('cancel',event => { if (state.busy) event.preventDefault(); });
    dialog.addEventListener('click',event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } });
    dialog.addEventListener('close',() => { if (current === state) current = null; dialog.remove(); if (opener?.isConnected) opener.focus({preventScroll:true}); },{once:true});
    back.addEventListener('click',() => { if (state.busy) return; state.step ? go(state.step - 1) : close(); });
    function validate(index) {
      const invalid = [...steps[index].querySelectorAll('input,select,textarea')].find(field => !field.checkValidity());
      if (!invalid) return true;
      go(index,false); invalid.reportValidity(); invalid.focus(); return false;
    }
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (state.busy || state.done) return;
      if (mode === 'message' && !state.loaded) return;
      if (mode === 'message' && !state.user) {
        close(); window.MWE?.openMemberLogin?.(location.pathname + location.search); return;
      }
      if (!validate(state.step)) return;
      if (state.step < steps.length - 1) { go(state.step + 1); return; }
      for (let i=0;i<steps.length;i++) if (!validate(i)) return;
      state.busy = true; send.disabled = true; back.disabled = true; send.setAttribute('aria-busy','true');
      send.querySelector('span').textContent = 'Sending…'; error.hidden = true;
      const fields = Object.fromEntries(new FormData(form));
      let body, path;
      if (mode === 'message') { path='/api/private/message'; body={entityId:church.id,subject:fields.subject,body:fields.message.trim()}; }
      else {
        path='/api/visitor'; const {interest,...values}=fields;
        if (interest) values.message = config.title + ': ' + interest + (values.message ? '\n' + values.message : '');
        body={...values,churchId:church.id,needs:[config.need]};
      }
      try {
        const response = await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify(body)});
        const result = await response.json().catch(()=>({}));
        if (!response.ok || !result.ok) throw new Error(result.error || 'Your request could not be sent. Please try again.');
        state.done = true;
        form.innerHTML = '<div class="cp-action-success" role="status" tabindex="-1"><span><i data-lucide="check"></i></span><p class="cp-action-kicker">'+(mode === 'message' ? 'MESSAGE SENT' : 'REQUEST RECEIVED')+'</p><h2>You’re connected.</h2><p>Your '+(mode === 'message' ? 'message' : 'request')+' has been sent to '+esc(church.name)+'. The team can follow up with you directly.</p><button type="button" class="cp-action-primary" data-done>Done<i data-lucide="check"></i></button></div>';
        form.querySelector('[data-done]').addEventListener('click',close); icons(); form.querySelector('.cp-action-success').focus();
      } catch (failure) { error.textContent = failure.message; error.hidden = false; error.scrollIntoView({block:'nearest'}); }
      finally { state.busy=false; send.disabled=false; back.disabled=false; send.removeAttribute('aria-busy'); if (!state.done) send.querySelector('span').textContent=config.send; }
    });
    if (mode === 'message') { send.disabled=true; sessionNote.hidden=false; sessionNote.textContent='Checking your account…'; }
    fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(async response => {
      if (!response.ok) throw new Error('Could not check your account. Please reopen this form to try again.');
      const result=await response.json();
      if (!dialog.isConnected || current !== state) return;
      state.user=result.user || null; state.loaded=true;
      if (mode === 'message') { send.disabled=false; sessionNote.hidden=!!state.user; sessionNote.textContent=state.user ? '' : 'Sign in to send a private message to this church.'; if (!state.user) send.querySelector('span').textContent='Sign in to send'; }
      else if (state.user) {
        if (!form.elements.fullName.value) form.elements.fullName.value=state.user.name || state.user.displayName || '';
        if (!form.elements.email.value) form.elements.email.value=state.user.email || '';
      }
    }).catch(failure => { if (mode === 'message' && dialog.isConnected) { sessionNote.textContent=failure.message; } });
    dialog.showModal(); icons();
  }
  window.MWEChurchActions = { open };
})();
