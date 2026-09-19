/* P0: ensure product-detail renders from /api/store/products/:id when FaithLink seed lookup misses. */
(function (root) {
  'use strict';

  function esc(value) {
    if (root.MWEStore?.escapeHtml) return root.MWEStore.escapeHtml(value);
    if (root.FaithLinkModules?.escapeHtml) return root.FaithLinkModules.escapeHtml(value);
    return String(value ?? '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function money(value) {
    if (root.MWEStore?.money) return root.MWEStore.money(value);
    if (root.FaithLinkModules?.money) return root.FaithLinkModules.money(value);
    return '$' + (Number(value) || 0).toFixed(2);
  }

  function hasRenderedProduct(container) {
    return !!(container.querySelector('.product-detail-grid, .service-detail-layout, .service-detail-host .service-hero, .module-empty strong'));
  }

  function normalize(item) {
    if (!item) return null;
    const copy = Object.assign({}, item);
    if (!copy.image) copy.image = copy.imageUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82';
    if (!copy.itemType) copy.itemType = copy.kind === 'service' ? 'service' : 'product';
    if (copy.inventory == null && copy.stockQty != null) copy.inventory = copy.stockQty;
    if (!copy.seller) copy.seller = copy.sellerName || 'Seller';
    if (!copy.status) copy.status = 'Active';
    return copy;
  }

  function renderFallback(container, item) {
    document.title = item.title + ' | My Way of Evangelism';
    const isService = item.itemType === 'service';
    container.classList.toggle('service-detail-host', isService);
    container.innerHTML = `
      <article class="product-detail-grid">
        <div class="product-gallery">
          <img id="product-main-image" src="${esc(item.image)}" alt="${esc(item.title)}" />
        </div>
        <div class="product-info">
          <span class="product-seller">${esc(item.sellerType || item.kind || 'Seller')}: <strong>${esc(item.seller)}</strong></span>
          <h1>${esc(item.title)}</h1>
          <p class="product-detail-description">${esc(item.description || '')}</p>
          <div class="product-price-row">
            <span class="product-price">${money(item.price)}</span>
            ${item.compareAt ? `<span class="product-compare">${money(item.compareAt)}</span>` : ''}
          </div>
          <p class="product-rating"><i data-lucide="star"></i> ${Number(item.rating || 0).toFixed(1)} · ${isService ? 'Service' : (Number(item.inventory) + ' in stock')}</p>
          ${isService ? `
            <a class="button primary" href="store.html">Back to marketplace</a>
          ` : `
            <div class="product-actions" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
              <button class="button primary" type="button" id="mwe-p0-add-cart"><i data-lucide="shopping-cart"></i> Add to cart</button>
              <a class="button ghost" href="cart.html">View cart</a>
            </div>
          `}
        </div>
      </article>`;
    document.getElementById('mwe-p0-add-cart')?.addEventListener('click', async function () {
      try {
        await root.MWEStore?.addToCart?.(item.id, 1);
        root.MWE?.showMemberToast?.('Added to your cart');
      } catch (err) {
        root.MWE?.showMemberToast?.(err?.message || 'Unable to add to cart');
      }
    });
    root.lucide?.createIcons();
  }

  async function ensureProduct() {
    const productId = new URLSearchParams(location.search).get('id');
    const container = document.getElementById('product-detail');
    if (!container) return;

    try {
      await root.MWEPlatform?.ready;
      await root.MWEStore?.ready;
      await root.__mweStoreBridgeReady;
    } catch (_) {}

    let item = null;
    try {
      if (root.MWEStore?.getProduct) item = normalize(await root.MWEStore.getProduct(productId));
    } catch (_) {}

    if (!item && productId) {
      await new Promise(function (r) { setTimeout(r, 50); });
      if (hasRenderedProduct(container)) return;
    }

    if (!productId) {
      if (!hasRenderedProduct(container)) {
        container.innerHTML = `<div class="module-empty"><i data-lucide="package-x"></i><strong>Item not found.</strong><p>Missing product id in the URL.</p><a href="store.html" class="button primary">Return to Marketplace</a></div>`;
        root.lucide?.createIcons();
      }
      return;
    }

    if (!item) {
      if (!hasRenderedProduct(container)) {
        container.innerHTML = `<div class="module-empty"><i data-lucide="package-x"></i><strong>Item not found.</strong><p>The product or service you are looking for is unavailable or has been moved.</p><a href="store.html" class="button primary">Return to Marketplace</a></div>`;
        root.lucide?.createIcons();
      }
      return;
    }

    if (hasRenderedProduct(container)) {
      const title = container.querySelector('h1');
      if (title && title.textContent && title.textContent.indexOf(item.title) !== -1) return;
    }

    const fl = root.FaithLinkModules;
    if (fl) {
      fl.getItemById = function (id) {
        if (id === item.id) return item;
        return (root.MWEStore?.getProducts?.() || []).find(function (p) { return p && p.id === id; }) || null;
      };
    }

    renderFallback(container, item);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ensureProduct(); });
  } else {
    ensureProduct();
  }
})(window);
