        document.documentElement.style.opacity = "1";
        if (document.body) document.body.style.opacity = "1";

// Shared logic loaded from core.js

        // STORE RENDER (search-aware)
        // =============================================
        function renderStore(filtered) {
            renderCategoryBar();
            const grid = document.getElementById('product-grid');
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

                const template = document.getElementById('product-card-template');
                const clone = template.content.cloneNode(true);
                const card = clone.querySelector('.product-card');
                
                if (isOos) card.classList.add('oos');

                // Stock Banner
                if (isOos) {
                    clone.querySelector('.banner-container').innerHTML = '<div class="oos-banner">Out of Stock</div>';
                } else if (isLow) {
                    clone.querySelector('.banner-container').innerHTML = `<div class="low-stock-banner">Only ${totalStock} left!</div>`;
                }

                // Wishlist Button
                const isWishlisted = wishlist.some(w => w.name === p.name);
                const wishBtn = clone.querySelector('.wishlist-btn');
                if (isWishlisted) wishBtn.classList.add('active');
                wishBtn.dataset.name = p.name;
                wishBtn.title = isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
                wishBtn.onclick = function() { toggleWishlist(p.name, this); };

                // Image Wrap
                const imgWrap = clone.querySelector('.product-img-wrap');
                imgWrap.title = isOos ? 'Out of Stock' : 'View details';
                if (!isOos) imgWrap.onclick = () => openPdm(i);

                const imgEl = clone.querySelector('.product-img');
                const placeholder = clone.querySelector('.product-img-placeholder');
                if (coverImg) {
                    imgEl.src = coverImg;
                    imgEl.alt = p.name;
                    imgEl.onerror = () => { imgEl.style.display = 'none'; placeholder.style.display = 'flex'; };
                    placeholder.textContent = emoji;
                } else {
                    imgEl.style.display = 'none';
                    placeholder.style.display = 'flex';
                    placeholder.textContent = emoji;
                }

                const hint = clone.querySelector('.pdm-card-hint');
                if (isOos) {
                    hint.style.display = 'none';
                } else {
                    hint.textContent = '👁 View Details' + (coverImg ? ` · ${imgs.length} photo${imgs.length !== 1 ? 's' : ''}` : '');
                }

                // Tag
                const tagEl = clone.querySelector('.product-tag');
                tagEl.textContent = (p.tag === 'HDSBHSJD' || !p.tag) ? 'Sale' : p.tag;

                // Rating
                const ratingEl = clone.querySelector('.product-rating-row');
                const r = getProductRating(p.name);
                if (r) {
                    const filled = Math.round(r);
                    ratingEl.innerHTML = `<span class="product-rating-stars">${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}</span><span class="product-rating-count">(${r.toFixed(1)})</span>`;
                }

                // Name & Desc
                const nameEl = clone.querySelector('.product-name');
                nameEl.textContent = p.name;
                if (!isOos) {
                    nameEl.style.cursor = 'pointer';
                    nameEl.onclick = () => openPdm(i);
                } else {
                    nameEl.style.cursor = 'default';
                }
                clone.querySelector('.product-desc').textContent = p.desc;

                // OOS Label
                if (isOos) {
                    clone.querySelector('.oos-label-container').innerHTML = '<div class="oos-label">⛔ Currently unavailable</div>';
                }

                // Sizes
                const sizeRow = clone.querySelector('.size-row');
                sizeRow.id = `sizes-${key}`;

                // Footer
                clone.querySelector('.product-price').innerHTML = fmtPrice(p.price);
                const addBtn = clone.querySelector('.add-cart-btn');
                if (isOos) {
                    addBtn.disabled = true;
                    addBtn.title = 'Out of stock';
                } else {
                    addBtn.onclick = function() { addToCart(i, key, this); };
                }

                grid.appendChild(clone);
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
            saveCartToStorage();
            updateTabBarBadges();
            openCartDrawer();
        }
        function renderCart() {
            const c = document.getElementById('cart-items'), cnt = document.getElementById('order-count'), tot = document.getElementById('cart-total');
            const grandEl = document.getElementById('cart-grand-total-val');
            const delivEl = document.getElementById('cart-delivery-val');
            // Guard: cart elements may not exist on pages without the checkout section
            if (!c && !cnt && !tot) return;
            if (cnt) cnt.textContent = cart.length;
            if (!cart.length) {
                if (c) c.innerHTML = '<div class="empty-cart">No items yet — pick a pair above ↑</div>';
                if (tot) tot.textContent = 'Rs. 0';
                if (grandEl) grandEl.textContent = 'Rs. 0';
                if (delivEl) delivEl.textContent = 'Rs. ' + deliveryCharge.toLocaleString();
                return;
            }
            let html = '', subtotal = 0;
            cart.forEach((item, i) => {
                subtotal += item.price;
                const p = (item.productIdx !== undefined) ? products[item.productIdx] : null;
                const imgs = p ? (p.images && p.images.length ? p.images : (p.img ? [p.img] : [])) : [];
                const emoji = p ? EMOJIS[item.productIdx % EMOJIS.length] : '👟';
                const thumbHtml = imgs[0]
                    ? `<img class="cart-item-thumb" src="${escHtml(imgs[0])}" alt="${escHtml(item.name)}" onerror="this.outerHTML='<div class=\\'cart-item-thumb-emoji\\'>${emoji}</div>'">`
                    : `<div class="cart-item-thumb-emoji">${emoji}</div>`;
                html += `<div class="cart-item">
      <div class="cart-item-left">
        ${thumbHtml}
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(item.name)}</div>
          <div class="cart-item-size">Size EU ${item.size}</div>
        </div>
      </div>
      <div class="cart-item-right">
        <div>Rs. ${item.price.toLocaleString()}</div>
        <button class="remove-btn" onclick="removeFromCart(${i})">✕</button>
      </div>
    </div>`;
            });
            c.innerHTML = html;
            const discount = calcDiscount(subtotal);
            const discountRow = document.getElementById('cart-discount-row');
            const discountLabel = document.getElementById('cart-discount-label');
            const discountVal = document.getElementById('cart-discount-val');
            if (discountRow) {
                if (discount > 0) {
                    discountRow.style.display = 'flex';
                    if (discountLabel) discountLabel.textContent = appliedCoupon ? ('Discount: ' + appliedCoupon.code) : 'Discount';
                    if (discountVal) discountVal.textContent = '−Rs. ' + discount.toLocaleString();
                } else {
                    discountRow.style.display = 'none';
                }
            }
            tot.textContent = 'Rs. ' + subtotal.toLocaleString();
            if (delivEl) delivEl.textContent = 'Rs. ' + deliveryCharge.toLocaleString();
            if (grandEl) grandEl.textContent = 'Rs. ' + (subtotal + deliveryCharge - discount).toLocaleString();
            saveCartToStorage();
            updateFreeDeliveryBar();
            updateTabBarBadges();
        }

        // =============================================
        // 2-PAGE CHECKOUT NAVIGATION
        // =============================================
        function goToPaymentPage() {
            if (!document.getElementById('checkout-page-2')) return;
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


        function selectPayment(method, btn) {
            selectedPayment = method;
            document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('selected'));
            btn.classList.add('selected');
            document.querySelectorAll('.pay-detail').forEach(d => d.classList.remove('active'));
            document.getElementById('pay-' + method).classList.add('active');
        }




        // =============================================
        // PLACE ORDER
        // =============================================
        async function placeOrder() {
            if (!document.getElementById('order')) return; // checkout page only
            setSubmitLoading(true);
            try { await _placeOrderInner(); } finally { setSubmitLoading(false); }
        }
        async function _placeOrderInner() {
            const fname = sanitiseInput(document.getElementById('fname').value);
            const lname = sanitiseInput(document.getElementById('lname').value);
            const email = sanitiseInput(document.getElementById('email').value);
            const phone = sanitisePhone(document.getElementById('phone').value);
            const address = sanitiseInput(document.getElementById('address').value);

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
        // WHATSAPP CONFIG (waNumber declared in core.js)
        // =============================================

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
                return `<div class="${cls}" ${sOos ? '' : 'onclick="pdmSelectSize(this)"'} title="${title}">${s}${stockNote}</div>`;
            }).join('');

            const stockVal = isOos ? '<span style="color:var(--red)">⛔ Out of Stock</span>'
                : !hasSizeStock && totalLeft === null ? '—'
                    : isLow ? `<span style="color:var(--orange)">⚠ Only ${totalLeft} pairs left</span>`
                        : `<span style="color:var(--green)">✓ Available in ${availSizes.length} size${availSizes.length !== 1 ? 's' : ''}</span>`;

            document.getElementById('pdm-info').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
            <div class="pdm-badge">${escHtml(p.tag || p.category || '')}</div>
            <div class="pdm-title">${escHtml(p.name)}</div>
            <div class="pdm-price-tag">Rs. ${p.price.toLocaleString()}</div>
        </div>
        <button class="pdm-share-btn${wishlist.some(w => w.name === p.name) ? ' active' : ''}" onclick="toggleWishlist('${escHtml(p.name).replace(/'/g, "\\'")}',this)" style="border:none;background:none;font-size:1.5rem;padding:0;${wishlist.some(w => w.name === p.name) ? 'color:var(--red);' : 'color:var(--muted);'}" title="Wishlist">♡</button>
    </div>
    
    <div class="pdm-desc-text" style="margin-top:0.5rem; font-size:0.9rem;">${escHtml(p.desc)}</div>
    
    <div style="margin-top:1.5rem;">
      <div class="pdm-specs-title" style="margin-bottom:0.5rem;">Select Size</div>
      <div class="pdm-sizes-row" id="pdm-sizes-row">${sizesHtml}</div>
    </div>
    
    <button class="pdm-add-btn" onclick="pdmAddToCart(${productIdx})" style="margin-top:1rem;" ${isOos ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>${isOos ? '⛔ Out of Stock' : 'Add to Cart →'}</button>
    
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem;">
      <button class="pdm-share-btn" onclick="openSizeGuide()">📏 Size Guide</button>
      <button class="pdm-share-btn${wishlist.some(w => w.name === p.name) ? ' active' : ''}" onclick="toggleWishlist('${escHtml(p.name).replace(/'/g, "\\'")}',this)" style="${wishlist.some(w => w.name === p.name) ? 'color:var(--red);border-color:var(--red)' : ''}">♡ Wishlist</button>
    </div>
    ${isOos ? `<div class="notify-wrap"><div style="font-size:.78rem;color:var(--muted);margin-bottom:.3rem">📧 Notify me when back in stock</div><div class="notify-row"><input class="notify-input" type="email" id="notify-email-${productIdx}" placeholder="your@email.com"><button class="notify-btn" onclick="notifyMe('${escHtml(p.name)}',document.getElementById('notify-email-${productIdx}'),document.getElementById('notify-hint-${productIdx}'))">Notify Me</button></div><div class="notify-hint" id="notify-hint-${productIdx}"></div></div>` : ''}`;

            document.getElementById('pdm-overlay').classList.add('open');
            document.body.style.overflow = 'hidden';
            setTimeout(initPdmZoom, 100);
            // Reviews removed as requested
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
            saveCartToStorage();
            updateTabBarBadges();
            closePdm();
            openCartDrawer();
        }

        // =============================================
        // CART DRAWER (slide-out sidebar)
        // =============================================
        function openCartDrawer() {
            renderCartDrawer();
            document.getElementById('cart-drawer').classList.add('open');
            document.getElementById('cart-drawer-backdrop').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeCartDrawer() {
            document.getElementById('cart-drawer').classList.remove('open');
            document.getElementById('cart-drawer-backdrop').classList.remove('open');
            document.body.style.overflow = '';
        }

        function removeFromCartDrawer(i) {
            cart.splice(i, 1);
            saveCartToStorage();
            updateTabBarBadges();
            renderCartDrawer();
            if (!cart.length) closeCartDrawer();
        }

        function renderCartDrawer() {
            const itemsEl = document.getElementById('cart-drawer-items');
            const countEl = document.getElementById('cart-drawer-count');
            const subtotalEl = document.getElementById('cart-drawer-subtotal-val');
            const footerEl = document.getElementById('cart-drawer-footer');
            const shippingText = document.getElementById('cart-drawer-shipping-text');
            const shippingFill = document.getElementById('cart-drawer-shipping-fill');
            const shippingBar = document.getElementById('cart-drawer-shipping-bar');

            if (countEl) countEl.textContent = '(' + cart.length + ' item' + (cart.length !== 1 ? 's' : '') + ')';

            if (!cart.length) {
                if (itemsEl) itemsEl.innerHTML = '<div class="cart-drawer-empty">Your cart is empty</div>';
                if (subtotalEl) subtotalEl.textContent = 'Rs 0';
                if (footerEl) footerEl.style.display = 'none';
                if (shippingBar) shippingBar.style.display = 'none';
                return;
            }

            if (footerEl) footerEl.style.display = 'block';

            // Free shipping bar (threshold = 5000)
            const FREE_SHIP = 5000;
            let subtotal = 0;
            cart.forEach(item => subtotal += item.price);
            const remaining = FREE_SHIP - subtotal;
            if (shippingBar) {
                if (remaining > 0) {
                    shippingBar.style.display = 'block';
                    if (shippingText) shippingText.innerHTML = '🚚 Spend <strong>Rs ' + remaining.toLocaleString() + ' more</strong> to get free shipping';
                    if (shippingFill) shippingFill.style.width = Math.min(100, (subtotal / FREE_SHIP) * 100) + '%';
                } else {
                    shippingBar.style.display = 'block';
                    if (shippingText) shippingText.innerHTML = '🎉 <strong>You qualify for free shipping!</strong>';
                    if (shippingFill) shippingFill.style.width = '100%';
                }
            }

            // Render items
            let html = '';
            cart.forEach((item, i) => {
                const p = (item.productIdx !== undefined) ? products[item.productIdx] : null;
                const imgs = p ? (p.images && p.images.length ? p.images : (p.img ? [p.img] : [])) : [];
                const emoji = p ? EMOJIS[item.productIdx % EMOJIS.length] : '👟';
                const thumbHtml = imgs[0]
                    ? '<img class="cart-drawer-item-img" src="' + escHtml(imgs[0]) + '" alt="' + escHtml(item.name) + '" onerror="this.outerHTML=\'<div class=cart-drawer-item-emoji>' + emoji + '</div>\'">' 
                    : '<div class="cart-drawer-item-emoji">' + emoji + '</div>';
                html += '<div class="cart-drawer-item">' +
                    '<div class="cart-drawer-item-left">' + thumbHtml +
                    '<div class="cart-drawer-item-info">' +
                    '<div class="cart-drawer-item-name">' + escHtml(item.name) + '</div>' +
                    '<div class="cart-drawer-item-size">Size EU ' + item.size + '</div>' +
                    '</div></div>' +
                    '<div class="cart-drawer-item-right">' +
                    '<div class="cart-drawer-item-price">Rs ' + item.price.toLocaleString() + '</div>' +
                    '<button class="cart-drawer-item-remove" onclick="removeFromCartDrawer(' + i + ')" title="Remove">🗑</button>' +
                    '</div></div>';
            });
            if (itemsEl) itemsEl.innerHTML = html;
            if (subtotalEl) subtotalEl.textContent = 'Rs ' + subtotal.toLocaleString();
        }


        document.addEventListener('keydown', e => {
            const pdmOpen = document.getElementById('pdm-overlay').classList.contains('open');
            if (pdmOpen) {
                if (e.key === 'Escape') closePdm();
                if (e.key === 'ArrowLeft') pdmNav(-1);
                if (e.key === 'ArrowRight') pdmNav(1);
            }
            const drawerOpen = document.getElementById('cart-drawer').classList.contains('open');
            if (drawerOpen && e.key === 'Escape') closeCartDrawer();
        });

        // =============================================
        // SEARCH AND CATEGORY FILTER
        // =============================================
        window.activeCat = '';

        window.filterCategory = function(cat) {
            window.activeCat = cat;
            if (typeof renderCategoryBar === 'function') renderCategoryBar();
            handleSearch();
        };

        window.handleSearch = function() {
            const searchInput = document.getElementById('store-search');
            const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
            const clearX = document.getElementById('search-clear-x');
            const sort = document.getElementById('search-sort') ? document.getElementById('search-sort').value : '';

            if (clearX) clearX.classList.toggle('visible', query.length > 0 || window.activeCat !== '');

            let filtered = products.filter(p => {
                const nameMatch = p.name && p.name.toLowerCase().includes(query);
                const tagMatch = p.tag && p.tag.toLowerCase().includes(query);
                const catMatch = p.category && p.category.toLowerCase().includes(query);
                const descMatch = p.desc && p.desc.toLowerCase().includes(query);
                
                const matchQuery = !query || nameMatch || tagMatch || catMatch || descMatch;
                const matchCategory = !window.activeCat || (p.category || p.tag || '') === window.activeCat;
                return matchQuery && matchCategory;
            });

            if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
            if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
            if (sort === 'name-asc') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

            renderStore(query || window.activeCat || (sort && sort !== 'default') ? filtered : undefined);
            
            if (typeof initProductCardReveal === 'function') {
                initProductCardReveal();
            } else {
                document.querySelectorAll('.product-card').forEach(c => {
                    c.style.opacity = '1';
                    c.style.transform = 'none';
                });
            }
        };

        window.clearSearch = function() {
            const searchInput = document.getElementById('store-search');
            if (searchInput) searchInput.value = '';
            window.activeCat = '';
            if (typeof renderCategoryBar === 'function') renderCategoryBar();
            const clearX = document.getElementById('search-clear-x');
            if (clearX) clearX.classList.remove('visible');
            handleSearch();
        };

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
                        const orderEl = document.getElementById('order'); if (orderEl) orderEl.classList.add('visible');
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
            /* Trust strip stays visible; free-delivery promos belong on checkout/cart UI */
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
            const btns = document.querySelectorAll('.submit-btn');
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
            if (ig && igUrl) { ig.href = igUrl; ig.style.display = ''; } else if (ig) { ig.href = 'https://instagram.com/'; }
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
        document.addEventListener("DOMContentLoaded", function () {
            loadData();
            loadWishlist();
            loadCartFromStorage();
            updateTabBarBadges();
            waSyncFromFirebase();
            initEmailJs();
            renderStore();
            // renderCart / updateOrderBadge live in checkout.html
            setDbStatus('saving', 'Connecting to Firebase...');
            initFirebase(FIREBASE_CONFIG);
            localStorage.setItem('sole_firebase_config', JSON.stringify(FIREBASE_CONFIG));

            // Init animations
            applyRevealClasses();
            initScrollReveal();
            initNavScrollEffect();
            initProductCardReveal();

            document.documentElement.style.scrollBehavior = 'smooth';

            // Check for search query in URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('search')) {
                const query = urlParams.get('search');
                const searchInput = document.getElementById('store-search');
                if (searchInput) {
                    searchInput.value = query;
                    // Poll for products to load, then filter and scroll
                    const checkProducts = setInterval(() => {
                        if (products && products.length > 0) {
                            clearInterval(checkProducts);
                            handleSearch();
                            const productsEl = document.getElementById('products');
                            if (productsEl) productsEl.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 200);
                    // Clear interval after 5 seconds to prevent infinite polling
                    setTimeout(() => clearInterval(checkProducts), 5000);
                }
            }

            // =============================================
            // HERO BACKGROUND SLIDER
            // =============================================
            function initHeroSlider() {
                const vids = [
                    document.getElementById('vi-vid-1'),
                    document.getElementById('vi-vid-2'),
                    document.getElementById('vi-vid-3')
                ];
                if (!vids[0]) return;

                let currentActive = 0;

                setInterval(() => {
                    vids[currentActive].classList.remove('active');

                    currentActive = (currentActive + 1) % vids.length;

                    // reset animation hack
                    vids[currentActive].classList.remove('active');
                    void vids[currentActive].offsetWidth;
                    vids[currentActive].classList.add('active');
                }, 5800);
            }

            initHeroSlider();
            initHeroCarousel();
        });

        function initHeroCarousel() {
            var HERO_SLIDES = [
                { src: 'images/hero/jordan.png', label: 'Nike Jordan', alt: 'Nike Air Jordan 1 Low', flip: true },
                { src: 'images/hero/samba.png', label: 'Samba', alt: 'Adidas Samba', flip: false },
                { src: 'images/hero/skechers.png', label: 'Skechers', alt: 'Skechers Slip-ins', flip: false },
                { src: 'images/hero/jordan.png', label: 'Nike Jordan', alt: 'Nike Air Jordan 1 Low', flip: true }
            ];
            var stage = document.getElementById('polaroid-stage');
            var stack = document.getElementById('polaroid-stack');
            var dotsWrap = document.getElementById('hero-dots');
            if (!stage || !stack || !dotsWrap) return;

            var polaroids = stack.querySelectorAll('.polaroid');
            var index = 0;
            var startX = 0;
            var autoplayTimer = null;

            function mod(n, m) { return ((n % m) + m) % m; }

            function fillPolaroid(el, slide) {
                var img = el.querySelector('img');
                var cap = el.querySelector('.polaroid-caption');
                if (!img) return;
                img.src = slide.src;
                img.alt = slide.alt;
                img.classList.toggle('flip', !!slide.flip);
                if (cap) cap.textContent = slide.label;
            }

            function render() {
                var n = HERO_SLIDES.length;
                var offsets = [-2, -1, 0, 1, 2];
                polaroids.forEach(function (p, i) {
                    var off = offsets[i];
                    var si = mod(index + off, n);
                    fillPolaroid(p, HERO_SLIDES[si]);
                });
                dotsWrap.querySelectorAll('.dot').forEach(function (d, j) {
                    var on = j === index;
                    d.classList.toggle('active', on);
                    d.setAttribute('aria-selected', on ? 'true' : 'false');
                });
            }

            dotsWrap.innerHTML = '';
            HERO_SLIDES.forEach(function (s, i) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'dot' + (i === 0 ? ' active' : '');
                btn.setAttribute('role', 'tab');
                btn.setAttribute('aria-label', s.label);
                btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
                btn.addEventListener('click', function () {
                    index = i;
                    render();
                    resetAutoplay();
                });
                dotsWrap.appendChild(btn);
            });

            function goTo(i) {
                index = mod(i, HERO_SLIDES.length);
                render();
            }
            function next() { goTo(index + 1); }
            function prev() { goTo(index - 1); }

            function resetAutoplay() {
                if (autoplayTimer) clearInterval(autoplayTimer);
                autoplayTimer = setInterval(next, 5000);
            }

            stage.addEventListener('touchstart', function (e) {
                startX = e.touches[0].clientX;
            }, { passive: true });
            stage.addEventListener('touchend', function (e) {
                var dx = e.changedTouches[0].clientX - startX;
                if (Math.abs(dx) > 45) {
                    if (dx < 0) next(); else prev();
                    resetAutoplay();
                }
            }, { passive: true });

            var mouseDown = false;
            stage.addEventListener('mousedown', function (e) {
                mouseDown = true;
                startX = e.clientX;
            });
            window.addEventListener('mouseup', function (e) {
                if (!mouseDown) return;
                var dx = e.clientX - startX;
                if (Math.abs(dx) > 45) {
                    if (dx < 0) next(); else prev();
                    resetAutoplay();
                }
                mouseDown = false;
            });

            render();
            resetAutoplay();
        }