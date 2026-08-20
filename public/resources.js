(function initializeResourcesModule() {
  const libraryKey = "faithlink.resources.library.v1";
  const data = () => window.FaithLinkModules;

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
    document.getElementById("resource-result-count").textContent = `${resources.length} resource${resources.length === 1 ? "" : "s"}`;
    if (!resources.length) {
      grid.innerHTML = `<div class="module-empty"><i data-lucide="book-x"></i><strong>No resources match these filters.</strong><p>Try another media type, topic, format, or access option.</p></div>`;
      window.lucide?.createIcons();
      return;
    }
    grid.innerHTML = resources.map(resource => `
      <article class="resource-card">
        <img class="resource-image" src="${data().escapeHtml(resource.image)}" alt="" />
        <div class="resource-card-body">
          <div class="resource-format-row"><span class="resource-format"><i data-lucide="${iconFor(resource.type)}"></i>${data().escapeHtml(resource.format)} · ${data().escapeHtml(resource.type)}</span><span class="resource-access ${resource.access === "Paid" ? "paid" : ""}">${data().escapeHtml(resource.access)}</span></div>
          <h3>${data().escapeHtml(resource.title)}</h3>
          <span class="resource-creator">By ${data().escapeHtml(resource.creator)} · ${data().escapeHtml(resource.topic)}</span>
          <p>${data().escapeHtml(resource.description)}</p>
          <div class="resource-footer"><span class="resource-meta">★ ${Number(resource.rating).toFixed(1)} · ${data().escapeHtml(resource.duration)}</span><button class="resource-action" type="button" data-resource-action="${data().escapeHtml(resource.id)}">${resource.access === "Free" ? "Add Free" : `Buy ${data().money(resource.price)}`}</button></div>
        </div>
      </article>
    `).join("");
    window.lucide?.createIcons();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const topicSelect = document.getElementById("resource-topic");
    [...new Set(data().getResources().map(resource => resource.topic))].sort().forEach(topic => topicSelect.insertAdjacentHTML("beforeend", `<option>${data().escapeHtml(topic)}</option>`));
    ["resource-search", "resource-type", "resource-format", "resource-access", "resource-topic", "resource-sort"].forEach(id => document.getElementById(id)?.addEventListener(id === "resource-search" ? "input" : "change", render));
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
