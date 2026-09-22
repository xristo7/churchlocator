(async function initAccountProfile() {
  await window.MWEPlatform?.ready;
  let user = window.MWEPlatform?.session;
  if (!user) { window.top.location.href = `index.html?login=required&next=${encodeURIComponent("app.html?view=profile")}`; return; }

  const details = document.getElementById("profile-details-form"), password = document.getElementById("profile-password-form"), notice = document.getElementById("profile-notice"), picker = document.getElementById("profile-avatar-input"), image = document.getElementById("profile-avatar-preview"), fallback = document.getElementById("profile-avatar-fallback"), remove = document.getElementById("profile-avatar-remove"), currentPassword = document.getElementById("profile-current-password-wrap"), emailHelp = document.getElementById("profile-email-help");
  let avatarUrl = user.avatarUrl || "", savedEmail = user.email || "", pendingUpload = false;
  const initials = name => (String(name || "My Way").trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("") || "MW").toUpperCase();
  const showNotice = (message, kind="success") => { notice.textContent=message; notice.dataset.kind=kind; notice.hidden=false; };
  const setBusy = (form, busy) => { form.setAttribute("aria-busy",String(busy)); form.querySelectorAll("button,input").forEach(control=>control.disabled=busy); };
  function drawAvatar() { fallback.textContent=initials(details.elements.name.value || user.name); fallback.hidden=Boolean(avatarUrl); image.hidden=!avatarUrl; if(avatarUrl) image.src=avatarUrl; remove.disabled=!avatarUrl || pendingUpload; }
  async function uploadAvatar(file) {
    if ((file.type && !["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) || file.size > 5*1024*1024) throw new Error("Choose a JPG, PNG, WebP, or GIF picture under 5 MB.");
    const payload=new FormData(); payload.append("purpose","profile"); payload.append("image",file);
    const response=await fetch("/api/media/upload",{method:"POST",credentials:"same-origin",body:payload});
    const result=await response.json().catch(()=>null);
    if(!response.ok || !result?.ok || !result.url) throw new Error(result?.error || "We could not upload that picture.");
    return result.url;
  }

  details.elements.name.value=user.name || ""; details.elements.email.value=user.email || "";
  const managedByGoogle=user.hasPassword===false;
  details.elements.email.readOnly=managedByGoogle;
  if(managedByGoogle) emailHelp.textContent="Your sign-in email is managed by Google.";
  document.getElementById("profile-password-fields").hidden=managedByGoogle;
  document.getElementById("profile-google-password").hidden=!managedByGoogle;
  drawAvatar();
  details.elements.name.addEventListener("input",drawAvatar);
  details.elements.email.addEventListener("input",()=>{currentPassword.hidden=managedByGoogle || details.elements.email.value.trim().toLowerCase()===savedEmail.toLowerCase();});
  picker.addEventListener("change",async()=>{const file=picker.files?.[0]; if(!file)return; const old=avatarUrl, local=URL.createObjectURL(file); pendingUpload=true; avatarUrl=local; drawAvatar(); showNotice("Uploading your picture…"); try { avatarUrl=await uploadAvatar(file); showNotice("Picture ready. Save your profile to keep it."); } catch(error) { avatarUrl=old; showNotice(error.message,"error"); } finally { URL.revokeObjectURL(local); picker.value=""; pendingUpload=false; drawAvatar(); }});
  remove.addEventListener("click",()=>{avatarUrl="";drawAvatar();showNotice("Picture removed. Save your profile to keep this change.");});
  details.addEventListener("submit",async event=>{event.preventDefault();if(pendingUpload){showNotice("Wait for your picture upload to finish.","error");return;}setBusy(details,true);try{const result=await window.MWEAuth.updateProfile({name:details.elements.name.value,email:details.elements.email.value,avatarUrl,currentPassword:details.elements.currentPassword.value});if(!result.ok)throw new Error(result.error||"Your profile could not be saved.");user=result.user;savedEmail=user.email;details.elements.currentPassword.value="";currentPassword.hidden=true;window.parent.postMessage({type:"mwe:profile-updated",user},window.location.origin);showNotice("Your profile has been updated.");drawAvatar();}catch(error){showNotice(error.message,"error");}finally{setBusy(details,false);}});
  password.addEventListener("submit",async event=>{event.preventDefault();const current=password.elements.currentPassword.value,next=password.elements.newPassword.value,confirm=password.elements.confirmPassword.value;if(next!==confirm){showNotice("The new passwords do not match.","error");return;}setBusy(password,true);try{const result=await window.MWEAuth.changePassword(current,next);if(!result.ok)throw new Error(result.error||"Your password could not be updated.");password.reset();showNotice("Your password has been updated.");}catch(error){showNotice(error.message,"error");}finally{setBusy(password,false);}});
  window.lucide?.createIcons();
})();
