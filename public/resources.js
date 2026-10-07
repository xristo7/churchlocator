(function initializeResourcesModule() {
  const libraryKey = "faithlink.resources.library.v1";
  const data = () => window.FaithLinkModules;
  let viewMode = localStorage.getItem("faithlink.resources.view") || "grid";

  function filteredResources() {
    const query = document.getElementById("resource-search")?.value.trim().toLowerCase() || "";
    const type = document.getElementById("resource-type")?.value || "all";
    const format = document.getElementById("resource-format")?.value || "all";
    const access = document.getElementById("resource-access")?.value || "all";
    const topic = document.getElementById("resource-topic")?.value || "all";
    const sort = document.getElementById("resource-sort")?.value || "featured";
    const resources = data().getResources().filter(resource => {
      const searchable = `${resource.title} ${resource.creator} ${resource.topic} ${resource.description} ${resource.format}`.toLowerCase();
      return (!query || searchable.includes(query)) && (type === "all" || resource.type === type) && (format === "all" || resource.format === format) && (access === "all" || resource.access === access) && (topic === "all" || resource.topic === topic);
    });
    return resources.sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "free-first") return a.price - b.price;
      if (sort === "price-low") return a.price - b.price;
      return Number(b.rating) - Number(a.rating);
    });
  }

  function iconFor(type) {
    return type === "Video" ? "video" : type === "Audio" ? "headphones" : "file-text";
  }

  function render() {
    const grid = document.getElementById("resources-grid");
    if (!grid || !data()) return;
    const resources = filteredResources();
    grid.classList.toggle("list-view", viewMode === "list");
    document.getElementById("resource-result-count").textContent = `${resources.length} resource${resources.length === 1 ? "" : "s"}`;
    if (!resources.length) {
      grid.innerHTML = `<div class="module-empty"><i data-lucide="book-x"></i><strong>No resources match these filters.</strong><p>Try another media type, topic, format, or access option.</p></div>`;
      window.lucide?.createIcons();
      return;
    }
    grid.innerHTML = resources.map((resource, index) => {
      const creatorName = String(resource.creator || "My Way").trim();
      const creatorKey = creatorName.toLocaleLowerCase();
      const channel = (data().getChannels() || []).find(item =>
        [item.name, item.owner, item.handle].some(value => String(value || "").trim().toLocaleLowerCase() === creatorKey)
      );
      const channelHref = channel ? `channel-detail.html?id=${encodeURIComponent(channel.id)}` : "channels.html";
      const channelAction = channel ? "Open Channel" : "Explore Channels";
      const format = resource.format || resource.type;
      const price = resource.access === "Free" ? "Free" : data().money(resource.price);
      return `
      <article class="resource-card editorial-card tone-${index % 6}">
        <a class="resource-cover" href="resource-detail.html?id=${encodeURIComponent(resource.id)}" aria-label="View ${data().escapeHtml(resource.title)}">
          <img class="resource-image" src="${data().escapeHtml(resource.image)}" alt="" />
          <span class="resource-cover-icon"><i data-lucide="${iconFor(resource.type)}"></i></span><span class="resource-type-label">${data().escapeHtml(resource.type === "Text" && resource.format === "Article" ? "Article" : resource.format)}</span>
        </a>
        <button class="content-love-button content-love-overlay" type="button" data-love-type="resource" data-love-id="${data().escapeHtml(resource.id)}" aria-pressed="false"><i data-lucide="heart"></i><span data-love-count>0</span></button>
        <div class="resource-card-body">
          <h3><a href="resource-detail.html?id=${encodeURIComponent(resource.id)}">${data().escapeHtml(resource.title)}</a></h3>
          <div class="resource-subtitle"><span>${data().escapeHtml(resource.topic)}</span><span aria-hidden="true">·</span><span>${data().escapeHtml(format)}</span></div>
          <p>${data().escapeHtml(resource.description)}</p>
          <a class="resource-channel-link" href="${channelHref}" aria-label="${channelAction}: ${data().escapeHtml(creatorName)}"><i data-lucide="radio-tower" aria-hidden="true"></i><span><small>From</small>${data().escapeHtml(creatorName)}</span><strong>${channelAction}<i data-lucide="arrow-up-right" aria-hidden="true"></i></strong></a>
          <div class="resource-card-footer"><span class="resource-duration"><i data-lucide="clock" aria-hidden="true"></i>${data().escapeHtml(resource.duration || "On demand")}</span><strong class="resource-price-badge ${resource.access === "Paid" ? "paid" : ""}">${price}</strong></div>
          <button class="resource-action" type="button" data-resource-action="${data().escapeHtml(resource.id)}">${resource.access === "Free" ? "Add to library" : "Get resource"}</button>
        </div>
      </article>
    `;
    }).join("");
    window.lucide?.createIcons();
  }

  document.addEventListener("DOMContentLoaded", async () => {
  await window.MWEPlatform?.ready;
    const topicSelect = document.getElementById("resource-topic");
    [...new Set(data().getResources().map(resource => resource.topic))].sort().forEach(topic => topicSelect.insertAdjacentHTML("beforeend", `<option>${data().escapeHtml(topic)}</option>`));
    ["resource-search", "resource-type", "resource-format", "resource-access", "resource-topic", "resource-sort"].forEach(id => document.getElementById(id)?.addEventListener(id === "resource-search" ? "input" : "change", render));
    document.querySelectorAll("[data-resource-view]").forEach(button => {
      const active = button.dataset.resourceView === viewMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.addEventListener("click", () => {
        viewMode = button.dataset.resourceView;
        localStorage.setItem("faithlink.resources.view", viewMode);
        document.querySelectorAll("[data-resource-view]").forEach(option => {
          const selected = option.dataset.resourceView === viewMode;
          option.classList.toggle("active", selected);
          option.setAttribute("aria-pressed", String(selected));
        });
        render();
      });
    });
    const setEditor = open => document.getElementById("resource-create-modal")?.classList.toggle("is-open", open);
    document.getElementById("create-resource-button")?.addEventListener("click", () => setEditor(true));
    document.querySelector("#resource-create-modal .module-modal-close")?.addEventListener("click", () => setEditor(false));
    document.getElementById("resource-create-modal")?.addEventListener("click", event => { if (event.target.id === "resource-create-modal") setEditor(false); });
    document.getElementById("resource-create-form")?.addEventListener("submit", async event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const pages = String(values.pages || "").split(/\n\s*---page---\s*\n/i).map(page => page.trim()).filter(Boolean); const file = event.currentTarget.elements.attachment.files[0];
      const attachmentData = file ? await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }) : "";
      data().addResource({ ...values, pages, price: values.access === "Paid" ? Number(values.price || 0) : 0, attachment: file?.name || "", attachmentData, attachmentType: file?.type || "" });
      event.currentTarget.reset(); setEditor(false); render(); window.MWE?.showMemberToast?.("Resource published");
    });
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-resource-action]");
      if (!button) return;
      const resource = data().getResources().find(item => item.id === button.dataset.resourceAction);
      if (!resource) return;
      if (resource.access === "Free") {
        const library = JSON.parse(localStorage.getItem(libraryKey) || "[]");
        if (!library.includes(resource.id)) library.push(resource.id);
        localStorage.setItem(libraryKey, JSON.stringify(library));
        window.MWE?.showMemberToast?.("Added to your resource library");
        button.textContent = "In Library";
        return;
      }
      const productId = `resource-${resource.id}`;
      data().upsertProduct({ id: productId, title: resource.title, seller: resource.creator, sellerType: "Channel", category: "Digital Resources", price: resource.price, compareAt: 0, inventory: 999, rating: resource.rating, status: "Active", featured: false, image: resource.image, description: resource.description });
      data().addToCart(productId);
      window.MWE?.showMemberToast?.("Paid resource added to your Store cart");
    });
    render();
  });
})();
