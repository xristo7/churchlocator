(async function () {
  const root = document.getElementById("creator-studio");
  const platform = window.MWEPlatform;
  const auth = window.MWEAuth;
  await platform?.ready;

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const icon = name => `<i data-lucide="${name}"></i>`;
  const query = new URLSearchParams(location.search);
  const aliases = { church:"churches", event:"events", product:"products", channel:"channels", resource:"resources" };
  const kinds = {
    churches: { label:"Church", plural:"churches", icon:"church", description:"Create a public church profile with services, location, and a clear first-visit invitation.", sections:[
      ["Church identity","Help people recognize and find your church.",[ ["name","Church name","text",true],["city","City","text",true],["country","Country","select",true,["CA|Canada","US|United States"]],["postal","Postal / ZIP code","text"],["denomination","Denomination","select",true,["Pentecostal","Full Gospel","Charismatic","Baptist","Catholic","Anglican","Presbyterian","Protestant"]],["language","Primary language","select",true,["English","French","Spanish"]],["worship","Worship style","select",true,["Contemporary","Traditional","Blended","Charismatic"]] ]],
      ["Welcome & contact","Give visitors enough information to take a confident next step.",[ ["about","Welcome message","textarea",true,null,"What should a first-time visitor know?"],["email","Public email","email",true],["phone","Public phone","tel"],["website","Website","url"],["sunday","Main service time","text",true,null,"For example, Sundays at 10:00 AM"],["photo","Cover image URL","url"] ]]
    ], defaults:{ country:"CA", language:"English", worship:"Contemporary", livestream:{enabled:false,paid:false,url:""} } },
    events: { label:"Event", plural:"events", icon:"calendar-plus", description:"Set up a gathering, conference, livestream, or outreach with clear logistics.", sections:[
      ["Event details","Tell people what this event is and why it matters.",[ ["title","Event title","text",true],["description","Event description","textarea",true],["eventType","Event format","select",true,["in-person|In person","online|Online","hybrid|Hybrid"]],["coverImageUrl","Cover image URL","url"] ]],
      ["Date & place","Use the local time at the venue.",[ ["startsAt","Starts","datetime-local",true],["endsAt","Ends","datetime-local",true],["venueName","Venue name","text"],["city","City","text",true],["country","Country","select",true,["CA|Canada","US|United States"]],["directionsUrl","Directions URL","url"] ]],
      ["Registration","Choose whether guests need to reserve a place.",[ ["registrationRequired","Registration required","check"],["totalTickets","Capacity","number",false,null,"Use 0 for unlimited."],["ticketPriceCents","Ticket price in cents","number",false,null,"Use 0 for a free event."],["currency","Currency","select",true,["CAD","USD"]],["registrationUrl","Registration link","url"],["livestreamUrl","Livestream link","url"] ]]
    ], defaults:{ eventType:"in-person", country:"CA", currency:"CAD", totalTickets:0, ticketPriceCents:0, registrationRequired:false, isFeatured:false, isPromoted:false } },
    store: { label:"Store", plural:"stores", icon:"store", description:"Create a storefront before adding products or services.", sections:[
      ["Store profile","Describe who is behind the storefront.",[ ["name","Store name","text",true],["ownerName","Owner or ministry name","text",true],["category","Store category","select",true,["Books & Resources","Apparel","Music","Gifts","Church Supplies","General"]],["description","Store description","textarea",true],["email","Store email","email",true],["image","Cover image URL","url"] ]],
      ["Live shopping","Optional: connect your existing broadcast.",[ ["live","Live shopping is available","check"],["liveUrl","Live shopping URL","url"] ]]
    ], defaults:{ category:"Books & Resources", live:false } },
    products: { label:"Product or service", plural:"products", icon:"package-plus", description:"Add a product, digital item, or service to one of your storefronts.", sections:[
      ["Item details","Choose the storefront and describe what someone receives.",[ ["storeId","Storefront","store",true],["title","Product or service name","text",true],["itemType","Item type","select",true,["product|Product","service|Service","digital|Digital item"]],["sellerType","Seller type","select",true,["Church","Channel"]],["category","Category","select",true,["Books","Journals","Apparel","Church Supplies","Study Tools","Kids","Music","Gifts"]],["description","Description","textarea",true],["image","Image URL","url"] ]],
      ["Price & availability","Set a clear price and current availability.",[ ["price","Price (CAD)","number",true,null,"Use dollars, for example 19.99."],["compareAt","Compare-at price (CAD)","number"],["inventory","Available quantity","number",true],["status","Availability","select",true,["Draft","Active","Archived"]],["featured","Feature this item","check"] ]]
    ], defaults:{ itemType:"product", sellerType:"Church", category:"Books", price:0, compareAt:0, inventory:0, status:"Draft", featured:false } },
    channels: { label:"Channel", plural:"channels", icon:"radio-tower", description:"Give your ministry media a recognizable home for teaching, worship, and stories.", sections:[
      ["Channel identity","Make it easy for people to recognize and follow your media.",[ ["name","Channel name","text",true],["owner","Creator or ministry name","text",true],["handle","Channel handle","text",true,null,"Start with @, for example @rivercity."],["topic","Topic","select",true,["Bible Teaching","Worship","Family","Leadership","Youth","Bible Study"]],["description","Channel description","textarea",true] ]],
      ["Media","Add a visual identity and optional live link.",[ ["format","Primary format","select",true,["Podcast","Video","Livestream"]],["cover","Cover image URL","url",true],["avatar","Avatar image URL","url"],["live","Currently live","check"],["liveUrl","Live URL","url"] ]]
    ], defaults:{ topic:"Bible Teaching", format:"Podcast", live:false, posts:0 } },
    resources: { label:"Resource", plural:"resources", icon:"book-open-check", description:"Publish a study guide, devotional, audio, video, or another piece of useful content.", sections:[
      ["Content details","Make the resource clear and useful before you publish it.",[ ["title","Resource title","text",true],["creator","Creator name","text",true],["topic","Topic","select",true,["Bible Study","Prayer","Discipleship","Worship","Devotional","Leadership"]],["description","Description","textarea",true],["type","Content type","select",true,["Text","Audio","Video"]],["format","Format","select",true,["PDF","EPUB","MP3","MP4"]],["duration","Length or duration","text",true],["image","Cover image URL","url",true] ]],
      ["Access","Choose who can open the resource.",[ ["access","Access","select",true,["Free","Paid"]],["price","Price (CAD)","number",true],["sourceUrl","Secure material URL","url",false,null,"Use a trusted HTTPS provider." ]]]
    ], defaults:{ topic:"Bible Study", type:"Text", format:"PDF", access:"Free", price:0 } }
  };

  const user = platform?.session;
  const kindFromQuery = aliases[query.get("kind")] || query.get("kind");
  let activeKind = kinds[kindFromQuery] ? kindFromQuery : null;
  let editing = null;

  function renderIcons() { window.lucide?.createIcons(); }
  function memberLink() { return `index.html?login=required&next=${encodeURIComponent("app.html?view=create")}`; }
  function goToStudio(kind) { const url = new URL(location.href); url.searchParams.set("kind", kind); history.pushState({}, "", url); activeKind=kind; editing=null; render(); }
  function titleFor(record) { return record.name || record.title || "Untitled"; }
  function records() { return platform?.records ? Object.keys(kinds).flatMap(kind => platform.records(kind,true)) : []; }

  function renderUpgrade() {
    if (!user) {
      root.innerHTML = `<section class="cs-upgrade"><div class="cs-card-icon">${icon("log-in")}</div><p class="cs-eyebrow">One member experience</p><h1>Sign in to start creating.</h1><p>Your My Way account is the only account you need. After you sign in, you can unlock creator tools when you are ready to publish a church, event, store, product, or resource.</p><a class="cs-primary" href="${memberLink()}" target="_top">Sign in or create an account ${icon("arrow-right")}</a></section>`;
      renderIcons(); return;
    }
    root.innerHTML = `<section class="cs-upgrade"><div class="cs-card-icon">${icon("sparkles")}</div><p class="cs-eyebrow">Creator tools are ready</p><h1>Turn on creation tools for this account.</h1><p>${esc(user.name)}, your member account stays exactly as it is. Activating creation tools simply adds the ability to prepare and submit churches, events, products, services, channels, and resources.</p><button class="cs-primary" id="cs-upgrade">Activate creator tools ${icon("arrow-right")}</button><p class="cs-message" id="cs-upgrade-message" hidden></p></section>`;
    document.getElementById("cs-upgrade")?.addEventListener("click", async event => {
      const button = event.currentTarget; button.disabled=true; button.textContent="Activating…";
      const result = await auth?.creatorUpgrade();
      if (!result?.ok) { const message=document.getElementById("cs-upgrade-message"); message.hidden=false; message.className="cs-message error"; message.textContent=result?.error || "We could not activate creator tools. Please try again."; button.disabled=false; button.textContent="Activate creator tools"; return; }
      await platform.refresh(result.user); render();
    }); renderIcons();
  }

  function card(kind, config) { return `<button type="button" class="cs-create-card" data-create="${kind}"><span class="cs-card-icon">${icon(config.icon)}</span><h3>${esc(config.label)}</h3><p>${esc(config.description)}</p><span class="cs-card-link">Create ${icon("arrow-right")}</span></button>`; }
  function renderHub() {
    const recent = records().slice(0,5);
    root.innerHTML = `<div class="creator-studio"><section class="cs-hero"><div><p class="cs-eyebrow">Member tools · Creation unlocked</p><h1>Create with the same My Way experience your audience already knows.</h1><p>Use one focused page for each substantial creation. Required details are marked as you go, drafts stay private, and finished work can be submitted for publication.</p></div><div class="cs-user"><span class="cs-avatar">${esc((user?.name||"M").split(/\s+/).map(v=>v[0]).join("").slice(0,2))}</span>${esc(user?.name||"Member")}</div></section><section class="cs-hub"><div class="cs-section-heading"><div><h2>What would you like to create?</h2><p>Start with a blank template. You can save a draft at any point.</p></div></div><div class="cs-create-grid">${Object.entries(kinds).map(([key,value])=>card(key,value)).join("")}</div></section><section class="cs-content-grid"><div class="cs-panel"><h2>Your recent work</h2><div class="cs-records">${recent.length ? recent.map(record=>`<div class="cs-record"><div><strong>${esc(titleFor(record))}</strong><span>${esc(kinds[record.kind]?.label||record.kind)} · ${esc(record.publicationState||record.state||"draft")}</span></div><button type="button" data-edit="${esc(record.id)}" data-kind="${esc(record.kind)}">Continue</button></div>`).join("") : `<div class="cs-empty">Your drafts and submissions will appear here. Start with a creation card above.</div>`}</div></div><div class="cs-panel"><h2>How publishing works</h2><p>Save while you work. When all required details are complete, submit for review. Platform administrators review and publish public listings from the protected owner dashboard.</p></div></section></div>`;
    root.querySelectorAll("[data-create]").forEach(button=>button.addEventListener("click",()=>goToStudio(button.dataset.create)));
    root.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>{ editing=records().find(record=>record.id===button.dataset.edit&&record.kind===button.dataset.kind)||null; goToStudio(button.dataset.kind); }));
    renderIcons();
  }

  function options(values, selected) { return `<option value="">Choose one…</option>${(values||[]).map(value=>{ const [raw,label]=String(value).split("|"); return `<option value="${esc(raw)}"${String(selected??"")===raw?" selected":""}>${esc(label||raw)}</option>`; }).join("")}`; }
  function fieldMarkup(field, data) {
    const [key,label,type,required=false,choices,hint] = field; const value=data[key] ?? ""; const wide=type==="textarea" || key==="description" || key==="about";
    if (type==="check") return `<div class="cs-field ${wide?"wide":""}" data-key="${key}" data-state="complete"><label>${esc(label)}</label><label class="cs-check"><input name="${key}" type="checkbox"${value?" checked":""} /> ${esc(label)}</label></div>`;
    if (type==="store") { const stores=platform.records("store",true).filter(record=>record.canManage); return `<div class="cs-field" data-key="${key}" data-state="${value?"complete":"missing"}"><label for="cs-${key}">${esc(label)} <em>*</em></label><select id="cs-${key}" name="${key}" required>${options(stores.map(record=>`${record.id}|${record.name}`),value)}</select><span class="cs-field-mark">${icon(value?"circle-check":"circle")}</span>${stores.length?"":`<small>Create a storefront first, then return here.</small>`}</div>`; }
    const control = type==="textarea" ? `<textarea id="cs-${key}" name="${key}"${required?" required":""} placeholder="${esc(hint||"")}">${esc(value)}</textarea>` : type==="select" ? `<select id="cs-${key}" name="${key}"${required?" required":""}>${options(choices,value)}</select>` : `<input id="cs-${key}" name="${key}" type="${type}" value="${esc(value)}"${required?" required":""} placeholder="${esc(hint||"")}"${type==="number"?" min=\"0\" step=\"any\"":""} />`;
    return `<div class="cs-field ${wide?"wide":""}" data-key="${key}" data-state="${required&&!String(value).trim()?"missing":"complete"}"><label for="cs-${key}">${esc(label)}${required?" <em>*</em>":""}</label>${control}<span class="cs-field-mark">${icon(required&&!String(value).trim()?"circle":"circle-check")}</span>${hint?`<small>${esc(hint)}</small>`:""}</div>`;
  }
  function sectionMarkup(section, data, index) { const [title,help,fields]=section; return `<section class="cs-form-section" id="cs-section-${index}"><h2>${esc(title)}</h2><p>${esc(help)}</p><div class="cs-fields">${fields.map(field=>fieldMarkup(field,data)).join("")}</div></section>`; }
  function editorRecord() {
    if (editing) return {...editing};
    const defaults = {...kinds[activeKind].defaults};
    if (activeKind === "churches") Object.assign(defaults, { email:user?.email || "" });
    if (activeKind === "store") Object.assign(defaults, { ownerName:user?.name || "", email:user?.email || "" });
    if (activeKind === "products") Object.assign(defaults, { seller:user?.name || "" });
    if (activeKind === "channels") Object.assign(defaults, { owner:user?.name || "" });
    if (activeKind === "resources") Object.assign(defaults, { creator:user?.name || "" });
    return defaults;
  }
  function requiredFields() { return kinds[activeKind].sections.flatMap(section=>section[2]).filter(field=>field[3]); }
  function formData(form) { const value=Object.fromEntries(new FormData(form)); form.querySelectorAll('input[type="checkbox"]').forEach(input=>value[input.name]=input.checked); for (const [key,fieldValue] of Object.entries(value)) if (["price","compareAt","inventory","totalTickets","ticketPriceCents"].includes(key)) value[key]=Number(fieldValue||0); if(activeKind==="resources" && value.access==="Free") value.price=0; return value; }
  function updateReadiness() {
    const form=root.querySelector("#cs-editor-form"); if(!form) return false; const needed=requiredFields(); let complete=0;
    needed.forEach(([key])=>{ const input=form.elements[key]; const valid=!!input && String(input.value||"").trim().length>0 && input.checkValidity(); const field=input?.closest(".cs-field"); if(field){field.dataset.state=valid?"complete":"missing"; field.querySelector(".cs-field-mark").innerHTML=icon(valid?"circle-check":"circle");} if(valid)complete++; });
    const percent=needed.length?Math.round(complete/needed.length*100):100; root.querySelector("#cs-meter").style.width=percent+"%"; root.querySelector("#cs-progress").textContent=`${complete} of ${needed.length} required details complete`;
    const list=root.querySelector("#cs-required-list"); list.innerHTML=needed.map(([key,label])=>{const input=form.elements[key];const done=!!input&&String(input.value||"").trim().length>0&&input.checkValidity();return `<div class="${done?"complete":""}">${icon(done?"circle-check":"circle")}<span>${esc(label)}</span></div>`;}).join(""); return complete===needed.length;
  }
  function renderEditor() {
    const config=kinds[activeKind], data=editorRecord();
    root.innerHTML = `<div class="creator-studio"><button class="cs-back" type="button" id="cs-back">${icon("arrow-left")} All creation tools</button><div class="cs-editor-shell"><aside class="cs-editor-sidebar"><strong>${esc(config.label)} template</strong>${config.sections.map(([title],index)=>`<button type="button" data-section="${index}">${icon(index===0?config.icon:"circle-dot")} ${esc(title)}</button>`).join("")}</aside><div><header class="cs-editor-head"><p class="cs-eyebrow">${editing?"Continue your draft":"New creation"}</p><h1>${editing?`Edit ${esc(titleFor(editing))}`:`Create a ${esc(config.label.toLowerCase())}`}</h1><p>${esc(config.description)} Required fields are highlighted as you complete them.</p></header><form id="cs-editor-form" class="cs-editor-form" novalidate>${config.sections.map((section,index)=>sectionMarkup(section,data,index)).join("")}</form></div><aside class="cs-readiness"><strong>Publication readiness</strong><div class="cs-meter"><span id="cs-meter"></span></div><p id="cs-progress"></p><div class="cs-ready-list" id="cs-required-list"></div><div class="cs-ready-actions"><button class="cs-secondary" type="button" id="cs-save">Save draft</button><button class="cs-primary" type="button" id="cs-publish">Submit for review ${icon("send")}</button></div><p class="cs-message" id="cs-message" hidden></p></aside></div></div>`;
    document.getElementById("cs-back").onclick=()=>{activeKind=null;editing=null;const url=new URL(location.href);url.searchParams.delete("kind");history.pushState({},"",url);render();};
    root.querySelectorAll("[data-section]").forEach(button=>button.onclick=()=>document.getElementById("cs-section-"+button.dataset.section)?.scrollIntoView({behavior:"smooth",block:"start"}));
    const form=root.querySelector("#cs-editor-form"); form.addEventListener("input",updateReadiness); form.addEventListener("change",updateReadiness);
    const submit = async publicationState => { const ready=updateReadiness(); const message=document.getElementById("cs-message"); if(publicationState==="pending"&&!ready){message.hidden=false;message.className="cs-message error";message.textContent="Complete the highlighted required details before submitting for review.";form.querySelector(".cs-field[data-state=\"missing\"] input,.cs-field[data-state=\"missing\"] select,.cs-field[data-state=\"missing\"] textarea")?.focus();return;} const button=document.getElementById(publicationState==="pending"?"cs-publish":"cs-save");button.disabled=true;const original=button.textContent;button.textContent=publicationState==="pending"?"Submitting…":"Saving…";try {const saved=await platform.save(activeKind,{...formData(form),publicationState,...(editing?{id:editing.id,revision:editing.revision}:{})});editing=saved;message.hidden=false;message.className="cs-message success";message.textContent=publicationState==="pending"?"Submitted for administrator review. We’ll publish it after approval.":"Draft saved. You can return and finish it anytime.";button.textContent=publicationState==="pending"?"Submitted for review":"Saved";} catch(error){message.hidden=false;message.className="cs-message error";message.textContent=error.message||"We could not save this creation.";button.disabled=false;button.textContent=original;}};
    document.getElementById("cs-save").onclick=()=>submit("draft"); document.getElementById("cs-publish").onclick=()=>submit("pending"); updateReadiness(); renderIcons();
  }
  function render() { if(!user || !user.isCreator) return renderUpgrade(); if(activeKind) return renderEditor(); renderHub(); }
  window.addEventListener("popstate",()=>{const next=aliases[new URLSearchParams(location.search).get("kind")]||new URLSearchParams(location.search).get("kind");activeKind=kinds[next]?next:null;editing=null;render();});
  render();
})();
