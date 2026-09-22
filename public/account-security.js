(async function(){
 await window.MWEPlatform.ready;
 const $=id=>document.getElementById(id),api=window.MWEPlatform.api;
 const params=new URLSearchParams(location.hash.slice(1)),token=params.get('token'),purpose=params.get('purpose');
 if(token)history.replaceState(null,'',location.pathname);
 const notify=text=>$('security-notice').textContent=text;
 async function action(fn){try{await fn();}catch(error){notify(error.message);}}
 async function draw(){const user=window.MWEPlatform.session;$('security-controls').hidden=!user;$('security-signin').hidden=!!user;if(!user)return;const info=await api('auth/security');$('security-summary').textContent=user.email+' · Email '+(info.emailVerified?'verified':'unverified')+' · Authenticator '+(info.mfaEnabled?'enabled':'disabled');$('security-verify').disabled=info.emailVerified||!info.emailConfigured;$('security-enroll').disabled=!info.emailVerified||info.mfaEnabled;$('security-sessions').textContent=info.sessions.length+' active session(s).';const ownerSetup=$('security-owner-setup'),claim=$('security-claim-owner'),ownerStatus=$('security-owner-status');ownerSetup.hidden=!info.canClaimOwner;if(info.canClaimOwner){claim.hidden=info.ownerRole;claim.disabled=!info.mfaEnabled||!info.mfaVerified;ownerStatus.textContent=info.ownerRole?'Owner workspace is active.':(info.mfaEnabled&&info.mfaVerified?'Your account is ready to activate owner access.':'Complete authenticator setup to activate your owner workspace.');}if(!info.emailConfigured)notify('Verification and recovery await account email configuration.');}
 $('security-signin').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;const data=Object.fromEntries(new FormData(form));action(async()=>{const result=await window.MWEAuth.login(data.email,data.password);form.elements.password.value='';if(!result.ok)throw new Error(result.error);await draw();notify('Signed in.');});};
 $('security-recovery').onsubmit=event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));action(async()=>notify((await api('auth/password/request',data)).message));};
 $('security-reset').hidden=!(token&&purpose==='reset');$('security-reset').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;action(async()=>{notify((await api('auth/password/reset',{token,password:form.elements.password.value})).message);form.reset();form.hidden=true;window.MWEAuth.clearSession();await draw();});};
 $('security-verify').onclick=()=>action(async()=>notify((await api('auth/verification/request',{})).message));
 $('security-enroll').onclick=()=>action(async()=>{const result=await api('auth/security/mfa/enroll',{});$('security-secret').textContent=result.secret;$('security-enrollment').hidden=false;});
 $('security-activate').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;action(async()=>{await api('auth/security/mfa/activate',{code:form.elements.code.value});$('security-secret').textContent='';$('security-enrollment').hidden=true;form.reset();await window.MWEAuth.session();await draw();notify('Authenticator enabled.');});};
 $('security-claim-owner').onclick=()=>action(async()=>{const result=await api('auth/security/owner-claim',{});await window.MWEAuth.session();notify(result.message||'Owner access is active.');location.assign('owner-dashboard.html');});
 $('security-revoke').onclick=()=>action(async()=>{await api('auth/security/revoke-sessions',{});window.MWEAuth.clearSession();await draw();notify('All sessions signed out.');});
 if(token&&purpose==='verify')await action(async()=>{notify((await api('auth/verification/confirm',{token})).message);await window.MWEAuth.session();});
 await action(draw);
 window.MWEPlatform.legacyControls?.($('security-legacy'),$('security-export'),$('security-clear-legacy'));
})();
