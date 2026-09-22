import { ApiError, readJson } from './security.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const encoder = new TextEncoder();
export const PASSWORD_PREFIX = 'pbkdf2-sha256$600000$';
export function base64(bytes) { return btoa(String.fromCharCode(...bytes)); }
export function unbase64(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
export function opaqueToken() { return base64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
export async function tokenDigest(token) { return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token)))); }
export async function modernPassword(password, salt) {
  return PASSWORD_PREFIX + base64(await pbkdf2Async(sha256, encoder.encode(password), unbase64(salt), { c: 600000, dkLen: 32, asyncTick: 20 }));
}
export async function environmentPassword(password,salt,env) {
  if(env.AUTH_KDF_ITERATIONS==='600000') return modernPassword(password,salt);
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const hash=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unbase64(salt),iterations:100000,hash:'SHA-256'},key,256);
  return 'pbkdf2-sha256$100000$'+base64(new Uint8Array(hash));
}
async function encryptionKey(env) {
  let bytes;
  try { bytes = unbase64(env.AUTH_ENCRYPTION_KEY || ''); } catch {}
  if (bytes?.length !== 32) throw new ApiError(503, 'Protected storage is not configured.');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt','decrypt']);
}
export async function seal(env, value, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name:'AES-GCM', iv, additionalData:encoder.encode(context) }, await encryptionKey(env), encoder.encode(JSON.stringify(value)));
  return 'v1.' + base64(iv) + '.' + base64(new Uint8Array(ciphertext));
}
export async function unseal(env, value, context) {
  const [version, iv, ciphertext] = String(value).split('.');
  if (version !== 'v1') throw new ApiError(500, 'Protected record unavailable.');
  const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:unbase64(iv), additionalData:encoder.encode(context) }, await encryptionKey(env), unbase64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}
export function auditStatement(env, actor, action, entityId = null, tenantId = null) {
  return env.DB.prepare('insert into audit_log (id,actor_user_id,action,entity_id,tenant_id,created_at) values (?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,entityId,tenantId,new Date().toISOString());
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function encodeBase32(bytes) {
  let value=0,bits=0,output='';
  for (const byte of bytes) { value=(value<<8)|byte; bits+=8; while(bits>=5) { output+=alphabet[(value>>>(bits-5))&31]; bits-=5; } }
  if(bits) output+=alphabet[(value<<(5-bits))&31];
  return output;
}
export function decodeBase32(secret) {
  let value=0,bits=0; const output=[];
  for(const char of secret) { const index=alphabet.indexOf(char); if(index<0) throw new ApiError(400,'Invalid authenticator secret.'); value=(value<<5)|index; bits+=5; if(bits>=8) { output.push((value>>>(bits-8))&255); bits-=8; } }
  return new Uint8Array(output);
}
export async function totpCode(secret, step) {
  const bytes=new Uint8Array(8); new DataView(bytes.buffer).setBigUint64(0,BigInt(step));
  const key=await crypto.subtle.importKey('raw',decodeBase32(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes));
  const offset=signature.at(-1)&15;
  const number=((signature[offset]&127)<<24)|(signature[offset+1]<<16)|(signature[offset+2]<<8)|signature[offset+3];
  return String(number%1000000).padStart(6,'0');
}
export async function verifyTotp(secret, code, lastStep=-1, now=Date.now()) {
  if(!/^\d{6}$/.test(String(code))) return null;
  const step=Math.floor(now/30000);
  for(const candidate of [step,step-1,step+1]) if(candidate>lastStep && await totpCode(secret,candidate)===code) return candidate;
  return null;
}
export async function throttleAccount(env, email) {
  if(!['production','preview'].includes(env.ENVIRONMENT)) return;
  const digest=await tokenDigest('login:'+email), now=Math.floor(Date.now()/1000);
  const row=await env.DB.prepare(`insert into auth_attempts (account_digest,window_start,attempts) values (?,?,1)
    on conflict(account_digest) do update set
      attempts=case when window_start < ? then 1 else attempts+1 end,
      window_start=case when window_start < ? then excluded.window_start else window_start end
    returning attempts`).bind(digest,now,now-900,now-900).first();
  if(!row || row.attempts>20) throw new ApiError(429,'Too many authentication attempts. Try again later.');
}
async function issueToken(env,userId,purpose,seconds) {
  const token=opaqueToken(), digest=await tokenDigest(token), now=new Date();
  await env.DB.batch([
    env.DB.prepare('delete from security_tokens where user_id=? and purpose=?').bind(userId,purpose),
    env.DB.prepare('insert into security_tokens values (?,?,?,?,?)').bind(digest,userId,purpose,new Date(now.getTime()+seconds*1000).toISOString(),now.toISOString())
  ]);
  return token;
}
export async function mfaChallenge(env,userId) { return issueToken(env,userId,'mfa',300); }
export async function sendIdentityEmail(env,user,purpose) {
  if(!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.PUBLIC_ORIGIN) throw new ApiError(503,'Account email delivery is not configured.');
  const origin=new URL(env.PUBLIC_ORIGIN);
  if(origin.protocol!=='https:') throw new ApiError(503,'Account email delivery is not configured.');
  const token=await issueToken(env,user.id,purpose,purpose==='verify'?3600:900);
  const link=new URL('/account-security.html',origin); link.hash=new URLSearchParams({purpose,token}).toString();
  const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json',authorization:'Bearer '+env.RESEND_API_KEY,'idempotency-key':purpose+'/'+await tokenDigest(token)},body:JSON.stringify({from:env.EMAIL_FROM,to:[user.email],subject:purpose==='verify'?'Verify your My Way email':'Reset your My Way password',text:'Open this link to '+(purpose==='verify'?'verify your email':'reset your password')+':\n'+link.href+'\nIf you did not request this, ignore this email.'})});
  if(!response.ok) { await env.DB.prepare('delete from security_tokens where digest=?').bind(await tokenDigest(token)).run(); throw new ApiError(503,'Account email could not be delivered.'); }
}
export async function handleIdentityApi(request,env,ctx) {
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/auth/security') && !['/api/auth/verification/request','/api/auth/verification/confirm','/api/auth/password/request','/api/auth/password/reset','/api/auth/mfa/confirm','/api/admin/owners'].includes(path)) return null;
  if(!env.DB) throw new ApiError(503,'Storage unavailable.');
  const {json,getSessionUser,createSession,sessionCookieHeader,jsonWithCookie,isAuthorized}=ctx;
  if(path==='/api/auth/password/request' && request.method==='POST') {
    if(!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new ApiError(503,'Account recovery email is not configured.');
    const payload=await readJson(request), email=String(payload.email||'').trim().toLowerCase();
    await throttleAccount(env,email);
    const user=await env.DB.prepare('select id,email from users where email=?').bind(email).first();
    if(user) await sendIdentityEmail(env,user,'reset');
    return json({ok:true,message:'If that account exists, recovery instructions will be emailed.'});
  }
  if(['/api/auth/password/reset','/api/auth/verification/confirm'].includes(path) && request.method==='POST') {
    const payload=await readJson(request), purpose=path.includes('reset')?'reset':'verify';
    if(!/^[A-Za-z0-9_-]{43}$/.test(payload.token||'')) throw new ApiError(400,'Invalid or expired link.');
    const digest=await tokenDigest(payload.token), now=new Date().toISOString();
    const token=await env.DB.prepare('select user_id from security_tokens where digest=? and purpose=? and expires_at>?').bind(digest,purpose,now).first();
    if(!token) throw new ApiError(400,'Invalid or expired link.');
    let update;
    if(purpose==='reset') {
      if(typeof payload.password!=='string' || payload.password.length<15 || payload.password.length>128) throw new ApiError(400,'Use a password between 15 and 128 characters.');
      const salt=base64(crypto.getRandomValues(new Uint8Array(16))), hash=await environmentPassword(payload.password,salt,env);
      update=env.DB.prepare(`update users set password_hash=?,password_salt=? where id=(select user_id from security_tokens where digest=? and purpose='reset' and expires_at>?) returning id`).bind(hash,salt,digest,now);
    } else update=env.DB.prepare(`update users set email_verified_at=? where id=(select user_id from security_tokens where digest=? and purpose='verify' and expires_at>?) returning id`).bind(now,digest,now);
    const statements=[update];
    if(purpose==='reset') statements.push(env.DB.prepare('delete from sessions where user_id=(select user_id from security_tokens where digest=? and purpose=? and expires_at>?)').bind(digest,purpose,now));
    statements.push(env.DB.prepare('insert into audit_log select ?,user_id,?,null,null,? from security_tokens where digest=? and purpose=? and expires_at>?').bind(crypto.randomUUID(),'auth.'+purpose,now,digest,purpose,now));
    statements.push(env.DB.prepare('delete from security_tokens where digest=? and purpose=? and expires_at>?').bind(digest,purpose,now));
    const results=await env.DB.batch(statements);
    if(!results[0].results?.length) throw new ApiError(400,'Invalid or expired link.');
    return json({ok:true,message:purpose==='reset'?'Password changed. Sign in again.':'Email verified.'});
  }
  if(path==='/api/auth/mfa/confirm' && request.method==='POST') {
    const payload=await readJson(request), digest=await tokenDigest(String(payload.challenge||'')), now=new Date().toISOString();
    await throttleAccount(env,'mfa:'+digest);
    const row=await env.DB.prepare(`select u.id,u.totp_secret_encrypted,u.totp_last_step from security_tokens t join users u on u.id=t.user_id where t.digest=? and t.purpose='mfa' and t.expires_at>?`).bind(digest,now).first();
    if(!row?.totp_secret_encrypted) throw new ApiError(401,'Invalid authenticator challenge.');
    const secret=await unseal(env,row.totp_secret_encrypted,'totp:'+row.id), step=await verifyTotp(secret,payload.code,row.totp_last_step);
    if(step===null) throw new ApiError(401,'Invalid or already used authenticator code.');
    const results=await env.DB.batch([
      env.DB.prepare(`update users set totp_last_step=? where id=? and totp_last_step<? and exists(select 1 from security_tokens where digest=? and purpose='mfa' and expires_at>?) returning id`).bind(step,row.id,step,digest,now),
      env.DB.prepare('delete from security_tokens where digest=?').bind(digest)
    ]);
    if(!results[0].results?.length) throw new ApiError(401,'Authenticator challenge already used.');
    const user=await env.DB.prepare('select id,name,email,is_creator,email_verified_at,totp_secret_encrypted from users where id=?').bind(row.id).first();
    const cookie=await createSession(env,row.id,true);
    return jsonWithCookie({ok:true,user:ctx.publicUser(user)},200,sessionCookieHeader(request,cookie,86400));
  }
  if(path==='/api/admin/owners') {
    if(request.method!=='POST' || !isAuthorized(request,env)) throw new ApiError(401,'Administrator authorization required.');
    const payload=await readJson(request), user=await env.DB.prepare('select id,email_verified_at,totp_secret_encrypted from users where email=?').bind(String(payload.email||'').trim().toLowerCase()).first();
    if(!user?.email_verified_at || !user.totp_secret_encrypted) throw new ApiError(409,'Owner must verify email and enroll MFA first.');
    await env.DB.batch([env.DB.prepare("insert into platform_roles values (?,'owner') on conflict(user_id) do nothing").bind(user.id),auditStatement(env,'bootstrap','owner.granted',user.id)]);
    return json({ok:true});
  }
  const user=await getSessionUser(request,env);
  if(!user) throw new ApiError(401,'Sign in required.');
  if(path==='/api/auth/security' && request.method==='GET') {
    const {results}=await env.DB.prepare('select created_at,expires_at,mfa_verified_at from sessions where user_id=? order by created_at desc').bind(user.id).all();
    const ownerRole=!!await env.DB.prepare("select user_id from platform_roles where user_id=? and role='owner'").bind(user.id).first();
    const bootstrapEmail=String(env.OWNER_BOOTSTRAP_EMAIL||'').trim().toLowerCase();
    return json({ok:true,emailVerified:!!user.email_verified_at,mfaEnabled:!!user.totp_secret_encrypted,mfaVerified:!!user.mfa_verified_at,ownerRole,canClaimOwner:!!bootstrapEmail && user.email===bootstrapEmail,emailConfigured:!!env.RESEND_API_KEY && !!env.EMAIL_FROM,sessions:results||[]});
  }
  if(path==='/api/auth/security/owner-claim' && request.method==='POST') {
    await readJson(request);
    const bootstrapEmail=String(env.OWNER_BOOTSTRAP_EMAIL||'').trim().toLowerCase();
    if(!bootstrapEmail || user.email!==bootstrapEmail) throw new ApiError(403,'This account is not authorized to activate platform ownership.');
    if(!user.email_verified_at || !user.totp_secret_encrypted || !user.mfa_verified_at) throw new ApiError(409,'Verify your email and complete authenticator setup before activating owner access.');
    const existing=await env.DB.prepare("select user_id from platform_roles where user_id=? and role='owner'").bind(user.id).first();
    if(existing) return json({ok:true,alreadyOwner:true,message:'Owner access is already active.'});
    await env.DB.batch([
      env.DB.prepare("insert into platform_roles values (?,'owner')").bind(user.id),
      auditStatement(env,user.id,'owner.claimed',user.id)
    ]);
    return json({ok:true,message:'Owner access is active.'});
  }
  if(path==='/api/auth/verification/request' && request.method==='POST') { await readJson(request); await sendIdentityEmail(env,user,'verify'); return json({ok:true,message:'Verification email sent.'}); }
  if(path==='/api/auth/security/revoke-sessions' && request.method==='POST') {
    await readJson(request); await env.DB.batch([env.DB.prepare('delete from sessions where user_id=?').bind(user.id),auditStatement(env,user.id,'auth.sessions.revoked')]);
    return jsonWithCookie({ok:true},200,ctx.clearSessionCookieHeader(request));
  }
  if(path==='/api/auth/security/mfa/enroll' && request.method==='POST') {
    await readJson(request);
    if(!user.email_verified_at) throw new ApiError(403,'Verify your email before enrolling MFA.');
    if(user.totp_secret_encrypted) throw new ApiError(409,'MFA is already enabled.');
    if(!user.session_created_at || Date.parse(user.session_created_at)<Date.now()-600000) throw new ApiError(403,'Sign in again before enrolling MFA.');
    const secret=encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
    await env.DB.prepare('update users set totp_pending_encrypted=? where id=?').bind(await seal(env,secret,'totp-pending:'+user.id),user.id).run();
    return json({ok:true,secret,uri:'otpauth://totp/'+encodeURIComponent('My Way:'+user.email)+'?secret='+secret+'&issuer=My%20Way&algorithm=SHA1&digits=6&period=30'});
  }
  if(path==='/api/auth/security/mfa/activate' && request.method==='POST') {
    const payload=await readJson(request);
    await throttleAccount(env,'mfa-enroll:'+user.id);
    if(!user.totp_pending_encrypted || user.totp_secret_encrypted) throw new ApiError(409,'Start MFA enrollment first.');
    const secret=await unseal(env,user.totp_pending_encrypted,'totp-pending:'+user.id), step=await verifyTotp(secret,payload.code);
    if(step===null) throw new ApiError(400,'Invalid authenticator code.');
    const ciphertext=await seal(env,secret,'totp:'+user.id), cookie=ctx.parseCookies(request).mwe_session_v2;
    const result=await env.DB.batch([
      env.DB.prepare('update users set totp_secret_encrypted=?,totp_pending_encrypted=null,totp_last_step=? where id=? and totp_pending_encrypted=? and totp_secret_encrypted is null returning id').bind(ciphertext,step,user.id,user.totp_pending_encrypted),
      env.DB.prepare('update sessions set mfa_verified_at=? where token=? and user_id=? and exists(select 1 from users where id=? and totp_secret_encrypted=?)').bind(new Date().toISOString(),await ctx.digestToken(cookie),user.id,user.id,ciphertext),
      auditStatement(env,user.id,'auth.mfa.enabled')
    ]);
    if(!result[0].results?.length) throw new ApiError(409,'Enrollment changed. Start again.');
    return json({ok:true});
  }
  throw new ApiError(405,'Method not allowed.');
}
