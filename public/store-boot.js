/* P0: force catalog hydrate from /api/store/products after MWEStore.ready */
(function (root) {
  'use strict';

  async function hydrate() {
    const grid = document.getElementById('store-products-grid');
    const countEl = document.getElementById('store-result-count');
    try {
      await root.MWEStore?.ready;
      if (root.MWEStore?.refreshProducts) {
        await root.MWEStore.refreshProducts({ includeDrafts: false });
      }
    } catch (err) {
      console.warn('[store-boot] refresh failed', err);
    }

    // If store.js already rendered cards, leave them.
    if (grid && grid.querySelector('.product-card')) return;

    const products = (root.MWEStore?.getProducts?.() || []).filter(function (p) {
      return p && (p.status === 'Active' || String(p.status).toLowerCase() === 'published');
    });

    if (countEl) {
      countEl.textContent = products.length + ' offering' + (products.length === 1 ? '' : 's');
    }
    if (!grid) return;

    if (!products.length) {
      // Keep store.js empty state if present; otherwise show explicit empty.
      if (!grid.innerHTML.trim()) {
        grid.innerHTML = '<div class="module-empty"><i data-lucide="store"></i><strong>No published products yet.</strong><p>When sellers publish through the store API, offerings will appear here.</p></div>';
        root.lucide?.createIcons();
      }
      return;
    }

    const esc = root.MWEStore?.escapeHtml || function (v) {
      return String(v ?? '').replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
      });
    };
    const money = root.MWEStore?.money || function (n) { return '$' + (Number(n) || 0).toFixed(2); };

    grid.innerHTML = products.map(function (product) {
      const isService = product.itemType === 'service' || product.kind === 'service';
      const image = product.image || product.imageUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82';
      return (
        '<article class="product-card' + (isService ? ' service-card-item' : '') + '">' +
          '<a class="product-image-wrap" href="product-detail.html?id=' + encodeURIComponent(product.id) + '">' +
            '<img class="product-image" src="' + esc(image) + '" alt="' + esc(product.title) + '" />' +
          '</a>' +
          '<div class="product-card-body">' +
            '<span class="product-seller"><strong>' + esc(product.seller || product.sellerName || 'Seller') + '</strong></span>' +
            '<h3><a href="product-detail.html?id=' + encodeURIComponent(product.id) + '">' + esc(product.title) + '</a></h3>' +
            '<div class="product-price-row"><span class="product-price">' + money(product.price) + '</span></div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
    root.lucide?.createIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hydrate(); });
  } else {
    hydrate();
  }
})(window);
