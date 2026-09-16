from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
def edit(name,fn):
 p=root/name;original=p.read_text(encoding='utf-8');updated=fn(original)
 if updated!=original:p.write_text(updated,encoding='utf-8',newline='\n')
edit('package.json',lambda s:s.replace('"^2.4.0"','"2.4.0"'))
edit('public/platform-client.js',lambda s:s.replace("events:'mwe.platform.events.v1'","events:'mwe.platform.events.v4'"))
edit('src/trusted-platform.js',lambda s:s.replace('Number(data.registrationRequired)','Number(!!data.registrationRequired)').replace('Number(data.isFeatured)','Number(!!data.isFeatured)').replace('Number(data.isPromoted)','Number(!!data.isPromoted)'))
for p in (root/'public').glob('*.html'):
 edit(str(p.relative_to(root)),lambda s:re.sub(r'(<script\b[^>]*src="app\.js[^>]*>)',r'<script defer src="platform-client.js?v=20260915trusted1"></script>\1',s,count=1) if 'platform-client.js' not in s else s)
for name in ['app.js','admin-workspace.js','creator-account.js','channels.js','channel-detail.js','channel-content.js','messages.js','store.js','storefront.js','product-detail.js','cart.js','checkout.js','seller-dashboard.js','resources.js','resource-detail.js','resource-reader.js','member-home.js','creator-public.js']:
 if not (root/'public'/name).exists():continue
 edit('public/'+name,lambda s:s.replace('document.addEventListener("DOMContentLoaded", () => {','document.addEventListener("DOMContentLoaded", async () => {\n  await window.MWEPlatform?.ready;'))
edit('public/app.js',lambda s:s.replace('    getChurches,\n','    normalizeChurch,\n    getChurches,\n',1))
edit('public/app-shell.js',lambda s:s.replace('(function initFaithLinkMemberShell() {','(async function initFaithLinkMemberShell() {\n  await window.MWEPlatform?.ready;',1))
edit('public/meditation.js',lambda s:s.replace('(function initMeditationSanctuary() {','(async function initMeditationSanctuary() {',1).replace('  const roomsCatalog = getRooms();','  await window.MWEPlatform?.ready;\n  const roomsCatalog = getRooms();',1))
edit('public/meditation.js',lambda s:re.sub(r'  function isCurrentHost\(\) \{.*?\n  \}',"  function isCurrentHost() {\n    return !!activeRoom && !!window.MWEPlatform?.canManage('meditation',activeRoom.id);\n  }",s,count=1,flags=re.S))
edit('public/admin-workspace.js',lambda s:re.sub(r'        const saved = mod.save\(record, values\);.*?\n        dirty = false;',"        const saved = await mod.save(record, values);\n        const message = saved.publicationState === 'published' ? 'Saved and published.' : 'Saved to the server. Publication: ' + saved.publicationState + '.';\n        dirty = false;",s,count=1,flags=re.S).replace('Local changes stay on this device.','Approved publications appear across the platform.').replace('      const data = record ? (mod.flatten ? mod.flatten(record) : record) : mod.defaults();','      const data = record ? (mod.flatten ? mod.flatten(record) : record) : mod.defaults();\n      data.publicationState = creator && record?.publicationState === "published" ? "pending" : record?.publicationState || "draft";'))
edit('public/creator-model.js',lambda s:s.replace('store.createdBy !== root.MWECreator.account()?.id','(root.MWEPlatform ? !store.canManage : store.createdBy !== root.MWECreator.account()?.id)').replace('existing.createdBy !== current.id','(root.MWEPlatform ? !existing.canManage : existing.createdBy !== current.id)'))
# Existing private-form successes now wait for the database, without reading old browser caches.
def private_forms(s):
 for name in ['handleRideSubmit','handleGlobalVisitSubmit','handlePrayerSubmit','handleSalvationSubmit','handleFoundationAppSubmit']:
  s=s.replace('MWE.'+name+' = function(e) {','MWE.'+name+' = async function(e) {')
 for key,kind,var in [('mwe.ride_requests','ride','rides'),('mwe.visit_requests','visit','visitRequests'),('mwe.prayer_requests','prayer','prayers'),('mwe.salvation_decisions','salvation','salvations'),('mwe.foundation_apps','foundation','apps')]:
  old='  localStorage.setItem("'+key+'", JSON.stringify('+var+'));'
  s=s.replace(old,'  try { await window.MWEPrivate.write("'+kind+'", '+var+'); } catch (error) { showToast(error.message); return; }')
 for name in ['confirmRideStage1','confirmRideSchedule']:
  s=s.replace('MWE.'+name+' = function(','MWE.'+name+' = async function(')
 # Remove the duplicate salvation handler which discarded the selected church.
 starts=[m.start() for m in re.finditer(r'MWE.handleSalvationSubmit = async function\(e\) \{',s)]
 if len(starts)==2:
  end=s.index('\nMWE.openFoundationAppModal',starts[1]);s=s[:starts[1]]+s[end:]
 s=s.replace('Visit Pass Confirmed!','Visit request received!').replace('Application submitted successfully! Our super-admin team will review your organization details.','Application saved privately to your account.').replace('const passCode = "PASS-" + Math.random().toString(36).substring(2, 9).toUpperCase();','const passCode = "REQUEST-" + crypto.randomUUID().slice(0,8).toUpperCase();')
 return s
edit('public/app.js',private_forms)
def reflections(s):
 start=s.index('  function setupReflectionModal()');end=s.index('  function setupScrubberControls()',start);part=s[start:end]
 part=part.replace('saveBtn.addEventListener("click", () => {','saveBtn.addEventListener("click", async () => {')
 part=part.replace('        localStorage.setItem(key, JSON.stringify(notes));','        try { await window.MWEPrivate.create("reflection", {...notes[0], entityId:activeRoom.id}); } catch(error) { showToast(error.message); return; }')
 return s[:start]+part+s[end:]
edit('public/meditation.js',reflections)
edit('public/messages.js',lambda s:s.replace('addEventListener("submit", event => {','addEventListener("submit", async event => {').replace('data().sendMessage({','const saved = await data().sendMessage({').replace('threadId: selectedThread, participantId: person.participantId,','threadId: selectedThread, replyTo: person.id, entityId: person.entityId || person.participantId, participantId: person.participantId,').replace('draftThread = null; renderConversation();','selectedThread = saved.threadId; draftThread = null; renderConversation();').replace('const saved = data().saveMessageSettings','const saved = await data().saveMessageSettings'))
# The legacy editors cannot represent trusted tenant IDs or upload protection. Open the connected editor.
edit('public/platform-client.js',lambda s:s.replace('  platform.installed=true;',"  document.addEventListener('click',event=>{const button=event.target.closest('#create-channel-button,#create-resource-button,#create-room-button,#add-product-button,[data-edit-product],[data-delete-product]');if(button){event.preventDefault();event.stopImmediatePropagation();location.href='creator-workspace.html';}},true);\n  platform.installed=true;"))
edit('wrangler.jsonc',lambda s:s.replace('"AUTH_BYPASS": "false"','"PUBLIC_ORIGIN": "https://my-way-of-evangelism.doxalight-inc.workers.dev"',1).replace('"AUTH_BYPASS": "false"','"PUBLIC_ORIGIN": "https://my-way-of-evangelism-preview.doxalight-inc.workers.dev"',1))
