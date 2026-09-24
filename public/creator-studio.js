(async function () {
  const root = document.getElementById("creator-studio");
  const platform = window.MWEPlatform;
  const auth = window.MWEAuth;
  await platform?.ready;

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const icon = name => `<i data-lucide="${name}"></i>`;
  const query = new URLSearchParams(location.search);
  const aliases = { church:"churches", event:"events", product:"products", channel:"channels", resource:"resources", meditation:"meditation" };
  const kinds = {
    churches: { label:"Church", plural:"churches", icon:"church", description:"Create a public church profile with services, location, and a clear first-visit invitation.", sections:[
      ["Church identity","Help people recognize and find your church.",[ ["name","Church name","text",true],["city","City","text",true],["country","Country","select",true,["CA|Canada","US|United States"]],["postal","Postal / ZIP code","text"],["denomination","Denomination","select",true,["Pentecostal","Full Gospel","Charismatic","Baptist","Catholic","Anglican","Presbyterian","Protestant"]],["language","Primary language","select",true,["English","French","Spanish"]],["worship","Worship style","select",true,["Contemporary","Traditional","Blended","Charismatic"]] ]],
      ["Welcome & contact","Give visitors enough information to take a confident next step.",[ ["about","Welcome message","textarea",true,null,"What should a first-time visitor know?"],["email","Public email","email",true],["phone","Public phone","tel"],["website","Website","url"],["sunday","Main service time","text",true,null,"For example, Sundays at 10:00 AM"],["photo","Church cover photo","image"] ]]
    ], defaults:{ country:"CA", language:"English", worship:"Contemporary", livestream:{enabled:false,paid:false,url:""} } },
    events: { label:"Event", plural:"events", icon:"calendar-plus", description:"Set up a gathering, conference, livestream, or outreach with clear logistics.", sections:[
      ["Event details","Tell people what this event is and why it matters.",[ ["title","Event title","text",true],["description","Event description","textarea",true],["eventType","Event format","select",true,["in-person|In person","online|Online","hybrid|Hybrid"]],["coverImageUrl","Event cover photo","image"] ]],
      ["Date & place","Use the local time at the venue.",[ ["startsAt","Starts","datetime-local",true],["endsAt","Ends","datetime-local",true],["venueName","Venue name","text"],["city","City","text",true],["country","Country","select",true,["CA|Canada","US|United States"]],["directionsUrl","Directions URL","url"] ]],
      ["Registration","Choose whether guests need to reserve a place.",[ ["registrationRequired","Registration required","check"],["totalTickets","Capacity","number",false,null,"Use 0 for unlimited."],["ticketPriceCents","Ticket price in cents","number",false,null,"Use 0 for a free event."],["currency","Currency","select",true,["CAD","USD"]],["registrationUrl","Registration link","url"],["livestreamUrl","Livestream link","url"] ]]
    ], defaults:{ eventType:"in-person", country:"CA", currency:"CAD", totalTickets:0, ticketPriceCents:0, registrationRequired:false, isFeatured:false, isPromoted:false } },
    meditation: { label:"Meditation room", plural:"meditation rooms", icon:"sparkles", description:"Create a guided Christian sanctuary with a distinct atmosphere, prayer purpose, and contemplative rhythm.", sections:[
      ["Room identity","Give your sanctuary a welcoming name and clear spiritual direction.",[ ["title","Room title","text",true], ["ownerName","Creator or ministry name","text",true], ["subtitle","Short description","textarea",true,null,"Describe the invitation into this room."], ["category","Collection","select",true,["featured|Featured","bible-books|Bible books","themes|Themes","community|Community"]], ["purpose","Meditation purpose","select",true,["prayer|Contemplative prayer","scriptural|Scriptural contemplation","motivational|Motivational encouragement","teaching|Audio teaching","worship|Christian worship","nature|Nature reflection"]] ]],
      ["Sanctuary design","Choose the visual template and atmosphere visitors will experience.",[ ["template","Room style","select",true,["timer|Be Still - countdown timer","ripple|Breath Prayer - glowing ripples","journey|Prayer Journey - four milestones","nature|Nature Teaching - guided audio","sunburst|Joy & Praise - sunburst"]], ["theme","Atmosphere","select",true,["chapel|Quiet chapel","forest|Forest stillness","ocean|Open water","sunrise|Sunrise glow","stream|Living stream","mountains|Mountain refuge","stars|Night sky"]], ["themeColor","Accent color","text",true,null,"Use a hex color such as #4a5d3f."], ["durationMinutes","Session length in minutes","number",true,null,"Use 0 for an open-ended session."], ["timeMode","Session mode","select",true,["timed|Timed contemplation","teaching|Teaching / guided audio"]], ["toneFreq","Tone frequency","number",false,null,"Optional resonance used by the room audio."], ["selectedAudio","Opening audio","select",true,["bible|Audio Bible","instrumental|Soaking instrumental","worship|Christian worship","sermon|Spoken teaching","silence|Silence and ambience"]], ["autoPlayInterval","Auto-advance interval (seconds)","number",false,null,"Used for scripture or guided progression."], ["allowUserNavigation","Let visitors navigate freely","check"], ["commentsEnabled","Enable live comments","check"] ]],
      ["Style direction","These controls preserve what makes each room style different. Complete the fields that belong to the selected style.",[ ["inhaleWord","Ripple inhale word","text",false,null,"Breath Prayer only - for example Jesus"], ["exhaleWord","Ripple exhale word","text",false,null,"Breath Prayer only - for example Give Me Peace"], ["journeySteps","Journey milestones (JSON)","textarea",false,null,'Prayer Journey only - four objects with name, prompt, verse, and ref.'], ["ambience","Nature soundscape mix (JSON)","textarea",false,null,'Nature Teaching and other rooms - for example {"rain":15,"stream":30,"fire":0,"breeze":20}.'], ["icon","Praise or room icon","text",false,null,"Joy & Praise can use a sun, heart, cross, or another Lucide icon."], ["cover","Cover image URL","url",false,null,"Optional image used as the room cover."], ["verses","Featured scriptures (JSON)","textarea",false,null,"Optional array of scripture objects with topic, text, and ref." ] ]]
    ], defaults:{ category:"featured", purpose:"prayer", template:"timer", theme:"chapel", themeColor:"#4a5d3f", durationMinutes:20, timeMode:"timed", toneFreq:432, selectedAudio:"bible", autoPlayInterval:300, allowUserNavigation:true, commentsEnabled:false, inhaleWord:"Jesus", exhaleWord:"Give Me Peace", journeySteps:JSON.stringify([{name:"Praise",prompt:"What attribute of God fills your heart with gratitude today?",verse:"",ref:""},{name:"Surrender",prompt:"What are you ready to place in God's hands?",verse:"",ref:""},{name:"Ask",prompt:"What would you like to bring before God?",verse:"",ref:""},{name:"Listen",prompt:"Be still and listen.",verse:"",ref:""}],null,2), ambience:JSON.stringify({rain:0,stream:0,fire:0,breeze:15}), icon:"sparkles", verses:"" } },
    store: { label:"Store", plural:"stores", icon:"store", description:"Create a storefront before adding products or services.", sections:[
      ["Store profile","Describe who is behind the storefront.",[ ["name","Store name","text",true],["ownerName","Owner or ministry name","text",true],["category","Store category","select",true,["Books & Resources","Apparel","Music","Gifts","Church Supplies","General"]],["description","Store description","textarea",true],["email","Store email","email",true],["image","Store cover photo","image"] ]],
      ["Live shopping","Optional: connect your existing broadcast.",[ ["live","Live shopping is available","check"],["liveUrl","Live shopping URL","url"] ]]
    ], defaults:{ category:"Books & Resources", live:false } },
    products: { label:"Product or service", plural:"products", icon:"package-plus", description:"Add a product, digital item, or service to one of your storefronts.", sections:[
      ["Item details","Choose the storefront and describe what someone receives.",[ ["storeId","Storefront","store",true],["title","Product or service name","text",true],["itemType","Item type","select",true,["product|Product","service|Service","digital|Digital item"]],["sellerType","Seller type","select",true,["Church","Channel"]],["category","Category","select",true,["Books","Journals","Apparel","Church Supplies","Study Tools","Kids","Music","Gifts"]],["description","Description","textarea",true],["image","Product or service photo","image"] ]],
      ["Price & availability","Set a clear price and current availability.",[ ["price","Price (CAD)","number",true,null,"Use dollars, for example 19.99."],["compareAt","Compare-at price (CAD)","number"],["inventory","Available quantity","number",true],["status","Availability","select",true,["Draft","Active","Archived"]],["featured","Feature this item","check"] ]]
    ], defaults:{ itemType:"product", sellerType:"Church", category:"Books", price:0, compareAt:0, inventory:0, status:"Draft", featured:false } },
    channels: { label:"Channel", plural:"channels", icon:"radio-tower", description:"Give your ministry media a recognizable home for teaching, worship, and stories.", sections:[
      ["Channel identity","Make it easy for people to recognize and follow your media.",[ ["name","Channel name","text",true],["owner","Creator or ministry name","text",true],["handle","Channel handle","text",true,null,"Start with @, for example @rivercity."],["topic","Topic","select",true,["Bible Teaching","Worship","Family","Leadership","Youth","Bible Study"]],["description","Channel description","textarea",true] ]],
      ["Media","Add a visual identity and optional live link.",[ ["format","Primary format","select",true,["Podcast","Video","Livestream"]],["cover","Channel cover photo","image",true],["avatar","Channel avatar","image"],["live","Currently live","check"],["liveUrl","Live URL","url"] ]]
    ], defaults:{ topic:"Bible Teaching", format:"Podcast", live:false, posts:0 } },
    resources: { label:"Resource", plural:"resources", icon:"book-open-check", description:"Publish a study guide, devotional, audio, video, or another piece of useful content.", sections:[
      ["Content details","Make the resource clear and useful before you publish it.",[ ["title","Resource title","text",true],["creator","Creator name","text",true],["topic","Topic","select",true,["Bible Study","Prayer","Discipleship","Worship","Devotional","Leadership"]],["description","Description","textarea",true],["type","Content type","select",true,["Text","Audio","Video"]],["format","Format","select",true,["PDF","EPUB","MP3","MP4"]],["duration","Length or duration","text",true],["image","Resource cover photo","image",true] ]],
      ["Access","Choose who can open the resource.",[ ["access","Access","select",true,["Free","Paid"]],["price","Price (CAD)","number",true],["sourceUrl","Secure material URL","url",false,null,"Use a trusted HTTPS provider." ]]]
    ], defaults:{ topic:"Bible Study", type:"Text", format:"PDF", access:"Free", price:0 } }
  };

  let user = platform?.session;
  const kindFromQuery = aliases[query.get("kind")] || query.get("kind");
  let activeKind = kinds[kindFromQuery] ? kindFromQuery : null;
  let editing = null;
  const pendingUploads = new Set();

  function renderIcons() { window.lucide?.createIcons(); }
  function memberLink() { return `index.html?login=required&next=${encodeURIComponent("app.html?view=create")}`; }
  function goToStudio(kind, record = null) { const url = new URL(location.href); url.searchParams.set("kind", kind); history.pushState({}, "", url); activeKind=kind; editing=record; render(); }
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
      await platform.refresh(result.user); user = platform.session; render();
    }); renderIcons();
  }

  function card(kind, config) { return `<button type="button" class="cs-create-card" data-create="${kind}"><span class="cs-card-icon">${icon(config.icon)}</span><h3>${esc(config.label)}</h3><p>${esc(config.description)}</p><span class="cs-card-link">Create ${icon("arrow-right")}</span></button>`; }
  function renderHub() {
    const recent = records().slice(0,5);
    root.innerHTML = `<div class="creator-studio"><section class="cs-hero"><div><p class="cs-eyebrow">Member tools · Creation unlocked</p><h1>Create with the same My Way experience your audience already knows.</h1><p>Use one focused page for each substantial creation. Required details are marked as you go, drafts stay private, and finished work can be submitted for publication.</p></div><div class="cs-user"><span class="cs-avatar">${esc((user?.name||"M").split(/\s+/).map(v=>v[0]).join("").slice(0,2))}</span>${esc(user?.name||"Member")}</div></section><section class="cs-hub"><div class="cs-section-heading"><div><h2>What would you like to create?</h2><p>Start with a blank template. You can save a draft at any point.</p></div></div><div class="cs-create-grid">${Object.entries(kinds).map(([key,value])=>card(key,value)).join("")}</div></section><section class="cs-content-grid"><div class="cs-panel"><h2>Your recent work</h2><div class="cs-records">${recent.length ? recent.map(record=>`<div class="cs-record"><div><strong>${esc(titleFor(record))}</strong><span>${esc(kinds[record.kind]?.label||record.kind)} · ${esc(record.publicationState||record.state||"draft")}</span></div><button type="button" data-edit="${esc(record.id)}" data-kind="${esc(record.kind)}">Continue</button></div>`).join("") : `<div class="cs-empty">Your drafts and submissions will appear here. Start with a creation card above.</div>`}</div></div><div class="cs-panel"><h2>How publishing works</h2><p>Save while you work. When all required details are complete, submit for review. Platform administrators review and publish public listings from the protected owner dashboard.</p></div></section></div>`;
    root.querySelectorAll("[data-create]").forEach(button=>button.addEventListener("click",()=>goToStudio(button.dataset.create)));
    root.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>goToStudio(button.dataset.kind, records().find(record=>record.id===button.dataset.edit&&record.kind===button.dataset.kind)||null)));
    renderIcons();
  }

  function options(values, selected) { return `<option value="">Choose one…</option>${(values||[]).map(value=>{ const [raw,label]=String(value).split("|"); return `<option value="${esc(raw)}"${String(selected??"")===raw?" selected":""}>${esc(label||raw)}</option>`; }).join("")}`; }
  function fieldMarkup(field, data) {
    const [key,label,type,required=false,choices,hint] = field; const value=data[key] ?? ""; const wide=type==="textarea" || type==="image" || key==="description" || key==="about";
    if (type==="check") return `<div class="cs-field ${wide?"wide":""}" data-key="${key}" data-state="complete"><label>${esc(label)}</label><label class="cs-check"><input name="${key}" type="checkbox"${value?" checked":""} /> ${esc(label)}</label></div>`;
    if (type==="store") { const stores=platform.records("store",true).filter(record=>record.canManage); return `<div class="cs-field" data-key="${key}" data-state="${value?"complete":"missing"}"><label for="cs-${key}">${esc(label)} <em>*</em></label><select id="cs-${key}" name="${key}" required>${options(stores.map(record=>`${record.id}|${record.name}`),value)}</select><span class="cs-field-mark">${icon(value?"circle-check":"circle")}</span>${stores.length?"":`<small>Create a storefront first, then return here.</small>`}</div>`; }
    if (type==="image") return `<div class="cs-field cs-image-field ${wide?"wide":""}" data-key="${key}" data-state="${required&&!String(value).trim()?"missing":"complete"}"><label for="cs-${key}">${esc(label)}${required?" <em>*</em>":""}</label><input id="cs-${key}" class="cs-image-picker" type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-image-picker aria-describedby="cs-${key}-help" /><input type="hidden" name="${key}" value="${esc(value)}" data-image-value /><div class="cs-image-drop"><div class="cs-image-preview" data-image-preview>${value?`<img src="${esc(value)}" alt="Selected ${esc(label).toLowerCase()}" referrerpolicy="no-referrer" />`:`<span>${icon("image-plus")}</span>`}</div><div><strong>Choose a picture from your device</strong><small id="cs-${key}-help">JPG, PNG, WebP, or GIF · up to 5 MB</small><p data-upload-status></p></div></div><span class="cs-field-mark">${icon(required&&!String(value).trim()?"circle":"circle-check")}</span></div>`;
    const control = type==="textarea" ? `<textarea id="cs-${key}" name="${key}"${required?" required":""} placeholder="${esc(hint||"")}">${esc(value)}</textarea>` : type==="select" ? `<select id="cs-${key}" name="${key}"${required?" required":""}>${options(choices,value)}</select>` : `<input id="cs-${key}" name="${key}" type="${type}" value="${esc(value)}"${required?" required":""} placeholder="${esc(hint||"")}"${type==="number"?" min=\"0\" step=\"any\"":""} />`;
    return `<div class="cs-field ${wide?"wide":""}" data-key="${key}" data-state="${required&&!String(value).trim()?"missing":"complete"}"><label for="cs-${key}">${esc(label)}${required?" <em>*</em>":""}</label>${control}<span class="cs-field-mark">${icon(required&&!String(value).trim()?"circle":"circle-check")}</span>${hint?`<small>${esc(hint)}</small>`:""}</div>`;
  }
  function sectionMarkup(section, data, index) { const [title,help,fields]=section; return `<section class="cs-form-section" id="cs-section-${index}"><h2>${esc(title)}</h2><p>${esc(help)}</p><div class="cs-fields">${fields.map(field=>fieldMarkup(field,data)).join("")}</div></section>`; }
  function editorRecord() {
    const defaults = editing ? {...editing} : {...kinds[activeKind].defaults};
    if (!editing && activeKind === "churches") Object.assign(defaults, { email:user?.email || "" });
    if (!editing && activeKind === "store") Object.assign(defaults, { ownerName:user?.name || "", email:user?.email || "" });
    if (!editing && activeKind === "products") Object.assign(defaults, { seller:user?.name || "" });
    if (!editing && activeKind === "channels") Object.assign(defaults, { owner:user?.name || "" });
    if (!editing && activeKind === "resources") Object.assign(defaults, { creator:user?.name || "" });
    if (!editing && activeKind === "meditation") Object.assign(defaults, { ownerName:user?.name || "" });
    if (activeKind === "meditation") {
      for (const key of ["journeySteps","ambience","verses"]) {
        if (defaults[key] && typeof defaults[key] !== "string") defaults[key] = JSON.stringify(defaults[key], null, 2);
      }
    }
    return defaults;
  }
  function requiredFields() { return kinds[activeKind].sections.flatMap(section=>section[2]).filter(field=>field[3]); }
  function formData(form) { const value=Object.fromEntries(new FormData(form)); form.querySelectorAll('input[type="checkbox"]').forEach(input=>value[input.name]=input.checked); for (const [key,fieldValue] of Object.entries(value)) if (["price","compareAt","inventory","totalTickets","ticketPriceCents","durationMinutes","toneFreq","autoPlayInterval","themeHue"].includes(key)) value[key]=Number(fieldValue||0); if(activeKind==="meditation") { for (const key of ["journeySteps","ambience","verses"]) { if (!String(value[key]||"").trim()) { delete value[key]; continue; } try { value[key]=JSON.parse(value[key]); } catch { throw new Error(`The ${key} field must contain valid JSON.`); } } if (value.timeMode === "teaching") value.purpose = value.purpose || "teaching"; } if(activeKind==="resources" && value.access==="Free") value.price=0; return value; }
  async function uploadImage(input) {
    const image = input.files?.[0];
    if (!image) return;
    const field = input.closest(".cs-image-field"), value = field.querySelector("[data-image-value]"), preview = field.querySelector("[data-image-preview]"), status = field.querySelector("[data-upload-status]");
    const allowed = ["image/jpeg","image/png","image/webp","image/gif"];
    if ((image.type && !allowed.includes(image.type)) || image.size > 5 * 1024 * 1024) {
      status.textContent = "Choose a JPG, PNG, WebP, or GIF image smaller than 5 MB.";
      status.className = "error";
      input.value = "";
      return;
    }
    const localPreview = URL.createObjectURL(image);
    preview.innerHTML = `<img src="${localPreview}" alt="Selected image preview" />`;
    status.textContent = "Uploading your picture…";
    status.className = "uploading";
    pendingUploads.add(input);
    updateReadiness();
    try {
      const form = new FormData(); form.append("image", image);
      const response = await fetch("/api/media/upload", { method:"POST", body:form, credentials:"same-origin" });
      const result = await response.json().catch(()=>null);
      if (!response.ok || !result?.ok || !result.url) throw new Error(result?.error || "We could not upload that picture.");
      value.value = result.url;
      preview.innerHTML = `<img src="${esc(result.url)}" alt="Selected image preview" />`;
      status.textContent = "Picture ready.";
      status.className = "success";
    } catch (error) {
      input.value = "";
      preview.innerHTML = value.value ? `<img src="${esc(value.value)}" alt="Selected image preview" referrerpolicy="no-referrer" />` : `<span>${icon("image-plus")}</span>`;
      status.textContent = error.message || "We could not upload that picture.";
      status.className = "error";
    } finally {
      URL.revokeObjectURL(localPreview);
      pendingUploads.delete(input);
      updateReadiness();
    }
  }
  function updateReadiness() {
    const form=root.querySelector("#cs-editor-form"); if(!form) return false; const needed=requiredFields(); let complete=0;
    needed.forEach(([key])=>{ const input=form.elements[key]; const valid=!!input && String(input.value||"").trim().length>0 && input.checkValidity(); const field=input?.closest(".cs-field"); if(field){field.dataset.state=valid?"complete":"missing"; field.querySelector(".cs-field-mark").innerHTML=icon(valid?"circle-check":"circle");} if(valid)complete++; });
    const percent=needed.length?Math.round(complete/needed.length*100):100; root.querySelector("#cs-meter").style.width=percent+"%"; root.querySelector("#cs-progress").textContent=`${complete} of ${needed.length} required details complete`;
    const list=root.querySelector("#cs-required-list"); list.innerHTML=needed.map(([key,label])=>{const input=form.elements[key];const done=!!input&&String(input.value||"").trim().length>0&&input.checkValidity();return `<div class="${done?"complete":""}">${icon(done?"circle-check":"circle")}<span>${esc(label)}</span></div>`;}).join(""); return complete===needed.length && pendingUploads.size===0;
  }
  async function persistStoreProduct(record, publicationState) {
    if (activeKind !== "products") return record;
    const store = platform.records("store", true).find(item => item.id === record.storeId && item.canManage);
    if (!store) throw new Error("Create and select a storefront before saving this product.");
    let seller = (await platform.api("store/seller")).seller;
    if (!seller) seller = (await platform.api("store/seller", { displayName: store.name, bio: store.description || "", logoUrl: store.image || "" })).seller;
    const product = {
      kind: record.itemType === "digital" ? "digital" : record.itemType === "service" ? "service" : "product",
      title: record.title,
      description: record.description,
      imageUrl: record.image || "",
      currency: "CAD",
      priceCents: Math.round(Number(record.price || 0) * 100),
      compareAtCents: record.compareAt ? Math.round(Number(record.compareAt) * 100) : null,
      inventoryTracked: record.itemType !== "service",
      stockQty: Math.max(0, Number(record.inventory || 0)),
      status: publicationState === "pending" ? "pending" : record.status === "Active" ? "published" : "draft"
    };
    const path = record.storeProductId ? `store/seller/products/${encodeURIComponent(record.storeProductId)}` : "store/seller/products";
    const response = await platform.api(path, product, record.storeProductId ? "PUT" : "POST");
    return { ...record, storeProductId: response.product.id, storeStatus: response.product.status, sellerId: seller.id };
  }

  function renderEditor() {
    const config=kinds[activeKind], data=editorRecord();
    root.innerHTML = `<div class="creator-studio"><button class="cs-back" type="button" id="cs-back">${icon("arrow-left")} All creation tools</button><div class="cs-editor-shell"><aside class="cs-editor-sidebar"><strong>${esc(config.label)} template</strong>${config.sections.map(([title],index)=>`<button type="button" data-section="${index}">${icon(index===0?config.icon:"circle-dot")} ${esc(title)}</button>`).join("")}</aside><div><header class="cs-editor-head"><p class="cs-eyebrow">${editing?"Continue your draft":"New creation"}</p><h1>${editing?`Edit ${esc(titleFor(editing))}`:`Create a ${esc(config.label.toLowerCase())}`}</h1><p>${esc(config.description)} Required fields are highlighted as you complete them.</p></header><form id="cs-editor-form" class="cs-editor-form" novalidate>${config.sections.map((section,index)=>sectionMarkup(section,data,index)).join("")}</form></div><aside class="cs-readiness"><strong>Publication readiness</strong><div class="cs-meter"><span id="cs-meter"></span></div><p id="cs-progress"></p><div class="cs-ready-list" id="cs-required-list"></div><div class="cs-ready-actions"><button class="cs-secondary" type="button" id="cs-save">Save draft</button><button class="cs-primary" type="button" id="cs-publish">Submit for review ${icon("send")}</button></div><p class="cs-message" id="cs-message" hidden></p></aside></div></div>`;
    document.getElementById("cs-back").onclick=()=>{activeKind=null;editing=null;const url=new URL(location.href);url.searchParams.delete("kind");history.pushState({},"",url);render();};
    root.querySelectorAll("[data-section]").forEach(button=>button.onclick=()=>document.getElementById("cs-section-"+button.dataset.section)?.scrollIntoView({behavior:"smooth",block:"start"}));
    const form=root.querySelector("#cs-editor-form"); form.addEventListener("input",updateReadiness); form.addEventListener("change",updateReadiness); form.querySelectorAll("[data-image-picker]").forEach(input=>{ input.addEventListener("change",()=>uploadImage(input)); input.closest(".cs-image-field").querySelector(".cs-image-drop").addEventListener("click",()=>input.click()); });
    const submit = async publicationState => { const ready=updateReadiness(); const message=document.getElementById("cs-message"); if(pendingUploads.size){message.hidden=false;message.className="cs-message error";message.textContent="Wait for your picture upload to finish before saving.";return;} if(publicationState==="pending"&&!ready){message.hidden=false;message.className="cs-message error";message.textContent="Complete the highlighted required details before submitting for review.";form.querySelector(".cs-field[data-state=\"missing\"] input,.cs-field[data-state=\"missing\"] select,.cs-field[data-state=\"missing\"] textarea")?.focus();return;} const button=document.getElementById(publicationState==="pending"?"cs-publish":"cs-save");button.disabled=true;const original=button.textContent;button.textContent=publicationState==="pending"?"Submitting…":"Saving…";try {let saved=await platform.save(activeKind,{...formData(form),publicationState,...(editing?{id:editing.id,revision:editing.revision}:{})}); const commerceRecord=await persistStoreProduct(saved,publicationState); if(commerceRecord.storeProductId!==saved.storeProductId){saved=await platform.save(activeKind,{...commerceRecord,id:saved.id,revision:saved.revision});} editing=saved;message.hidden=false;message.className="cs-message success";message.textContent=publicationState==="pending"?"Submitted for administrator review. Your store item is now ready for owner approval.":"Draft saved. You can return and finish it anytime.";button.textContent=publicationState==="pending"?"Submitted for review":"Saved";} catch(error){message.hidden=false;message.className="cs-message error";message.textContent=error.message||"We could not save this creation.";button.disabled=false;button.textContent=original;}};
    document.getElementById("cs-save").onclick=()=>submit("draft"); document.getElementById("cs-publish").onclick=()=>submit("pending"); updateReadiness(); renderIcons();
  }
  function render() { if(!user || !user.isCreator) return renderUpgrade(); if(activeKind) return renderEditor(); renderHub(); }
  window.addEventListener("popstate",()=>{const next=aliases[new URLSearchParams(location.search).get("kind")]||new URLSearchParams(location.search).get("kind");activeKind=kinds[next]?next:null;editing=null;render();});
  render();
})();
