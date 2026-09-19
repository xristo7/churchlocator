/* Sessions and personal data live in memory; permissions and persistence live on the server. */
(function (root) {
 'use strict';
 const disk=root.localStorage, memory=new Map();
 const preferences=/^(mwe\.(theme|language|lang)|mwe\.platform\.(theme|primary)|faithlink\.theme)/i;
 const catalogKeys={churches:'mwe.platform.churches.v1',events:'mwe.platform.events.v4',meditation:'mwe.meditation.rooms.v1',channels:'faithlink.channels.v1',products:'faithlink.store.products.v1',resources:'faithlink.resources.v1',store:'mwe.storefronts.v1'};
 const privateKeys={prayer:'mwe.prayer_requests',ride:'mwe.ride_requests',visit:'mwe.visit_requests',salvation:'mwe.salvation_decisions',foundation:'mwe.foundation_apps',message:'faithlink.messages.v1',settings:'faithlink.messages.settings.v1'};
 const taxonomyDefaults={
  denominations:['Christ Embassy','New Generation','Pentecostal','Full Gospel','Charismatic','Baptist','Catholic','Anglican','Presbyterian','Protestant'],
  languages:['English','French','Spanish','Portuguese','Swahili','Arabic'],
  worship_styles:['Contemporary','Traditional','Blended','Charismatic'],
  store_categories:['Books & Resources','Apparel','Music','Gifts','Church Supplies','General'],
  product_categories:['Books','Journals','Apparel','Church Supplies','Study Tools','Kids','Music','Gifts'],
  channel_topics:['Bible Teaching','Worship','Family','Leadership','Youth','Bible Study'],
  resource_topics:['Bible Study','Prayer','Discipleship','Worship','Devotional','Leadership']
 };
 const locked=new Set([...Object.values(catalogKeys),...Object.values(privateKeys)]);
 const storage={getItem:key=>preferences.test(key)?disk.getItem(key):memory.get(key)??null,setItem(key,value){if(preferences.test(key)) return disk.setItem(key,String(value));if(locked.has(key)&&platform.installed&&!platform.staging)throw new Error('Use the connected workspace to save this record.');memory.set(key,String(value));},removeItem(key){if(preferences.test(key))disk.removeItem(key);else memory.delete(key);},clear(){memory.clear();},key:index=>[...memory.keys()][index]??null,get length(){return memory.size;}};
 Object.defineProperty(root,'localStorage',{configurable:true,value:storage});
 let publicRecords=[],workspace=[],privateRecords=[];
 const clone=value=>JSON.parse(JSON.stringify(value));
 async function api(path,body,method=body?'POST':'GET') {
  const response=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok || !data.ok){const error=new Error(data.error||'The server could not complete this request.');error.status=response.status;throw error;}return data;
 }
 const platform=root.MWEPlatform={session:null,role:null,installed:false,staging:false,error:null,api,taxonomies:Object.fromEntries(Object.entries(taxonomyDefaults).map(([key,items])=>[key,{items:[...items],revision:1}])),
  options(key){return [...(this.taxonomies[key]?.items||taxonomyDefaults[key]||[])];},
  async saveTaxonomy(key,items){if(this.role!=='owner')throw new Error('Super Admin access is required.');const current=this.taxonomies[key];const response=await api('taxonomies/'+encodeURIComponent(key),{items,revision:current?.revision},'PUT');this.taxonomies[key]=response.taxonomy;return response.taxonomy;},
  records(kind,managed=false){return clone((managed?workspace:publicRecords).filter(row=>row.kind===kind));},
  canManage(kind,id){return workspace.some(row=>row.kind===kind&&row.id===id&&row.canManage);},
  async refresh(user){this.session=user||null;workspace=[];privateRecords=[];this.role=null;
   const [catalog,taxonomyResult]=await Promise.all([api('catalog'),api('taxonomies').catch(()=>null)]);publicRecords=catalog.records;
   if(taxonomyResult?.taxonomies)this.taxonomies={...this.taxonomies,...taxonomyResult.taxonomies};
   if(user){const results=await Promise.allSettled([api('workspace'),api('private')]);if(results[0].status==='fulfilled'){workspace=results[0].value.records;this.role=results[0].value.role;}if(results[1].status==='fulfilled')privateRecords=results[1].value.records;else throw results[1].reason;}
   hydrate();root.dispatchEvent(new Event('mwe-platform-ready'));
  },
  async save(kind,record){if(!this.session)throw new Error('Sign in before saving.');const existing=workspace.find(row=>row.id===record.id&&row.kind===kind);const response=await api('workspace/'+kind+(existing?'/'+encodeURIComponent(existing.id):''),{...record,...(existing?{revision:existing.revision}:{})},existing?'PUT':'POST');await this.refresh(this.session);return response.record;},
  material:id=>api('resource-material/'+encodeURIComponent(id)),
  legacyControls(section,exportButton,clearButton){const keys=Object.keys(disk).filter(key=>locked.has(key)||/^mwe\.meditation\.(reflections|chat)\./.test(key));section.hidden=!keys.length;exportButton.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(Object.fromEntries(keys.map(key=>[key,disk.getItem(key)])),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='my-way-legacy-records-private.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};clearButton.onclick=()=>{for(const key of keys)disk.removeItem(key);section.hidden=true;};},
  clear(){this.session=null;this.role=null;workspace=[];privateRecords=[];for(const key of [...memory.keys()])if(!Object.values(catalogKeys).includes(key))memory.delete(key);hydrate();root.document?.body?.classList.remove('is-authenticated');}
 };
const personal=root.MWEPrivate={
  get:kind=>clone(privateRecords.filter(row=>row.kind===kind)),
  async refresh(){if(!platform.session)throw new Error('Sign in to view private information.');privateRecords=(await api('private')).records;hydrate();return clone(privateRecords);},
  async create(kind,data){const response=await api('private/'+kind,data);privateRecords.unshift(response.record);hydrate();return response.record;},
  async write(kind,rows){if(!platform.session)throw new Error('Sign in to save private information.');for(const row of rows){const previous=privateRecords.find(r=>r.id===row.id&&r.kind===kind);if(!previous){const saved=await this.create(kind,{...row,visibility:['prayer','ride','visit','salvation'].includes(kind)&&row.churchId?'pastors':'private'});Object.assign(row,saved);}else if(previous.status!==row.status){await api('private/'+kind+'/'+encodeURIComponent(row.id),{status:row.status,revision:previous.revision,driver:row.driver,pickupWindow:row.pickupWindow},'PUT');}}privateRecords=(await api('private')).records;hydrate();return rows;}
 };
 function hydrate(){const managed=document.body?.hasAttribute('data-admin-workspace');const source=managed?workspace:publicRecords;for(const [kind,key]of Object.entries(catalogKeys))memory.set(key,JSON.stringify(source.filter(row=>row.kind===kind)));for(const [kind,key]of Object.entries(privateKeys))memory.set(key,JSON.stringify(kind==='settings'?(privateRecords.find(row=>row.kind===kind)||{}):privateRecords.filter(row=>row.kind===kind)));for(const row of privateRecords.filter(row=>row.kind==='reflection')){const key='mwe.meditation.reflections.'+row.entityId;const list=JSON.parse(memory.get(key)||'[]');if(!list.some(n=>n.id===row.id))list.push(row);memory.set(key,JSON.stringify(list));}if(platform.session){memory.set('mwe.userLoggedIn','true');memory.set('mwe.username',platform.session.name);memory.set('mwe.userEmail',platform.session.email);if(platform.session.isCreator)memory.set('mwe.creator.account.v1',JSON.stringify(platform.session));}else{memory.delete('mwe.userLoggedIn');memory.delete('mwe.creator.account.v1');}}
 function install(){
  const m=root.MWE,f=root.FaithLinkModules,c=root.MWECreator;
  if(m){m.isMemberAuthenticated=()=>!!platform.session;if(m.normalizeChurch){m.getChurches=()=>platform.records('churches',document.body.hasAttribute('data-admin-workspace')).map(row=>({...row,...m.normalizeChurch(row)}));}m.upsertChurch=row=>platform.staging?row:platform.save('churches',row);m.upsertEvent=row=>platform.staging?row:platform.save('events',row);}
  if(c){c.account=()=>platform.session;c.setAccount=()=>platform.session;}
  if(f){f.upsertProduct=row=>platform.staging?row:platform.save('products',row);f.addChannel=row=>platform.save('channels',row);f.addResource=row=>platform.save('resources',row);f.getMessages=()=>personal.get('message').map(row=>({...row,read:row.status==='read',participantId:row.entityId}));f.refreshMessages=()=>personal.refresh();f.sendMessage=row=>personal.create('message',{...row,entityId:row.entityId||row.participantId});f.getMessageSettings=()=>personal.get('settings')[0]||{forwardingEnabled:false};f.saveMessageSettings=row=>personal.create('settings',row);}
  for(const [kind,mod]of Object.entries(root.MWEAdmin?.modules||{})){
   const original=mod.save,groups=mod.groups;
   mod.get=()=>platform.records(kind,true);
   mod.groups=()=>groups().map(g=>({...g,fields:g.fields.filter(field=>!['verified','streamPaid'].includes(field.key)).map(field=>field.key==='storeId'?{...field,options:[['','Choose a store'],...platform.records('store',true).filter(s=>s.canManage).map(s=>[s.id,s.name])]}:field)})).concat({title:'Publication',fields:[{key:'publicationState',label:'Publication state',type:'select',required:true,options:platform.role==='owner'?['draft','pending','published','archived']:['draft','pending','archived']}]});
   mod.save=async(record,values)=>{const existing=workspace.find(row=>row.kind===kind&&row.id===record.id);if(existing&&!existing.canManage)throw new Error('You have read-only access to this record.');platform.staging=true;let transformed;try{transformed=original(record,values);}finally{platform.staging=false;}return platform.save(kind,{...transformed,publicationState:values.publicationState});};
  }
  document.addEventListener('click',event=>{const button=event.target.closest('#create-channel-button,#create-resource-button,#create-room-button,#add-product-button,[data-edit-product],[data-delete-product]');if(button){event.preventDefault();event.stopImmediatePropagation();location.href='creator-workspace.html';}},true);
  platform.installed=true;
  const authenticated=!!platform.session && (!document.body.hasAttribute('data-admin-workspace') || platform.role==='owner' || (document.body.hasAttribute('data-creator-workspace')&&platform.role==='creator'));
  document.body.classList.toggle('is-authenticated',authenticated);
 }
 const dom=new Promise(resolve=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',resolve,{once:true}):resolve());
 platform.ready=(async()=>{
  let authenticatedUser=null;
  try{
   const session=await api('auth/session');authenticatedUser=session.user||null;await dom;
   if(authenticatedUser){platform.session=authenticatedUser;hydrate();}
   await platform.refresh(authenticatedUser);install();
  }catch(error){
   platform.error=error.message;await dom;
   if(authenticatedUser){platform.session=authenticatedUser;hydrate();install();return;}
   platform.clear();
   if(['127.0.0.1','localhost'].includes(location.hostname)){platform.staging=true;platform.installed=true;return;}
   install();const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent='Connected data is unavailable. Please reload to try again.';notice.style.cssText='padding:1rem;text-align:center';document.body.prepend(notice);
  }
 })();
})(window);
