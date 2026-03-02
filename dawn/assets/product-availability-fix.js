/**
 * Product Availability Refresh
 * Fixes stale Liquid-rendered availability on product cards.
 * Works for both .na-add-btn and .mo-add-btn card types.
 * Fetches live variant data from /products/handle.js and syncs button + badge state.
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var btns = document.querySelectorAll('.na-add-btn[data-product-handle], .mo-add-btn[data-product-handle]');
    if (!btns.length) return;

    // Group buttons by product handle to minimise API calls
    var handleMap = {};
    btns.forEach(function (btn) {
      var handle = btn.dataset.productHandle;
      if (!handle) return;
      if (!handleMap[handle]) handleMap[handle] = [];
      handleMap[handle].push(btn);
    });

    Object.keys(handleMap).forEach(function (handle) {
      fetch('/products/' + handle + '.js')
        .then(function (res) { return res.json(); })
        .then(function (product) {
          var variantData = {};
          product.variants.forEach(function (v) {
            variantData[v.id] = {
              available: v.available,
              price: parseInt(v.price, 10),
              compareAt: v.compare_at_price ? parseInt(v.compare_at_price, 10) : 0
            };
          });

          handleMap[handle].forEach(function (btn) {
            var vid = parseInt(btn.dataset.variantId, 10);
            var vd = variantData[vid];
            if (!vd) return;

            var isAvailable = vd.available;

            // Sync button state
            btn.disabled = !isAvailable;
            btn.textContent = isAvailable
              ? (btn.dataset.addText || 'ADD TO CART')
              : (btn.dataset.soldText || 'SOLD OUT');

            // Determine card type (na- or mo-)
            var card = btn.closest('.na-product-card') || btn.closest('.mo-product-card');
            if (!card) return;

            var imageWrapper = card.querySelector('.na-image-wrapper') || card.querySelector('.mo-image-wrapper');
            if (!imageWrapper) return;

            // Detect badge classes based on card type
            var isNa = !!card.classList.contains('na-product-card');
            var soldOutClass = isNa ? 'na-badge--sold-out' : 'mo-badge--sold-out';
            var badgeBase = isNa ? 'na-badge' : 'mo-badge';

            var soldOutBadge = imageWrapper.querySelector('.' + soldOutClass);
            var bestSellerBadge = imageWrapper.querySelector('.' + badgeBase + ':not(.' + soldOutClass + ')');

            if (isAvailable) {
              if (soldOutBadge) soldOutBadge.remove();
              if (!bestSellerBadge && vd.compareAt > vd.price) {
                var bb = document.createElement('span');
                bb.className = badgeBase;
                bb.textContent = 'BEST SELLER';
                imageWrapper.insertBefore(bb, imageWrapper.firstChild);
              }
            } else {
              if (bestSellerBadge) bestSellerBadge.remove();
              if (!soldOutBadge) {
                var sb = document.createElement('span');
                sb.className = badgeBase + ' ' + soldOutClass;
                sb.textContent = 'SOLD OUT';
                imageWrapper.insertBefore(sb, imageWrapper.firstChild);
              }
            }
          });
        })
        .catch(function () {
          // Silently keep server-rendered state on network failure
        });
    });
  });
})();
