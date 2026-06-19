    document.documentElement.style.opacity = "1";
    if (document.body) document.body.style.opacity = "1";

// Shared logic loaded from core.js

    // STORE RENDER (search-aware)
    // =============================================
    function renderStore(filtered) {
      const grid = document.getElementById('product-grid');
      if (!grid) return;
      
      if (typeof renderCategoryBar === 'function') {
        try { renderCategoryBar(); } catch (e) {}
      }
      
      const label = document.getElementById('product-count-label');
      const infoEl = document.getElementById('search-results-info');
      selectedSizes = {};

      const list = filtered !== undefined ? filtered : products;

      if (!products.length) {
        // If Firebase is configured but not yet ready, show loading spinner
        const hasFbConfig = !!localStorage.getItem('sole_firebase_config');
        if (hasFbConfig && !dbReady) {
          grid.innerHTML = `<div style="grid-column:1/-1;padding:4rem;color:var(--muted);text-align:center"><div style="font-size:2rem;margin-bottom:1rem;animation:spin 1s linear infinite;display:inline-block">⏳</div><div>Loading products...</div></div>`;
        } else {
          grid.innerHTML = `<div style="grid-column:1/-1;padding:4rem;color:var(--muted);text-align:center"><div style="font-size:3rem;margin-bottom:1rem">👟</div>No products yet. Open Admin to add some.</div>`;
        }
        label.textContent = '0 Products';
        infoEl.style.display = 'none';
        return;
      }

      label.textContent = `${products.length} Product${products.length !== 1 ? 's' : ''}`;

      // Show search info
      const query = document.getElementById('store-search') ? document.getElementById('store-search').value.trim() : '';
      if (query || filtered !== undefined) {
        infoEl.style.display = 'block';
        if (!list.length) {
          infoEl.innerHTML = `No results for "<span>${escHtml(query)}</span>"`;
        } else {
          infoEl.innerHTML = `Showing <span>${list.length}</span> of <span>${products.length}</span> products${query ? ` for "<span>${escHtml(query)}</span>"` : ''}`;
        }
      } else {
        infoEl.style.display = 'none';
      }

      if (!list.length) {
        const cats2 = [...new Set(products.map(p => p.category || p.tag || '').filter(Boolean))].slice(0, 5);
        grid.innerHTML = `<div class="empty-search-state"><span class="empty-search-icon">🔍</span><div class="empty-search-title">No Results Found</div><div class="empty-search-sub">No shoes match "<strong>${escHtml(query)}</strong>"</div>${cats2.length ? `<div class="empty-search-sug">${cats2.map(c => `<button onclick="filterCategory('${escHtml(c)}')">${escHtml(c)}</button>`).join('')}</div>` : ''}  </div>`;
        return;
      }

      grid.innerHTML = '';
      list.forEach((p, originalIndex) => {
        const i = products.indexOf(p);
        const key = slugify(p.name) + '-' + i;
        selectedSizes[key] = null;
        const emoji = EMOJIS[i % EMOJIS.length];
        const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
        const coverImg = imgs[0] || '';

        // ---- Per-size stock logic ----
        const ss = p.sizeStock || {};  // { "38": 5, "39": 0, ... }
        const hasSizeStock = Object.keys(ss).length > 0;

        // Compute availability per size
        const availableSizes = p.sizes.filter(s => {
          if (!hasSizeStock) return true; // no per-size data → all shown
          const qty = ss[String(s)];
          return qty === undefined || qty > 0; // undefined = not tracked, treat as available
        });
        const isOos = hasSizeStock && availableSizes.length === 0;

        // For the "low stock" banner — total remaining across sizes
        const totalStock = hasSizeStock
          ? p.sizes.reduce((sum, s) => sum + (ss[String(s)] || 0), 0)
          : (typeof p.stock === 'number' ? p.stock : null);
        const isLow = !isOos && totalStock !== null && totalStock > 0 && totalStock <= 5;

        const stockBanner = isOos
          ? `<div class="oos-banner">Out of Stock</div>`
          : isLow
            ? `<div class="low-stock-banner">Only ${totalStock} left!</div>`
            : '';

        const clickHandler = isOos ? '' : 'onclick="openPdm(' + i + ')"';
        const imgTitle = isOos ? 'Out of Stock' : 'View details';
        const hintHtml = isOos ? '' : '<div class="pdm-card-hint">👁 View Details' + (coverImg ? ' · ' + imgs.length + ' photo' + (imgs.length !== 1 ? 's' : '') : '') + '</div>';
        const imgHTML = coverImg
          ? '<div class="product-img-wrap" ' + clickHandler + ' title="' + imgTitle + '">'
          + '<img class="product-img" src="' + escHtml(coverImg) + '" alt="' + escHtml(p.name) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
          + '<div class="product-img-placeholder" style="display:none">' + emoji + '</div>'
          + hintHtml + '</div>'
          : '<div class="product-img-wrap" ' + clickHandler + ' title="' + imgTitle + '">'
          + '<div class="product-img-placeholder">' + emoji + '</div>'
          + hintHtml + '</div>';

        const nameClick = isOos ? '' : 'onclick="openPdm(' + i + ')"';
        const nameCursor = isOos ? 'default' : 'pointer';
        const oosLine = isOos ? '<div class="oos-label">⛔ Currently unavailable</div>' : '';
        const addDisabled = isOos ? 'disabled title="Out of stock"' : '';

        const card = document.createElement('div');
        const isWishlisted = wishlist.some(w => w.name === p.name);
        card.className = 'product-card' + (isOos ? ' oos' : '');
        card.innerHTML =
          stockBanner +
          `<button class="wishlist-btn${isWishlisted ? ' active' : ''}" data-name="${escHtml(p.name)}" onclick="toggleWishlist('${escHtml(p.name)}',this)" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">♡</button>` +
          imgHTML +
          '<div class="product-tag">' + escHtml(p.tag || '') + '</div>' +
          (() => { const r = getProductRating(p.name); if (!r) return ''; const filled = Math.round(r); return '<div class="product-rating-row"><span class="product-rating-stars">' + '★'.repeat(filled) + '☆'.repeat(5 - filled) + '</span><span class="product-rating-count">(' + r.toFixed(1) + ')</span></div>' })() +
          '<div class="product-name" style="cursor:' + nameCursor + '" ' + nameClick + '>' + escHtml(p.name) + '</div>' +
          '<div class="product-desc">' + escHtml(p.desc) + '</div>' +
          oosLine +
          '<div class="size-row" id="sizes-' + key + '"></div>' +
          '<div class="product-footer">' +
          '<div class="product-price">' + fmtPrice(p.price) + '' + '</div>' +
          '<button class="add-btn" onclick="addToCart(' + i + ',\'' + key + '\',this)" ' + addDisabled + '>+</button>' +
          '</div>';
        grid.appendChild(card);
        const sizeRow = document.getElementById(`sizes-${key}`);
        p.sizes.forEach(s => {
          const qty = hasSizeStock ? (ss[String(s)] !== undefined ? ss[String(s)] : -1) : -1;
          const sizeOos = hasSizeStock && qty === 0;
          const sizeLow = hasSizeStock && qty > 0 && qty <= 3;
          const btn = document.createElement('button');
          btn.className = 'size-btn'
            + (isOos || sizeOos ? ' size-oos' : '')
            + (sizeLow ? ' size-low' : '');
          btn.textContent = s;
          btn.title = sizeOos ? 'Size ' + s + ' out of stock'
            : sizeLow ? 'Only ' + qty + ' left in size ' + s
              : '';
          if (!isOos && !sizeOos) {
            btn.onclick = () => {
              sizeRow.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              selectedSizes[key] = s;
            };
          } else {
            btn.disabled = true;
          }
          sizeRow.appendChild(btn);
        });
      });
    }

    function handleSearch() {
      const query = document.getElementById('store-search').value.trim().toLowerCase();
      const sort = document.getElementById('search-sort').value;
      const clearBtn = document.getElementById('search-clear-btn');

      clearBtn.classList.toggle('visible', query.length > 0);

      let filtered = products.filter(p => {
        if (!query) return true;
        return p.name.toLowerCase().includes(query)
          || (p.tag || '').toLowerCase().includes(query)
          || p.desc.toLowerCase().includes(query);
      });

      // Sort
      if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
      if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
      if (sort === 'name-asc') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

      renderStore(query || sort !== 'default' ? filtered : undefined);
    }

    function clearSearch() {
      document.getElementById('store-search').value = '';
      document.getElementById('search-sort').value = 'default';
      document.getElementById('search-clear-btn').classList.remove('visible');
      document.getElementById('search-results-info').style.display = 'none';
      renderStore();
    }

    // =============================================
    // CART
    // =============================================
    function addToCart(idx, key, btn) {
      const p = products[idx];
      const ss = p.sizeStock || {};
      const hasSizeStock = Object.keys(ss).length > 0;

      // Check whole-product OOS (all sizes zero)
      if (hasSizeStock) {
        const allOos = p.sizes.every(s => (ss[String(s)] || 0) === 0);
        if (allOos) { alert('Sorry, this product is out of stock.'); return; }
      } else if (typeof p.stock === 'number' && p.stock <= 0) {
        alert('Sorry, this product is out of stock.'); return;
      }

      const size = selectedSizes[key];
      if (!size) {
        const r = document.getElementById(`sizes-${key}`);
        r.style.outline = '1px solid #2563eb';
        setTimeout(() => r.style.outline = '', 1000);
        return;
      }

      // Check this specific size
      if (hasSizeStock && ss[String(size)] !== undefined && ss[String(size)] <= 0) {
        alert(`Sorry, size EU ${size} is out of stock.`); return;
      }

      cart.push({ name: p.name, price: p.price, size, productIdx: idx });
      renderCart();
      document.getElementById('order').classList.add('visible');
      document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
        function renderCart() {
      const c = document.getElementById('cart-items-summary');
      const cnt = document.getElementById('order-count');
      if(cnt) cnt.textContent = cart.length;

      if (!cart.length) {
        if(c) c.innerHTML = '<div class="empty-cart" style="text-align:center;padding:2rem;color:var(--muted)">No items yet. Add something from the shop!</div>';
        const subV = document.getElementById('cart-subtotal-val');
        if(subV) subV.textContent = 'Rs 0';
        const grandV = document.getElementById('cart-grand-total-val');
        if(grandV) grandV.textContent = 'Rs 0';
        const delV = document.getElementById('cart-delivery-val2');
        if(delV) delV.textContent = 'Rs ' + deliveryCharge.toLocaleString();
        return;
      }

      let html = '', subtotal = 0;
      cart.forEach((item, i) => {
        subtotal += item.price;
        const p = (item.productIdx !== undefined) ? products[item.productIdx] : null;
        const imgs = p ? (p.images && p.images.length ? p.images : (p.img ? [p.img] : [])) : [];
        const emoji = p ? EMOJIS[item.productIdx % EMOJIS.length] : '👟';
        const thumbHtml = imgs[0]
          ? `<img src="${escHtml(imgs[0])}" alt="${escHtml(item.name)}" onerror="this.outerHTML='<div class=\'os-thumb-emoji\'>${emoji}</div>'">`
          : `<div class="os-thumb-emoji">${emoji}</div>`;
        html += `<div class="order-summary-item">
          <div class="os-thumb-wrap">
            ${thumbHtml}
            <span class="os-badge">1</span>
          </div>
          <div class="os-info">
            <div class="os-name">${escHtml(item.name)}</div>
            <div class="os-size">Size EU ${item.size} <span style="margin-left:8px; cursor:pointer; color:var(--red); font-size:0.7rem;" onclick="removeFromCart(${i})">Remove</span></div>
          </div>
          <div class="os-price">Rs ${item.price.toLocaleString()}</div>
        </div>`;
      });
      if(c) c.innerHTML = html;

      const discount = calcDiscount(subtotal);
      const discountRow = document.getElementById('cart-discount-row');
      const discountVal = document.getElementById('cart-discount-val');
      const removeBtn = document.getElementById('coupon-remove-btn');
      
      if (discountRow) {
        if (discount > 0) {
          discountRow.style.display = 'flex';
          if (discountVal) discountVal.textContent = '- Rs ' + discount.toLocaleString();
          if (removeBtn) removeBtn.style.display = 'block';
        } else {
          discountRow.style.display = 'none';
          if (removeBtn) removeBtn.style.display = 'none';
        }
      }

      const subV = document.getElementById('cart-subtotal-val');
      if(subV) subV.textContent = 'Rs ' + subtotal.toLocaleString();
      const delV = document.getElementById('cart-delivery-val2');
      if(delV) delV.textContent = 'Rs ' + deliveryCharge.toLocaleString();
      const shpV = document.getElementById('shipping-method-val');
      if(shpV) shpV.textContent = 'Rs ' + deliveryCharge.toLocaleString();
      const grandV = document.getElementById('cart-grand-total-val');
      if(grandV) grandV.textContent = 'Rs ' + (subtotal + deliveryCharge - discount).toLocaleString();

      const mobTotal = document.getElementById('mobile-summary-total');
      if (mobTotal) mobTotal.textContent = 'Rs ' + (subtotal + deliveryCharge - discount).toLocaleString();

      saveCartToStorage();
      updateFreeDeliveryBar();
      updateTabBarBadges();
    }

    function toggleMobileSummary() {
      const btn = document.getElementById('mobile-summary-toggle');
      const content = document.getElementById('mobile-summary-content');
      const label = document.getElementById('toggle-label');
      if (!btn || !content) return;
      
      const isExpanded = content.classList.contains('expanded');
      if (isExpanded) {
        content.classList.remove('expanded');
        btn.classList.remove('expanded');
      } else {
        content.classList.add('expanded');
        btn.classList.add('expanded');
      }
      if(label) label.textContent = 'Order summary';
    }


    // =============================================
    // 2-PAGE CHECKOUT NAVIGATION
    // =============================================
    function goToPaymentPage() {
      const fname = document.getElementById('fname').value.trim();
      const lname = document.getElementById('lname').value.trim();
      const email = document.getElementById('email').value.trim();
      const address = document.getElementById('address').value.trim();
      if (!fname || !lname || !email || !address) {
        alert('Please fill in your name, email, and delivery address before continuing.');
        return;
      }
      if (!cart.length) { alert('Add at least one item first.'); return; }

      // Render payment-page summary
      renderPaySummary();

      document.getElementById('checkout-page-1').style.display = 'none';
      document.getElementById('checkout-page-2').style.display = 'block';
      document.getElementById('step-ind-1').classList.remove('active');
      document.getElementById('step-ind-1').classList.add('done');
      document.getElementById('step-ind-2').classList.add('active');
      document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }



    // =============================================
    // PAYONEER CHECKOUT
    // =============================================


        function selectPayment(method) {
      selectedPayment = method;
      document.querySelectorAll('.payment-detail-box').forEach(d => d.style.display = 'none');
      if(document.getElementById('pay-detail-' + method)) {
         document.getElementById('pay-detail-' + method).style.display = 'block';
      }
    }




    // =============================================
    // PLACE ORDER
    // =============================================
    async function placeOrder() {
      setSubmitLoading(true);
      try { await _placeOrderInner(); } finally { setSubmitLoading(false); }
    }
    async function _placeOrderInner() {
      const fname = sanitiseInput(document.getElementById('fname').value);
      const lname = sanitiseInput(document.getElementById('lname').value);
      const email = sanitiseInput(document.getElementById('email').value);
      const phone = sanitisePhone(document.getElementById('phone').value);
      const baseAddr = sanitiseInput(document.getElementById('address').value);
      const apt = sanitiseInput(document.getElementById('apartment') ? document.getElementById('apartment').value : '');
      const city = sanitiseInput(document.getElementById('city') ? document.getElementById('city').value : '');
      const postal = sanitiseInput(document.getElementById('postal') ? document.getElementById('postal').value : '');
      
      let address = baseAddr;
      if(apt) address += ', ' + apt;
      if(city) address += ', ' + city;
      if(postal) address += ' ' + postal;

      if (!checkRateLimit()) return;
      if (!fname || !lname || !email || !address) { alert('Please fill in name, email, and delivery address.'); return; }
      if (!cart.length) { alert('Add at least one item first.'); return; }
      // Re-check stock at order time
      const oos = checkStockBeforeOrder();
      if (oos.length) { alert('Sorry, the following items are now out of stock:\n' + oos.join('\n') + '\n\nPlease remove them from your cart.'); return; }

      const subtotal = cart.reduce((s, i) => s + i.price, 0);
      const discount = calcDiscount(subtotal);
      const total = subtotal + deliveryCharge - discount;

      let paymentRef = '';
      let paymentScreenshot = '';

      if (selectedPayment === 'easypaisa') {
        paymentScreenshot = ssData['easypaisa'] || '';
        if (!paymentScreenshot) { shakeDropZone('easypaisa'); alert('📸 Please attach your Easypaisa payment screenshot before placing the order.'); return; }

      } else if (selectedPayment === 'sadapay') {
        paymentScreenshot = ssData['sadapay'] || '';
        if (!paymentScreenshot) { shakeDropZone('sadapay'); alert('📸 Please attach your SadaPay payment screenshot before placing the order.'); return; }

      } else if (selectedPayment === 'payoneer') {
        paymentScreenshot = ssData['payoneer'] || '';
        if (!paymentScreenshot) { shakeDropZone('payoneer'); alert('📸 Please attach your Payoneer payment receipt screenshot before placing the order.'); return; }
        paymentRef = 'Payoneer';

      } else if (selectedPayment === 'bank') {
        paymentScreenshot = ssData['bank'] || '';
        if (!paymentScreenshot) { shakeDropZone('bank'); alert('📸 Please attach your bank deposit slip / screenshot before placing the order.'); return; }
      }

      // Save order
      const orderId = genId();
      const order = {
        id: orderId,
        date: new Date().toISOString(),
        customer: { fname, lname, email, phone, address },
        items: [...cart],
        subtotal,
        discount,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        deliveryCharge,
        total,
        payment: selectedPayment,
        paymentRef,
        paymentScreenshot,
        status: 'pending'
      };

      orders.unshift(order);
      setRateLimitTimestamp();
      localStorage.removeItem('sole_cart');
      // Save order to Firestore
      await dbSaveOrder(order);
      updateOrderBadge();
      // Email is now sent manually when admin clicks CONFIRMED
      // sendOrderConfirmationEmail(order);

      // Deduct per-size stock — match by name (safer than index after Firebase reload)
      const stockUpdatePromises = [];
      cart.forEach(item => {
        // Find product by name (stable across Firebase reloads)
        const idx = products.findIndex(p => p.name === item.name);
        if (idx < 0) return;
        const p = products[idx];
        const sKey = String(item.size);
        if (p.sizeStock && p.sizeStock[sKey] !== undefined) {
          p.sizeStock[sKey] = Math.max(0, p.sizeStock[sKey] - 1);
        } else if (typeof p.stock === 'number') {
          p.stock = Math.max(0, p.stock - 1);
        }
        // Also store image in order item for admin display
        item.img = p.img || (p.images && p.images[0]) || '';
        stockUpdatePromises.push(dbUpdateSizeStock(idx));
      });
      await Promise.all(stockUpdatePromises);
      renderStore();

      showOrderConfirmation(order);
      // Reset coupon after successful order
      removeCoupon();
    }



    // =============================================
    // SCREENSHOT UPLOAD FUNCTIONS
    // =============================================
    const ssData = {}; // { 'easypaisa': base64, 'sadapay': base64, 'bank': base64 }












    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('ss-lightbox').classList.contains('open')) {
        closeSsLightbox();
      }
    });

    // =============================================
    // ADMIN
    // =============================================



    // =============================================
    // WHATSAPP CONFIG
    // =============================================
    // WHATSAPP CONFIG (waNumber declared in core.js)

    // =============================================
    // ORDER TRACKING
    // =============================================
    let trackTab = 'id';





    // =============================================
    // PRODUCT DETAIL MODAL (PDM)
    // =============================================
    let pdmProductIdx = -1;
    let pdmImgIdx = 0;

    function openPdm(productIdx) {
      pdmProductIdx = productIdx;
      pdmImgIdx = 0;
      const p = products[productIdx];
      const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
      const emoji = EMOJIS[productIdx % EMOJIS.length];

      renderPdmGallery(p, imgs, emoji);

      const ss = p.sizeStock || {};
      const hasSizeStock = Object.keys(ss).length > 0;
      const availSizes = p.sizes.filter(s => !hasSizeStock || (ss[String(s)] === undefined || ss[String(s)] > 0));
      const isOos = hasSizeStock && availSizes.length === 0;
      const totalLeft = hasSizeStock ? p.sizes.reduce((t, s) => t + (ss[String(s)] || 0), 0) : (typeof p.stock === 'number' ? p.stock : null);
      const isLow = !isOos && hasSizeStock && totalLeft !== null && totalLeft <= 5 && totalLeft > 0;

      const sizesHtml = p.sizes.map(s => {
        const qty = hasSizeStock ? (ss[String(s)] !== undefined ? ss[String(s)] : -1) : -1;
        const sOos = hasSizeStock && qty === 0;
        const sLow = hasSizeStock && qty > 0 && qty <= 3;
        const cls = 'pdm-sz' + (sOos ? ' size-oos' : '') + (sLow ? ' size-low' : '');
        const title = sOos ? `Size ${s} — Out of Stock` : sLow ? `Size ${s} — Only ${qty} left` : '';
        const stockNote = sLow ? `<span style="font-size:.6rem;display:block;color:var(--orange)">${qty} left</span>` : '';
        return `<div class="${cls}" data-size="${s}" ${sOos ? '' : 'onclick="pdmSelectSize(this)"'} title="${title}">${s}${stockNote}</div>`;
      }).join('');

      const stockVal = isOos ? '<span style="color:var(--red)">⛔ Out of Stock</span>'
        : !hasSizeStock && totalLeft === null ? '—'
          : isLow ? `<span style="color:var(--orange)">⚠ Only ${totalLeft} pairs left</span>`
            : `<span style="color:var(--green)">✓ Available in ${availSizes.length} size${availSizes.length !== 1 ? 's' : ''}</span>`;

      const specRows = [
        { label: 'Category', val: p.category || p.tag || '—' },
        { label: 'Available Sizes', val: availSizes.length + ' of ' + p.sizes.length },
        { label: 'Price', val: 'Rs. ' + p.price.toLocaleString() },
        { label: 'Stock', val: stockVal },
      ];
      const specsHtml = specRows.map(r => `<div class="pdm-spec-cell"><div class="pdm-spec-label">${r.label}</div><div class="pdm-spec-val">${r.val}</div></div>`).join('');

      // Related products (same category/tag, exclude current)
      const relatedProds = products.filter((rp, ri) => ri !== productIdx && !((rp.sizeStock && Object.keys(rp.sizeStock).length > 0) && rp.sizes.every(s => (rp.sizeStock[String(s)] || 0) === 0))).filter(rp => (rp.category || rp.tag) === (p.category || p.tag)).slice(0, 4);
      const anyRelated = relatedProds.length > 0 ? relatedProds : products.filter((_, ri) => ri !== productIdx).slice(0, 4);
      const relatedHtml = anyRelated.map((rp, ri) => {
        const rIdx = products.indexOf(rp);
        const rImgs = rp.images && rp.images.length ? rp.images : (rp.img ? [rp.img] : []);
        const rEmoji = EMOJIS[rIdx % EMOJIS.length];
        const thumb = rImgs[0]
          ? `<img class="pdm-related-img" src="${escHtml(rImgs[0])}" alt="${escHtml(rp.name)}" onerror="this.outerHTML='<div class=\'pdm-related-emoji\'>${rEmoji}</div>'">`
          : `<div class="pdm-related-emoji">${rEmoji}</div>`;
        return `<div class="pdm-related-card" onclick="closePdm();setTimeout(()=>openPdm(${rIdx}),180)">${thumb}<div class="pdm-related-name">${escHtml(rp.name)}</div><div class="pdm-related-price">Rs. ${rp.price.toLocaleString()}</div></div>`;
      }).join('');

      document.getElementById('pdm-info').innerHTML = `
    <div class="pdm-badge">${escHtml(p.tag || p.category || '')}</div>
    <div class="pdm-title">${escHtml(p.name)}</div>
    <div class="pdm-price-tag">Rs. ${p.price.toLocaleString()}</div>
    <div class="pdm-hr"></div>
    <div><div class="pdm-specs-title">Description</div><div class="pdm-desc-text">${escHtml(p.desc)}</div></div>
    <div class="pdm-hr"></div>
    <div><div class="pdm-specs-title">Key Details</div><div class="pdm-specs-grid">${specsHtml}</div></div>
    <div class="pdm-hr"></div>
    <div><div class="pdm-specs-title">Select Size</div><div class="pdm-sizes-row" id="pdm-sizes-row">${sizesHtml}</div></div>
    <button class="pdm-add-btn" onclick="pdmAddToCart(${productIdx})" ${isOos ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>${isOos ? '⛔ Out of Stock' : 'Add to Cart →'}</button>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="pdm-share-btn" onclick="shareProduct('${escHtml(p.name).replace(/'/g, "\\'")}')">🔗 Share</button>
      <button class="pdm-share-btn" onclick="openSizeGuide()">📏 Size Guide</button>
      <button class="pdm-share-btn${wishlist.some(w => w.name === p.name) ? ' active' : ''}" onclick="toggleWishlist('${escHtml(p.name).replace(/'/g, "\\'")}',this)" style="${wishlist.some(w => w.name === p.name) ? 'color:var(--red);border-color:var(--red)' : ''}">♡ Wishlist</button>
    </div>
    ${isOos ? `<div class="notify-wrap"><div style="font-size:.78rem;color:var(--muted);margin-bottom:.3rem">📧 Notify me when back in stock</div><div class="notify-row"><input class="notify-input" type="email" id="notify-email-${productIdx}" placeholder="your@email.com"><button class="notify-btn" onclick="notifyMe('${escHtml(p.name)}',document.getElementById('notify-email-${productIdx}'),document.getElementById('notify-hint-${productIdx}'))">Notify Me</button></div><div class="notify-hint" id="notify-hint-${productIdx}"></div></div>` : ''}
    ${anyRelated.length ? `<div class="pdm-related"><div class="pdm-related-title">You Might Also Like</div><div class="pdm-related-row">${relatedHtml}</div></div>` : ''}`;

      document.getElementById('pdm-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(initPdmZoom, 100);
      // Reviews removed to match store page
      
      // Track product view in Firebase analytics
      trackProductView(p.name);
    }





    function pdmAddToCart(productIdx) {
      const p = products[productIdx];
      const ss = p.sizeStock || {};
      const hasSizeStock = Object.keys(ss).length > 0;
      if (hasSizeStock && p.sizes.every(s => (ss[String(s)] || 0) === 0)) { alert('Sorry, this product is out of stock.'); return; }
      const selBtn = document.querySelector('#pdm-sizes-row .pdm-sz.sel');
      if (!selBtn) {
        document.querySelectorAll('.pdm-sz').forEach(b => b.style.outline = '1px solid #2563eb');
        setTimeout(() => document.querySelectorAll('.pdm-sz').forEach(b => b.style.outline = ''), 1000);
        return;
      }
      const size = Number(selBtn.getAttribute('data-size'));
      if (hasSizeStock && ss[String(size)] !== undefined && ss[String(size)] <= 0) { alert(`Sorry, size EU ${size} is out of stock.`); return; }
      cart.push({ name: p.name, price: p.price, size, productIdx });
      renderCart();
      document.getElementById('order').classList.add('visible');
      closePdm();
      document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }


    document.addEventListener('keydown', e => {
      const pdmOpen = document.getElementById('pdm-overlay').classList.contains('open');
      if (pdmOpen) {
        if (e.key === 'Escape') closePdm();
        if (e.key === 'ArrowLeft') pdmNav(-1);
        if (e.key === 'ArrowRight') pdmNav(1);
      }
    });

    // =============================================
    // CATEGORY FILTER
    // =============================================
    let activeCat = '';



    // Patch handleSearch to also apply category filter
    const _origHandleSearch = handleSearch;
    function handleSearch() {
      const query = document.getElementById('store-search').value.trim().toLowerCase();
      const sort = document.getElementById('search-sort').value;
      const clearBtn = document.getElementById('search-clear-btn');
      clearBtn.classList.toggle('visible', query.length > 0 || activeCat !== '');

      let filtered = products.filter(p => {
        const matchQuery = !query || p.name.toLowerCase().includes(query)
          || (p.tag || '').toLowerCase().includes(query)
          || (p.category || '').toLowerCase().includes(query)
          || p.desc.toLowerCase().includes(query);
        const matchCat = !activeCat || (p.category || p.tag || '') === activeCat;
        return matchQuery && matchCat;
      });

      if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
      if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
      if (sort === 'name-asc') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

      renderStore(query || sort !== 'default' || activeCat ? filtered : undefined);
    }

    // =============================================
    // RETURN POLICY MODAL
    // =============================================
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('policy-overlay').classList.contains('open')) closePolicy();
    });

    // =============================================
    // ANALYTICS — page view + product view tracking
    // =============================================


    // =============================================
    // ORDER RATE LIMITING (client-side + Firestore)
    // =============================================
    const ORDER_COOLDOWN_MS = 60 * 1000; // 60 seconds



    // =============================================
    // COUPON / DISCOUNT SYSTEM (Firebase-linked)
    // =============================================
    let appliedCoupon = null; // { code, type:'pct'|'flat', value, label }
    let availableCoupons = {}; // loaded from Firebase settings






    // =============================================
    // ORDER CONFIRMATION PAGE
    // =============================================


    // =============================================
    // STOCK GUARD — re-check at checkout submit
    // =============================================

    // =============================================
    // CART PERSISTENCE (localStorage between sessions)
    // =============================================
    function loadCartFromStorage() {
      try {
        const saved = localStorage.getItem('sole_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length) {
            cart = parsed;
            renderCart();
            document.getElementById('order').classList.add('visible');
          }
        }
      } catch (e) { }
    }

    // =============================================
    // WISHLIST
    // =============================================
    let wishlist = [];

    // Keyboard close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('wishlist-overlay').classList.contains('open')) closeWishlist();
        if (document.getElementById('sizeguide-overlay').classList.contains('open')) closeSizeGuide();
      }
    });

    // =============================================
    // SIZE GUIDE
    // =============================================

    // =============================================
    // PRODUCT SHARE
    // =============================================

    // =============================================
    // CURRENCY TOGGLE (PKR ↔ USD)
    // =============================================
    let showUsd = false;
    let usdRate = 278; // fallback rate; updated from Firebase settings if available


    // =============================================
    // FREE DELIVERY THRESHOLD
    // =============================================
    let freeDeliveryThreshold = 0; // set from Firebase settings

        function updateFreeDeliveryBar() {
            /* Trust strip stays visible */
        }

    // =============================================
    // NOTIFY ME WHEN BACK IN STOCK (Firebase-linked)
    // =============================================

    // =============================================
    // IMAGE ZOOM in PDM
    // =============================================

    // =============================================
    // PHONE + FIELD VALIDATION
    // =============================================

    // =============================================
    // ORDER SUBMIT LOADING STATE
    // =============================================
    function setSubmitLoading(loading) {
      const btns = document.querySelectorAll('.checkout-submit-btn, .submit-btn');
      btns.forEach(btn => {
        if (loading) {
          btn.classList.add('loading');
          btn.dataset.origText = btn.textContent;
          btn.textContent = 'Placing Order...';
        } else {
          btn.classList.remove('loading');
          if (btn.dataset.origText) btn.textContent = btn.dataset.origText;
        }
      });
    }

    // =============================================
    // CUSTOMER ORDER CANCELLATION
    // =============================================

    // =============================================
    // PRODUCT REVIEWS & RATINGS (Firebase-linked)
    // =============================================
    const productReviews = {}; // { productName: [{ author, rating, text, date }] }
    let pendingReviewRating = 0;
    let pendingReviewProductName = '';








    // Average rating helper for product cards

    // Pre-load reviews for visible products


    // =============================================
    // Update mobile tab bar badge counts

    // =============================================
    // ADMIN-ONLY STUBS (functions referenced in shared
    // code but only implemented in admin.html)
    // =============================================
    function syncFooterContact() {
      const phone = document.getElementById('footer-phone');
      const city = document.getElementById('footer-city');
      const ig = document.getElementById('footer-ig-link');
      const digits = (waNumber || '').replace(/[^0-9]/g, '');
      if (phone) phone.textContent = digits ? ('+' + digits) : 'Order on WhatsApp';
      if (city && !city.dataset.custom) city.textContent = localStorage.getItem('sole_store_city') || 'Pakistan';
      const igUrl = localStorage.getItem('sole_instagram') || '';
      if (ig && igUrl) ig.href = igUrl;
    }


    // Subtle card entrance — transform only, no opacity changes

    // =============================================
    // SCROLL-REVEAL OBSERVER
    // Adds 'revealed' class when elements enter viewport
    // =============================================

    // =============================================
    // NAV SCROLL EFFECT — adds .scrolled on scroll
    // =============================================

    // =============================================
    // ADD REVEAL CLASSES TO STATIC ELEMENTS
    // =============================================

    // =============================================
    // PRODUCT CARD SCROLL REVEAL (for lazy grids)
    // =============================================

    // =============================================
    // ADD-TO-CART BUTTON PULSE
    // =============================================
    const _origAddToCart = typeof addToCart === 'function' ? addToCart : null;

    // =============================================
    // WISHLIST HEART POP ANIMATION
    // =============================================
    const _origToggleWishlist = typeof toggleWishlist === 'function' ? toggleWishlist : null;

    // STORE INIT — deferred until DOM + scripts ready
    function populatePaymentDetails() {
      loadStorePaymentCache();
      const name = storePayment.accountName || 'SOLE';
      const setText = (id, val, fallback) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || fallback;
      };
      const setCopyBtn = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (val) {
          el.dataset.value = val;
          el.textContent = val + ' (copy)';
        } else {
          el.dataset.value = '';
          el.textContent = 'Configure in Admin';
        }
      };
      setText('pay-account-name-ep', name, 'SOLE');
      setText('pay-account-name-sp', name, 'SOLE');
      setText('pay-account-name-bank', name, 'SOLE');
      setCopyBtn('pay-easypaisa-num', storePayment.easypaisaNumber);
      setCopyBtn('pay-sadapay-num', storePayment.sadapayNumber);
      setCopyBtn('pay-bank-account', storePayment.bankAccount);
      setText('pay-bank-name', storePayment.bankName, '—');
    }

    document.addEventListener("DOMContentLoaded", function () {
      loadData();
      loadWishlist();
      loadCartFromStorage();
      updateTabBarBadges();
      waSyncFromFirebase();
      initEmailJs();
      populatePaymentDetails();
      // renderStore(); // Removed for checkout-only page
      renderCart();
      updateOrderBadge();
      loadPayoneerId();
      setDbStatus('saving', 'Connecting to Firebase...');
      initFirebase(FIREBASE_CONFIG);
      localStorage.setItem('sole_firebase_config', JSON.stringify(FIREBASE_CONFIG));

      // Init animations (excluding product-specific ones)
      applyRevealClasses();
      initScrollReveal();
      initNavScrollEffect();
      // initProductCardReveal(); // Removed

      // Smooth scroll override
      document.documentElement.style.scrollBehavior = 'smooth';
    });
