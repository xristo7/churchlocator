import {randomBytes} from 'node:crypto';
import {writeFileSync,readFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
export const dir=process.env.PHASE_B_FIXTURE_DIR || '/tmp/rhemasphere-phase-b';mkdirSync(dir,{recursive:true});
export const base=process.env.BASE || 'http://127.0.0.1:8800';
export async function api(path,body,cookie='',method=body?'POST':'GET'){
 const r=await fetch(base+'/api/'+path,{method,headers:{connection:'close',...(cookie?{cookie}:{}),origin:base,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok || (!data.ok && r.status!==202))throw new Error(path+' HTTP '+r.status+': '+data.error);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
export function db(sql){const file=dir+'/local-fixture.sql';writeFileSync(file,sql,{mode:0o600});execFileSync('node_modules/.bin/wrangler',['d1','execute','my-way-of-evangelism-preview','--local','--env','preview','--persist-to=/workspace/phase-b-state','--file',file],{stdio:'pipe'});}
export async function accounts(){
 const file=dir+'/local-accounts.json';
 if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const result={};
 for(const role of ['creator','viewer']){
  const email='phase-b-'+role+'-'+randomBytes(6).toString('hex')+'@example.invalid',password=randomBytes(24).toString('base64url');
  await api('auth/register',{email,password,name:'Phase B '+role,isCreator:role==='creator'});
  db(`update users set email_verified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),is_creator=${role==='creator'?1:0} where email='${email}';`);
  const login=await api('auth/login',{email,password});
  if(!login.cookie)throw new Error('Local login did not establish a session');
  result[role]={email,password,cookie:login.cookie,user:login.data.user};
 }
 writeFileSync(file,JSON.stringify(result),{mode:0o600});return result;
}
export async function browserPage(browser,cookie,width=1366){
 const ctx=await browser.newContext({viewport:{width,height:900}});
 if(cookie){const [name,value]=cookie.split('=');await ctx.addCookies([{name,value,url:base}]);}
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const page=await ctx.newPage();return page;
}
