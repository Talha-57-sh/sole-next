// SOLE — shared config, Firebase, auth, utilities
        // Load dynamic configuration from server (via /config.js)
        const FIREBASE_CONFIG = window.__SOLE_CONFIG || {};


        // =============================================
        // ✏️  EDIT YOUR DEFAULT PRODUCTS HERE
        // =============================================
        const DEFAULT_PRODUCTS = [
            { name: "Aero Runner", price: 12900, tag: "Bestseller", desc: "Breathable mesh upper with cushioned sole. Good for daily wear and light runs.", sizes: [38, 39, 40, 41, 42, 43, 44, 45], img: "" },
            { name: "Urban Slip", price: 9500, tag: "New", desc: "Low-profile slip-on with a soft insole. Easy to pair with jeans or chinos.", sizes: [38, 39, 40, 41, 42, 43, 44], img: "" },
            { name: "Oxford Elite", price: 21000, tag: "Formal", desc: "Polished leather oxford for office and events. EU sizing.", sizes: [39, 40, 41, 42, 43, 44, 45], img: "" },
            { name: "Trail Hike Pro", price: 18500, tag: "Outdoor", desc: "Grip sole and reinforced toe. For trails and rainy days.", sizes: [38, 39, 40, 41, 42, 43, 44, 45], img: "" },
            { name: "Vela Heel", price: 24800, tag: "Women", desc: "Block heel with padded footbed. Stable height for long evenings out.", sizes: [35, 36, 37, 38, 39, 40, 41], img: "" },
            { name: "Drift Sandal", price: 7200, tag: "Summer", desc: "Adjustable straps and contoured footbed. Lightweight for hot weather.", sizes: [36, 37, 38, 39, 40, 41, 42, 43], img: "" }
        ];

        // =============================================
        // 🔐 DEFAULT PASSWORD (SHA-256 of "sole2025")
        // After first run, password hash is stored in localStorage
        // =============================================
        const DEFAULT_PW_HASH = "b9c950640b0040b1c5e73c76aef8ee13b73b4e9e9c2b0d46a4f1d3e2b0e5c8f1"; // sole2025 placeholder – real hash computed at init

        // Payment method display names
        const PAY_LABELS = { cod: "Cash on Delivery", easypaisa: "Easypaisa", sadapay: "SadaPay", payoneer: "Payoneer", bank: "Bank Transfer" };
        const PAY_ICONS = { cod: "COD", easypaisa: "EP", sadapay: "SP", payoneer: "PO", bank: "BNK" };
        const EMOJIS = ["👟", "🥿", "👞", "🥾", "👠", "🩴", "👡", "👢"];

        let products = [], orders = [], cart = [], selectedSizes = {}, adminUnlocked = false;
        let selectedPayment = "cod";
        let deliveryCharge = 0;
        var waNumber = '';
        let storePayment = { accountName: "SOLE", easypaisaNumber: "", sadapayNumber: "", bankName: "", bankAccount: "" };

        function loadStorePaymentCache() {
            try {
                const raw = localStorage.getItem('sole_payment');
                if (raw) storePayment = { ...storePayment, ...JSON.parse(raw) };
            } catch (e) { /* ignore */ }
        }

        function applyStoreSettings(data) {
            if (!data) return;
            if (typeof data.deliveryCharge === 'number') {
                deliveryCharge = data.deliveryCharge;
                localStorage.setItem('sole_delivery_charge', deliveryCharge);
                if (typeof renderCart === 'function') renderCart();
            }
            if (data.waNumber) {
                waNumber = data.waNumber;
                localStorage.setItem('sole_wa_number', waNumber);
                if (typeof setWaLinks === 'function') setWaLinks();
                if (typeof syncFooterContact === 'function') syncFooterContact();
            }
            if (data.storeCity) {
                localStorage.setItem('sole_store_city', data.storeCity);
                const fc = document.getElementById('footer-city');
                if (fc) { fc.textContent = data.storeCity; fc.dataset.custom = '1'; }
            }
            if (data.instagram) {
                localStorage.setItem('sole_instagram', data.instagram);
                const ig = document.getElementById('footer-ig-link');
                if (ig) ig.href = data.instagram;
            }
            if (data.returnPolicy) {
                const pb = document.getElementById('policy-body');
                if (pb) pb.innerHTML = data.returnPolicy;
            }
            if (data.coupons !== undefined && typeof loadCouponsFromSettings === 'function') {
                loadCouponsFromSettings(data);
            }
            if (typeof data.freeDeliveryThreshold === 'number') freeDeliveryThreshold = data.freeDeliveryThreshold;
            if (typeof data.usdRate === 'number' && data.usdRate > 0) usdRate = data.usdRate;
            if (data.payment) {
                storePayment = { ...storePayment, ...data.payment };
                localStorage.setItem('sole_payment', JSON.stringify(storePayment));
                if (typeof populatePaymentDetails === 'function') populatePaymentDetails();
            }
            if (data.emailjs) {
                localStorage.setItem('sole_emailjs', JSON.stringify(data.emailjs));
                if (data.emailjs.publicKey && typeof emailjs !== 'undefined' && emailjs.init) {
                    try { emailjs.init(data.emailjs.publicKey); } catch(e){}
                }
            }
        }

        // SHA-256 using Web Crypto API
        // =============================================
        // FIREBASE AUTHENTICATION
        // =============================================
        let auth = null;
        let currentUser = null;

        function initAuth() {
            try {
                auth = firebase.auth();
                // Use session persistence
                auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(e => console.warn('Persistence:', e.message));

                // Listen for auth state changes — fires on every page load
                auth.onAuthStateChanged(user => {
                    if (user) {
                        // User is signed in
                        currentUser = user;
                        adminUnlocked = true;
                        // Update email display everywhere
                        document.querySelectorAll('.auth-email-display').forEach(el => el.textContent = user.email);
                        // Show the admin dashboard (hides login screen)
                        if (typeof showDashboard === 'function') showDashboard();
                    } else {
                        // User is signed out
                        currentUser = null;
                        adminUnlocked = false;
                        document.querySelectorAll('.auth-email-display').forEach(el => el.textContent = '—');
                    }
                });
            } catch (e) {
                console.warn('Auth init failed:', e.message);
            }
        }

        async function doLogin() {
            if (!auth) {
                // Firebase not ready yet — show setup notice
                document.getElementById('auth-setup-notice').style.display = 'block';
                return;
            }

            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;
            const errEl = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');

            if (!email || !password) {
                errEl.textContent = 'Please enter your email and password.';
                errEl.classList.add('show');
                return;
            }

            btn.textContent = 'Signing in...';
            btn.disabled = true;
            errEl.classList.remove('show');

            try {
                await auth.signInWithEmailAndPassword(email, password);
                // onAuthStateChanged will fire and call showDashboard()
                document.getElementById('admin-password').value = '';
                document.getElementById('admin-email').value = '';
            } catch (e) {
                btn.textContent = 'Sign In →';
                btn.disabled = false;
                // Show friendly error messages
                const msg = e.code === 'auth/user-not-found' ? 'No account found with this email.'
                    : e.code === 'auth/wrong-password' ? 'Incorrect password.'
                        : e.code === 'auth/invalid-credential' ? 'Incorrect email or password.'
                        : e.code === 'auth/invalid-email' ? 'Invalid email address.'
                            : e.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
                                : e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed'
                                    ? 'Firebase Auth not enabled. See setup notice below.'
                                    : 'Sign in failed: ' + e.message;
                errEl.textContent = msg;
                errEl.classList.add('show');
                // Show setup guide if auth not configured
                if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
                    document.getElementById('auth-setup-notice').style.display = 'block';
                }
            }
        }

        async function adminSignOut() {
            if (!auth) return;
            try {
                await auth.signOut();
                adminUnlocked = false;
                currentUser = null;
                closeAdmin();
            } catch (e) {
                alert('Sign out failed: ' + e.message);
            }
        }

        // Keep sha256 for any legacy use but no longer used for auth
        async function sha256(message) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        function initPasswordHash() {
            // No longer needed — Firebase Auth handles authentication
        }

        // =============================================
        // EMAILJS — ORDER CONFIRMATION EMAILS
        // =============================================
        function loadEmailJsConfig() {
            try { return JSON.parse(localStorage.getItem('sole_emailjs')) || null; } catch (e) { return null; }
        }

        async function saveEmailJsConfig() {
            const cfg = {
                publicKey: document.getElementById('ejs-public-key').value.trim(),
                serviceId: document.getElementById('ejs-service-id').value.trim(),
                templateId: document.getElementById('ejs-template-id').value.trim(),
            };
            const hint = document.getElementById('ejs-hint');
            if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
                hint.textContent = '⚠ All three fields are required.'; hint.style.color = 'var(--red)'; return;
            }
            localStorage.setItem('sole_emailjs', JSON.stringify(cfg));
            emailjs.init(cfg.publicKey);
            
            if (dbReady && db) {
                try {
                    await db.collection('settings').doc('store').set({ emailjs: cfg }, { merge: true });
                } catch (e) {
                    console.error('Failed to save EmailJS to Firebase:', e);
                }
            }

            hint.textContent = '✓ EmailJS config saved! Emails will be sent on new orders.';
            hint.style.color = 'var(--green)';
            setTimeout(() => hint.textContent = '', 4000);
        }

        function initEmailJs() {
            const cfg = loadEmailJsConfig();
            if (cfg && cfg.publicKey) {
                try { emailjs.init(cfg.publicKey); } catch (e) { }
            }
        }

        async function sendOrderConfirmationEmail(order) {
            const cfg = loadEmailJsConfig();
            if (!cfg || !cfg.publicKey || !cfg.serviceId || !cfg.templateId) return; // not configured
            try {
                const itemsList = (order.items || []).map(i =>
                    `${i.name} (Size EU ${i.size}) — Rs. ${Number(i.price).toLocaleString()}`
                ).join('\n');

                await emailjs.send(cfg.serviceId, cfg.templateId, {
                    to_email:         order.customer.email,
                    customer_name:    `${order.customer.fname || ''} ${order.customer.lname || ''}`.trim(),
                    order_id:         order.id,
                    order_total:      Number(order.total || 0).toLocaleString(),
                    order_subtotal:   Number(order.subtotal || 0).toLocaleString(),
                    order_delivery:   Number(order.deliveryCharge || 0).toLocaleString(),
                    order_discount:   Number(order.discount || 0).toLocaleString(),
                    order_items:      itemsList,
                    payment_method:   PAY_LABELS[order.payment] || order.payment,
                    delivery_address: order.customer.address || '—',
                    customer_phone:   order.customer.phone || '—',
                    order_date:       new Date(order.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }),
                    wa_number:        localStorage.getItem('sole_wa_number') || '',
                });
                console.log('✅ Confirmation email sent to', order.customer.email);
            } catch (e) {
                console.warn('Email send failed:', e.text || e.message);
            }
        }

        async function testEmailJs() {
            const cfg = loadEmailJsConfig();
            const hint = document.getElementById('ejs-hint');
            if (!cfg || !cfg.publicKey) {
                hint.textContent = '⚠ Save your config first.'; hint.style.color = 'var(--red)'; return;
            }
            if (!currentUser) {
                hint.textContent = '⚠ You must be signed in to send a test.'; hint.style.color = 'var(--red)'; return;
            }
            hint.textContent = '📧 Sending test email...'; hint.style.color = 'var(--muted)';
            try {
                await emailjs.send(cfg.serviceId, cfg.templateId, {
                    to_email:         currentUser.email,
                    customer_name:    'Test Customer',
                    order_id:         'TEST-' + Date.now().toString(36).toUpperCase(),
                    order_total:      '1,500',
                    order_subtotal:   '1,300',
                    order_delivery:   '200',
                    order_discount:   '0',
                    order_items:      'Test Shoe (Size EU 42) — Rs. 1,300',
                    payment_method:   'Cash on Delivery',
                    delivery_address: '123 Test Street, Karachi',
                    customer_phone:   '0300-1234567',
                    order_date:       new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }),
                    wa_number:        localStorage.getItem('sole_wa_number') || '+92 300 0000000',
                });
                hint.textContent = `✅ Test email sent to ${currentUser.email}!`;
                hint.style.color = 'var(--green)';
            } catch (e) {
                hint.textContent = '❌ Failed: ' + (e.text || e.message);
                hint.style.color = 'var(--red)';
            }
            setTimeout(() => hint.textContent = '', 5000);
        }

        // Session persistence handles auth lifecycle — no auto-logout needed

        // =============================================
        // FIREBASE DATABASE LAYER
        // =============================================
        let db = null;         // Firestore instance
        let dbReady = false;   // true when connected
        let unsubProducts = null; // realtime listener
        let unsubOrders = null;

        function setDbStatus(state, text) {
            const bar = document.getElementById('db-status-bar');
            const span = document.getElementById('db-status-text');
            if (bar) { bar.className = ''; bar.classList.add(state); }
            if (span) span.textContent = text;
        }

        function loadFirebaseConfig() {
            try {
                const raw = localStorage.getItem('sole_firebase_config');
                return raw ? JSON.parse(raw) : null;
            } catch (e) { return null; }
        }

        function initFirebase(config) {
            try {
                // Clean up existing listeners
                if (unsubProducts) { unsubProducts(); unsubProducts = null; }
                if (unsubOrders) { unsubOrders(); unsubOrders = null; }

                // Delete existing app if any
                try {
                    const existing = firebase.app();
                    if (existing) existing.delete();
                } catch (e) { }

                firebase.initializeApp(config);
                db = firebase.firestore();
                
                // Enable Offline Persistence to eliminate 5-7 sec load delay
                db.enablePersistence().catch(err => {
                    console.warn("Firebase persistence error:", err.code);
                });
                
                initAuth(); // Start Firebase Authentication listener
                
                // Start listeners immediately — no need for a blocking get() check
                dbReady = true;
                setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
                startRealtimeListeners();
                setTimeout(trackPageView, 2000);
                if (typeof loadCouponsFromCollection === 'function') {
                    loadCouponsFromCollection();
                }
            } catch (e) {
                dbReady = false;
                setDbStatus('disconnected', '⚠ Firebase init failed: ' + e.message);
            }
        }

        function startRealtimeListeners() {
            if (!db) return;

            // Products listener
            if (unsubProducts) unsubProducts();
            unsubProducts = db.collection('products').onSnapshot(snap => {
                const incoming = snap.docs.map(d => ({ _fbId: d.id, ...d.data() }));

                if (incoming.length > 0) {
                    // Firebase has products — use them
                    products = incoming.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                    localStorage.setItem('sole_products', JSON.stringify(products));
                    if (typeof handleSearch === 'function') handleSearch(); else if (typeof renderStore === 'function') renderStore();
                    animateProductCards();
                    preloadVisibleReviews();
                    if (typeof renderAdminProducts === "function") renderAdminProducts();
                } else if (!snap.metadata.fromCache) {
                    // Firebase is genuinely empty — migrate local products up if we have any
                    const localProducts = products.filter(p => !p._fbId);
                    if (localProducts.length > 0) {
                        console.log('Migrating', localProducts.length, 'local products to Firebase...');
                        migrateLocalProductsToFirebase(localProducts);
                        // Don't clear products — keep showing them while migration runs
                    } else {
                        // Truly no products anywhere
                        products = [];
                        localStorage.setItem('sole_products', JSON.stringify(products));
                        if (typeof handleSearch === 'function') handleSearch(); else if (typeof renderStore === 'function') renderStore();
                        if (typeof renderAdminProducts === "function") renderAdminProducts();
                    }
                }
            }, err => {
                console.warn('Products listener error:', err.message);
                setDbStatus('disconnected', '⚠ Lost connection — ' + err.message);
            });

            // Orders listener
            if (unsubOrders) unsubOrders();
            unsubOrders = db.collection('orders').onSnapshot(snap => {
                orders = snap.docs.map(d => ({ _fbId: d.id, ...d.data() }))
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                localStorage.setItem('sole_orders', JSON.stringify(orders));
                renderOrders && renderOrders();
                renderOrderStats && renderOrderStats();
                updateOrderBadge();
            }, err => {
                console.warn('Orders listener error:', err.message);
            });

            // Settings listener
            db.collection('settings').doc('store').onSnapshot(snap => {
                if (snap.exists) applyStoreSettings(snap.data());
            });
        }

        // ---- MIGRATE local products → Firebase (runs once when Firebase is empty) ----
        async function migrateLocalProductsToFirebase(localProducts) {
            if (!db || !dbReady) return;
            setDbStatus('saving', '📦 Migrating products to Firebase...');
            try {
                const batch = db.batch();
                localProducts.forEach(p => {
                    const clean = { ...p };
                    delete clean._fbId; // remove any stale _fbId
                    const ref = db.collection('products').doc();
                    batch.set(ref, { ...clean, createdAt: Date.now() });
                });
                await batch.commit();
                setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
                console.log('✅ Migration complete');
            } catch (e) {
                console.error('Migration failed:', e.message);
                setDbStatus('disconnected', '⚠ Migration failed: ' + e.message);
            }
        }

        // ---- SAVE / DELETE via Firestore (with localStorage fallback) ----

        async function saveProducts() {
            localStorage.setItem('sole_products', JSON.stringify(products));
            if (!dbReady || !db) return;
            // Handled per-document (addProduct / deleteProduct / saveSizeStock)
        }

        async function saveOrders() {
            localStorage.setItem('sole_orders', JSON.stringify(orders));
            if (!dbReady || !db) return;
            // Handled per-document in placeOrder / updateStatus / clearAllOrders
        }

        async function dbAddProduct(productData) {
            if (!dbReady || !db) {
                // Fallback: push to local array
                products.push(productData);
                localStorage.setItem('sole_products', JSON.stringify(products));
                if (typeof handleSearch === 'function') handleSearch(); else if (typeof renderStore === 'function') renderStore();
                renderAdminProducts();
                return;
            }
            setDbStatus('saving', '💾 Saving product...');
            try {
                await db.collection('products').add({ ...productData, createdAt: Date.now() });
                setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
            } catch (e) {
                alert('Failed to save product to database: ' + e.message);
                setDbStatus('disconnected', '⚠ Save failed: ' + e.message);
            }
        }

        async function dbDeleteProduct(prodIdx) {
            const p = products[prodIdx];
            if (!dbReady || !db || !p._fbId) {
                products.splice(prodIdx, 1);
                localStorage.setItem('sole_products', JSON.stringify(products));
                if (typeof handleSearch === 'function') handleSearch(); else if (typeof renderStore === 'function') renderStore();
                renderAdminProducts();
                return;
            }
            setDbStatus('saving', '🗑 Deleting product...');
            try {
                await db.collection('products').doc(p._fbId).delete();
                setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
            } catch (e) {
                alert('Failed to delete from database: ' + e.message);
            }
        }

        async function dbSaveOrder(order) {
            localStorage.setItem('sole_orders', JSON.stringify(orders));
            if (!dbReady || !db) return;
            setDbStatus('saving', '💾 Saving order...');
            try {
                await db.collection('orders').doc(order.id).set(order);
                setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
            } catch (e) {
                console.error('Order save failed:', e.message);
                setDbStatus('disconnected', '⚠ Order save failed: ' + e.message);
            }
        }

        async function dbUpdateOrderStatus(orderId, newStatus) {
            // Always update local array
            const o = orders.find(x => x.id === orderId);
            if (o) o.status = newStatus;
            localStorage.setItem('sole_orders', JSON.stringify(orders));
            if (!dbReady || !db) return;
            try {
                await db.collection('orders').doc(orderId).update({ status: newStatus });
            } catch (e) {
                console.error('Status update failed:', e.message);
            }
        }

        async function dbDeleteAllOrders() {
            orders = [];
            localStorage.setItem('sole_orders', JSON.stringify(orders));
            if (!dbReady || !db) return;
            setDbStatus('saving', '🗑 Clearing orders...');
            try {
                const snap = await db.collection('orders').get();
                const batch = db.batch();
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
            } catch (e) {
                console.error('Clear orders failed:', e.message);
            }
        }

        async function dbUpdateSizeStock(prodIdx) {
            const p = products[prodIdx];
            localStorage.setItem('sole_products', JSON.stringify(products));
            if (!dbReady || !db || !p._fbId) return;
            setDbStatus('saving', '💾 Updating stock...');
            try {
                await db.collection('products').doc(p._fbId).update({
                    sizeStock: p.sizeStock,
                    stock: p.stock
                });
                setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
            } catch (e) {
                console.error('Stock update failed:', e.message);
                setDbStatus('disconnected', '⚠ Stock sync failed: ' + e.message);
            }
        }

        async function dbSaveDeliveryCharge(val) {
            localStorage.setItem('sole_delivery_charge', val);
            if (!dbReady || !db) return;
            try {
                await db.collection('settings').doc('store').set({ deliveryCharge: val }, { merge: true });
            } catch (e) { console.error('Delivery charge save failed:', e.message); }
        }

        function saveFirebaseConfig() {
            const config = {
                apiKey: document.getElementById('fb-apiKey').value.trim(),
                authDomain: document.getElementById('fb-authDomain').value.trim(),
                projectId: document.getElementById('fb-projectId').value.trim(),
                storageBucket: document.getElementById('fb-storageBucket').value.trim(),
                messagingSenderId: document.getElementById('fb-messagingSenderId').value.trim(),
                appId: document.getElementById('fb-appId').value.trim(),
            };
            if (!config.apiKey || !config.projectId) {
                const hint = document.getElementById('fb-hint');
                hint.textContent = '⚠ API Key and Project ID are required.';
                hint.style.color = 'var(--red)';
                return;
            }
            localStorage.setItem('sole_firebase_config', JSON.stringify(config));
            const hint = document.getElementById('fb-hint');
            hint.textContent = 'Connecting to Firebase...';
            hint.style.color = 'var(--muted)';
            initFirebase(config);
        }

        function disconnectFirebase() {
            if (unsubProducts) { unsubProducts(); unsubProducts = null; }
            if (unsubOrders) { unsubOrders(); unsubOrders = null; }
            try { firebase.app().delete(); } catch (e) { }
            db = null; dbReady = false;
            localStorage.removeItem('sole_firebase_config');
            setDbStatus('unconfigured', 'Database disconnected — data saved locally only');
            const chip = document.getElementById('fb-status-chip');
            if (chip) { chip.className = 'firebase-status-chip idle'; chip.textContent = '⬤ Not connected'; }
            const hint = document.getElementById('fb-hint');
            if (hint) { hint.textContent = '✓ Disconnected. Config cleared.'; hint.style.color = 'var(--muted)'; }
        }

        // ---- Fallback local data load (used when Firebase not configured) ----
        function loadData() {
            // Load from localStorage cache first (fast initial render)
            // Firebase listeners will override this with live data
            try {
                const cached = localStorage.getItem('sole_products');
                // Only use DEFAULT_PRODUCTS if no cache AND no Firebase config
                const hasFbConfig = !!localStorage.getItem('sole_firebase_config');
                products = cached ? JSON.parse(cached) : (hasFbConfig ? [] : [...DEFAULT_PRODUCTS]);
            } catch (e) { products = []; }
            try { orders = JSON.parse(localStorage.getItem('sole_orders')) || []; } catch (e) { orders = []; }
            try { deliveryCharge = parseInt(localStorage.getItem('sole_delivery_charge')) || 0; } catch (e) { deliveryCharge = 0; }
            loadStorePaymentCache();
            try { waNumber = localStorage.getItem('sole_wa_number') || ''; } catch (e) { waNumber = ''; }
        }

        function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
        // Sanitise user input before saving to Firestore — strips HTML tags and control characters
        function sanitiseInput(s) {
            return String(s || '')
                .replace(/<[^>]*>/g, '')           // strip HTML tags
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
                .replace(/javascript:/gi, '')      // strip JS protocol
                .replace(/on\w+\s*=/gi, '')        // strip event handlers
                .trim()
                .substring(0, 500);               // hard max length per field
        }
        function sanitisePhone(s) {
            return String(s || '').replace(/[^0-9+\-\s()]/g, '').trim().substring(0, 20);
        }
        function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, '-'); }
        function genId() { return 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase(); }

        // =============================================


// --- SHARED UI LOGIC MIGRATED FROM PAGES ---
        function checkRateLimit() {
            const last = parseInt(localStorage.getItem('sole_last_order_ts') || '0');
            const now = Date.now();
            const elapsed = now - last;
            if (elapsed < ORDER_COOLDOWN_MS) {
                const remaining = Math.ceil((ORDER_COOLDOWN_MS - elapsed) / 1000);
                alert(`Please wait ${remaining} seconds before placing another order.`);
                return false;
            }
            return true;
        }

        function renderTrackResult(orderList) {
            const STATUS_COLORS = { pending: 'var(--orange)', confirmed: 'var(--green)', shipped: 'var(--blue)', cancelled: 'var(--red)' };
            const STATUS_ICONS = { pending: '⏳', confirmed: '✅', shipped: '🚚', cancelled: '✕' };
            let html = '';
            orderList.slice(0, 5).forEach(o => {
                const col = STATUS_COLORS[o.status] || 'var(--muted)';
                const dateStr = new Date(o.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
                const itemsHtml = (o.items || []).map(it => {
                    const prod = products.find(p => p.name === it.name);
                    const imgSrc = it.img || (prod && (prod.img || (prod.images && prod.images[0]))) || '';
                    const emoji = ['👟', '🥿', '👞', '🥾', '👠', '🩴', '👡', '👢'][Math.abs((it.name || '').length % 8)];
                    const thumb = imgSrc
                        ? '<img class="track-item-thumb" src="' + escHtml(imgSrc) + '" alt="' + escHtml(it.name) + '" onerror="this.style.display=\'none\'">'
                        : '<div class="track-item-emoji">' + emoji + '</div>';
                    return '<div class="track-item">' + thumb + '<div style="flex:1"><div style="font-size:.88rem">' + escHtml(it.name) + '</div><div style="color:var(--muted);font-size:.78rem">EU ' + it.size + '</div></div><div style="font-size:.88rem">Rs. ' + it.price.toLocaleString() + '</div></div>';
                }).join('');
                const waMsg = waNumber ? '?text=' + encodeURIComponent('Hi! I need help with my order ' + o.id + '. Status shows: ' + o.status + '. Please assist.') : '';
                const canCancel = o.status === 'pending' || o.status === 'confirmed';
                const trackingHtml = o.trackingNumber ? '<div class="track-info-row"><div class="track-info-label">Tracking</div><div style="font-family:monospace;color:var(--accent)">' + escHtml(o.trackingNumber) + '</div></div>' : '';
                const cancelHtml = canCancel
                    ? `<button class="cancel-order-btn" onclick="requestCancelOrder('${o.id}','${escHtml((o.customer.email || '').replace(/'/g, ''))}')">✕ Request Cancellation</button>`
                    : (o.status === 'cancelled' ? '<div style="margin-top:.6rem;font-size:.8rem;color:var(--red)">This order has been cancelled.</div>' : '');
                const waBtnHtml = waNumber ? '<a class="track-wa-btn" href="https://wa.me/' + waNumber.replace(/[^0-9]/g, '') + waMsg + '" target="_blank">💬 Chat on WhatsApp about this order</a>' : '';
                html += '<div class="track-result-card" style="margin-bottom:1rem">'
                    + '<div class="track-order-id">' + escHtml(o.id) + '</div>'
                    + '<div class="track-status-badge" style="color:' + col + ';border-color:' + col + ';background:' + col.replace(')', ', .08)').replace('var(', 'rgba(') + '">' + STATUS_ICONS[o.status] + ' ' + ((o.status || '').toUpperCase()) + '</div>'
                    + '<div class="track-info-row"><div class="track-info-label">Date</div><div>' + dateStr + '</div></div>'
                    + '<div class="track-info-row"><div class="track-info-label">Total</div><div>Rs. ' + o.total.toLocaleString() + '</div></div>'
                    + '<div class="track-info-row"><div class="track-info-label">Payment</div><div>' + (PAY_LABELS[o.payment] || o.payment) + '</div></div>'
                    + '<div class="track-info-row"><div class="track-info-label">Address</div><div style="font-size:.82rem">' + escHtml(o.customer.address || '—') + '</div></div>'
                    + trackingHtml
                    + (itemsHtml ? '<div class="track-info-label" style="margin-top:1rem;display:block">Items</div><div class="track-items-list">' + itemsHtml + '</div>' : '')
                    + waBtnHtml
                    + cancelHtml
                    + '</div>';
            });
            document.getElementById('track-result').innerHTML = html;
        }

        function applyCoupon() {
            const code = (document.getElementById('coupon-input').value || '').trim().toUpperCase();
            const hint = document.getElementById('coupon-hint');
            if (!code) { hint.textContent = 'Enter a coupon code.'; hint.className = 'coupon-hint err'; return; }
            const coupon = availableCoupons[code];
            if (!coupon || !coupon.active) {
                hint.textContent = '❌ Invalid or expired coupon code.';
                hint.className = 'coupon-hint err';
                appliedCoupon = null;
                renderCart();
                return;
            }
            appliedCoupon = { code, ...coupon };
            hint.textContent = `✓ Coupon applied: ${coupon.label || code}`;
            hint.className = 'coupon-hint ok';
            document.getElementById('coupon-input').disabled = true;
            document.getElementById('coupon-apply-btn').style.display = 'none';
            document.getElementById('coupon-remove-btn').style.display = 'inline-block';
            renderCart();
        }

        function switchTab() { /* admin-only */ }

        function starHtml(rating, interactive = false, productName = '') {
            return [1, 2, 3, 4, 5].map(i =>
                `<span class="star${i <= rating ? ' active' : ''}" ${interactive ? `onclick="setReviewRating(${i},'${productName.replace(/'/g, '\\\'')}')" onmouseover="hoverReviewStars(${i})" onmouseout="unhoverReviewStars(${pendingReviewRating})"` : ''}>★</span>`
            ).join('');
        }

        function clearAllOrders() { /* admin-only */ }

        function goBackToDelivery() {
            document.getElementById('checkout-page-2').style.display = 'none';
            document.getElementById('checkout-page-1').style.display = 'block';
            document.getElementById('step-ind-2').classList.remove('active');
            document.getElementById('step-ind-1').classList.remove('done');
            document.getElementById('step-ind-1').classList.add('active');
            document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function pdmClickOutside(e) {
            if (e.target === document.getElementById('pdm-overlay')) closePdm();
        }

        function ssLoadFile(file, method) {
            if (file.size > 10 * 1024 * 1024) { alert('Screenshot too large. Max 10 MB.'); return; }
            if (!file.type.startsWith('image/')) { alert('Please upload an image file.'); return; }
            const reader = new FileReader();
            reader.onload = e => {
                // Compress using Canvas before storing — keeps Firestore docs well under 1MB
                const img = new Image();
                img.onload = () => {
                    const MAX_W = 1200, MAX_H = 1200;
                    let w = img.width, h = img.height;
                    if (w > MAX_W || h > MAX_H) {
                        const ratio = Math.min(MAX_W / w, MAX_H / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const compressed = canvas.toDataURL('image/jpeg', 0.72);
                    // Safety check — if still too large, compress harder
                    const finalData = compressed.length > 700000
                        ? canvas.toDataURL('image/jpeg', 0.45) : compressed;
                    ssData[method] = finalData;
                    const approxKb = Math.round(finalData.length * 0.75 / 1024);
                    showSsPreview(method, finalData, file.name, approxKb + ' KB (compressed)');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function renderCategoryBar() {
            const bar = document.getElementById('category-bar');
            if (!bar) return;
            // Gather unique categories from products (use category field, fallback to tag)
            const cats = [...new Set(products.map(p => p.category || p.tag || '').filter(Boolean))];
            if (!cats.length) { bar.style.display = 'none'; return; }
            bar.style.display = 'flex';
            let html = `<button class="cat-pill${window.activeCat === '' ? ' active' : ''}" onclick="filterCategory('')">All</button>`;
            cats.forEach(c => {
                html += `<button class="cat-pill${window.activeCat === c ? ' active' : ''}" onclick="filterCategory('${escHtml(c)}')">${escHtml(c)}</button>`;
            });
            bar.innerHTML = html;
        }

        async function trackByEmail() {
            const input = document.getElementById('track-email').value.trim().toLowerCase();
            if (!input) return;
            const res = document.getElementById('track-result');
            res.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem">🔍 Searching your orders...</div>';
            try {
                let found = [];
                if (db && dbReady) {
                    const snap = await db.collection('orders').where('customer.email', '==', input).orderBy('date', 'desc').get();
                    found = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                }
                if (!found.length) found = orders.filter(o => (o.customer.email || '').toLowerCase() === input);
                if (found.length) renderTrackResult(found);
                else res.innerHTML = '<div class="track-error">❌ No orders found for <strong>' + escHtml(input) + '</strong>.<br><small style="color:var(--muted)">Make sure you use the same email from checkout.</small></div>';
            } catch (e) {
                const found = orders.filter(o => (o.customer.email || '').toLowerCase() === input);
                if (found.length) renderTrackResult(found);
                else res.innerHTML = '<div class="track-error">❌ No orders found. Try tracking by Order ID instead.</div>';
            }
        }

        function renderOrders() { /* admin-only */ }

        function toggleCurrency() { /* removed — PKR only */ }

        function closePolicy() {
            document.getElementById('policy-overlay').classList.remove('open');
            document.body.style.overflow = '';
        }

        function fmtPrice(pkr) {
            return 'Rs. ' + pkr.toLocaleString();
        }

        function showDashboard() { /* admin-only */ }

        function closeSsLightbox() {
            document.getElementById('ss-lightbox').classList.remove('open');
            document.body.style.overflow = '';
        }

        function loadCouponsFromSettings(data) {
            // Legacy: also accept coupons from settings doc
            try {
                if (data && data.coupons) {
                    const parsed = typeof data.coupons === 'string' ? JSON.parse(data.coupons) : data.coupons;
                    Object.assign(availableCoupons, parsed);
                }
            } catch (e) { }
        }

        function ssFileSelect(input, method) {
            const file = input.files[0];
            if (!file) return;
            ssLoadFile(file, method);
            input.value = '';
        }

        function setRateLimitTimestamp() {
            localStorage.setItem('sole_last_order_ts', Date.now().toString());
        }

        function renderPaySummary() {
            const subtotal = cart.reduce((s, i) => s + i.price, 0);
            const total = subtotal + deliveryCharge;

            let html = '';
            cart.forEach(item => {
                const p = (item.productIdx !== undefined) ? products[item.productIdx] : null;
                const imgs = p ? (p.images && p.images.length ? p.images : (p.img ? [p.img] : [])) : [];
                const emoji = p ? EMOJIS[item.productIdx % EMOJIS.length] : '👟';
                const thumbHtml = imgs[0]
                    ? `<img class="pay-sum-thumb" src="${escHtml(imgs[0])}" alt="${escHtml(item.name)}" onerror="this.outerHTML='<div class=\\'pay-sum-thumb-emoji\\'>${emoji}</div>'">`
                    : `<div class="pay-sum-thumb-emoji">${emoji}</div>`;
                html += `<div class="pay-summary-item">
      ${thumbHtml}
      <div class="pay-sum-info">
        <div class="pay-sum-name">${escHtml(item.name)}</div>
        <div class="pay-sum-size">Size EU ${item.size}</div>
      </div>
      <div class="pay-sum-price">Rs. ${item.price.toLocaleString()}</div>
    </div>`;
            });
            document.getElementById('pay-summary-items').innerHTML = html;
            const disc2 = calcDiscount(subtotal);
            document.getElementById('pay-summary-subtotal').textContent = 'Rs. ' + subtotal.toLocaleString();
            document.getElementById('pay-summary-delivery').textContent = 'Rs. ' + deliveryCharge.toLocaleString();
            document.getElementById('pay-summary-total').textContent = 'Rs. ' + (subtotal + deliveryCharge - disc2).toLocaleString();

            // Update payoneer amount display
            const pav = document.getElementById('payoneer-amount-val');
            if (pav) pav.textContent = 'Rs. ' + total.toLocaleString();
        }

        function loadPayoneerId() { /* admin-only */ }

        function pdmNav(dir) {
            const p = products[pdmProductIdx];
            const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
            if (!imgs.length) return;
            pdmImgIdx = (pdmImgIdx + dir + imgs.length) % imgs.length;
            pdmGoTo(pdmImgIdx);
        }

        function enhanceAddToCartAnimation(btn) {
            if (btn && !btn.classList.contains('pulsed')) {
                btn.classList.add('pulsed');
                setTimeout(() => btn.classList.remove('pulsed'), 500);
            }
        }

        function closeAdmin() { /* admin-only */ }

        async function preloadVisibleReviews() {
            if (!db || !dbReady) return;
            for (const p of products.slice(0, 6)) {
                await loadReviewsForProduct(p.name);
            }
            if (typeof handleSearch === 'function') handleSearch(); else if (typeof renderStore === 'function') renderStore();
        }

        function ssDrop(e, method) {
            e.preventDefault();
            document.getElementById('ss-zone-' + method).classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) { ssLoadFile(file, method); }
            else { alert('Please drop an image file.'); }
        }

        function pdmGoTo(idx) {
            const p = products[pdmProductIdx];
            const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
            pdmImgIdx = idx;
            const mainImg = document.getElementById('pdm-main-img');
            if (mainImg) mainImg.src = imgs[idx];
            const badge = document.querySelector('#pdm-main-wrap .pdm-img-badge');
            if (badge) badge.textContent = `${idx + 1} / ${imgs.length}`;
            document.querySelectorAll('.pdm-thumb').forEach((t, i) => t.classList.toggle('act', i === idx));
        }

        function openSsLightboxFromSrc(src) {
            document.getElementById('ss-lightbox-img').src = src;
            document.getElementById('ss-lightbox').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function showOrderConfirmation(order) {
            // Sub message
            const fname = order.customer.fname;
            document.getElementById('conf-sub-msg').textContent =
                `Thank you, ${fname}! Your order has been received and will be processed shortly.`;
            document.getElementById('conf-order-id').textContent = order.id;

            // COD note
            const codNote = document.getElementById('conf-cod-note');
            if (codNote) codNote.style.display = order.payment === 'cod' ? 'block' : 'none';

            // Items & Totals removed for a simpler mobile popup

            // Info grid
            const confInfoGrid = document.getElementById('conf-info-grid');
            if (confInfoGrid) {
                const dateStr = new Date(order.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                confInfoGrid.innerHTML = [
                    { label: 'Order ID', val: order.id },
                    { label: 'Date', val: dateStr },
                    { label: 'Payment', val: PAY_ICONS[order.payment] + ' ' + PAY_LABELS[order.payment] },
                    { label: 'Status', val: '⏳ Pending confirmation' },
                    { label: 'Name', val: escHtml(order.customer.fname + ' ' + order.customer.lname) },
                    { label: 'Phone', val: escHtml(order.customer.phone || '—') },
                    { label: 'Email', val: escHtml(order.customer.email) },
                    { label: 'Address', val: escHtml(order.customer.address) },
                ].map(r => `<div class="order-conf-info-cell"><div class="order-conf-info-label">${r.label}</div><div class="order-conf-info-val">${r.val}</div></div>`).join('');
            }

            // What happens next — steps vary by payment method
            const confSteps = document.getElementById('conf-steps');
            const isCod = order.payment === 'cod';
            if (confSteps) {
                const steps = isCod ? [
                    { icon: '📞', title: 'We\'ll call to confirm', desc: 'Our team will contact you within 24 hours to verify your COD order before dispatch.' },
                    { icon: '📦', title: 'Order packed & dispatched', desc: 'After confirmation, your order is packed and handed to our delivery partner.' },
                    { icon: '🚚', title: 'Delivery in 3\u20135 days', desc: 'You\'ll receive your order at the address provided. Pay the full amount to the courier.' },
                ] : [
                    { icon: '✅', title: 'Payment verified', desc: 'We\'ll verify your payment within a few hours. You\'ll get a confirmation message.' },
                    { icon: '📦', title: 'Order packed', desc: 'Once payment is verified, your order is carefully packed and dispatched.' },
                    { icon: '🚚', title: 'Delivery in 3\u20135 days', desc: 'Track your order using your Order ID anytime via the Track Order link.' },
                ];
                confSteps.innerHTML = steps.map(s =>
                    `<div class="order-conf-step"><div class="order-conf-step-icon">${s.icon}</div><div class="order-conf-step-text"><strong>${s.title}</strong>${s.desc}</div></div>`
                ).join('');
            }

            // WhatsApp button
            const waWrap = document.getElementById('conf-wa-wrap');
            if (waWrap && waNumber) {
                const num = waNumber.replace(/[^0-9]/g, '');
                const msg = isCod
                    ? `Hi! I placed a COD order ${order.id} for Rs. ${order.total.toLocaleString()}. Please confirm.`
                    : `Hi! I placed order ${order.id} for Rs. ${order.total.toLocaleString()} via ${PAY_LABELS[order.payment]}. Please confirm receipt.`;
                waWrap.innerHTML = `<a href="https://wa.me/${num}?text=${encodeURIComponent(msg)}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:.6rem;background:#25D366;color:#fff;text-decoration:none;padding:1rem;font-family:'DM Sans',sans-serif;font-size:.9rem;width:100%;letter-spacing:.04em">💬 Chat on WhatsApp about your order</a>`;
                waWrap.style.display = 'block';
            }

            document.getElementById('order-conf').classList.add('show');
            document.body.style.overflow = 'hidden';
            window.scrollTo(0, 0);
        }

        function loadWishlist() {
            try { wishlist = JSON.parse(localStorage.getItem('sole_wishlist') || '[]'); } catch (e) { wishlist = []; }
        }

        function renderReviewsSection(productName, reviews) {
            const avgRating = reviews.length
                ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;
            const starsFilled = Math.round(avgRating);
            const starsDisplay = [1, 2, 3, 4, 5].map(i =>
                `<span class="${i <= starsFilled ? 'review-star-filled' : 'review-star-empty'}">★</span>`).join('');

            const reviewsHtml = reviews.length ? reviews.map(r => {
                const d = new Date(r.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
                const stars = [1, 2, 3, 4, 5].map(i => `<span class="${i <= r.rating ? 'review-star-filled' : 'review-star-empty'}">★</span>`).join('');
                return `<div class="review-card"><div class="review-card-header"><span class="review-author">${escHtml(r.author)}</span><span class="review-date">${d}</span></div><div class="review-stars-display">${stars}</div><div class="review-text">${escHtml(r.text)}</div></div>`;
            }).join('') : '<div class="reviews-empty">No reviews yet. Be the first to review this product!</div>';

            const escapedName = productName.replace(/'/g, "\'");
            return `
    <div class="pdm-reviews-section" id="pdm-reviews">
      <div class="pdm-specs-title">Customer Reviews ${reviews.length ? `(${reviews.length})` : ''}</div>
      ${reviews.length ? `<div class="review-avg"><div class="review-avg-score">${avgRating}</div><div><div class="review-avg-stars">${starsDisplay}</div><div class="review-avg-count">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div></div></div>` : ''}
      ${reviewsHtml}
      <div class="write-review-form">
        <h5>Write a Review</h5>
        <div class="star-rating" id="review-stars-row">
          ${[1, 2, 3, 4, 5].map(i => `<span class="star review-write-star" onclick="setReviewRating(${i},'${escapedName}')" onmouseover="hoverReviewStars(${i})" onmouseout="unhoverReviewStars(pendingReviewRating)">★</span>`).join('')}
          <span style="font-size:.75rem;color:var(--muted);margin-left:.4rem;align-self:center">Click to rate</span>
        </div>
        <input class="review-name-input" id="review-author-input" type="text" placeholder="Your name">
        <textarea class="review-textarea" id="review-text-input" placeholder="Share your experience with this product..."></textarea>
        <button class="submit-review-btn" onclick="submitReview('${escapedName}')">Submit Review</button>
        <div style="font-size:.78rem;color:var(--muted);margin-top:.5rem">Reviews are shown after admin approval.</div>
        <div id="review-submit-hint" style="font-size:.8rem;margin-top:.3rem"></div>
      </div>
    </div>`;
        }

        function validateField(input, type) {
            const val = input.value.trim();
            const errId = 'err-' + input.id;
            const errEl = document.getElementById(errId);
            let msg = '';
            if (type === 'phone') {
                const digits = val.replace(/[^0-9]/g, '');
                if (val && (digits.length < 10 || digits.length > 13)) msg = 'Enter a valid phone number (10–13 digits)';
            } else if (type === 'email') {
                if (val && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) msg = 'Enter a valid email address';
            } else if (type === 'name') {
                if (val && val.length < 2) msg = 'Must be at least 2 characters';
                if (val && /[<>{}]/.test(val)) msg = 'Invalid characters';
            }
            if (errEl) errEl.textContent = msg;
            input.classList.toggle('invalid', !!msg && !!val);
            input.classList.toggle('valid', !msg && val.length > 0);
        }

        function toggleWishlist(productName, btn) {
            const idx = wishlist.findIndex(w => w.name === productName);
            if (idx >= 0) {
                wishlist.splice(idx, 1);
                if (btn) { btn.classList.remove('active'); btn.title = 'Add to Wishlist'; }
            } else {
                const p = products.find(pr => pr.name === productName);
                if (!p) return;
                const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
                wishlist.push({ name: p.name, price: p.price, img: imgs[0] || '', tag: p.tag || '' });
                if (btn) { btn.classList.add('active'); btn.title = 'Remove from Wishlist'; }
            }
            saveWishlist();
            renderWishlist();
        }

        function saveWishlist() {
            try { localStorage.setItem('sole_wishlist', JSON.stringify(wishlist)); } catch (e) { }
            updateWishlistBadge();
            updateTabBarBadges();
        }

        function switchTrackTab(tab, btn) {
            trackTab = tab;
            document.querySelectorAll('.track-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('track-tab-id').style.display = tab === 'id' ? 'block' : 'none';
            document.getElementById('track-tab-email').style.display = tab === 'email' ? 'block' : 'none';
            document.getElementById('track-result').innerHTML = '';
            setTimeout(() => {
                const el = document.getElementById(tab === 'id' ? 'track-order-id' : 'track-email');
                if (el) el.focus();
            }, 50);
        }

        function openSizeGuide() {
            document.getElementById('sizeguide-overlay').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function openWishlist() {
            renderWishlist();
            document.getElementById('wishlist-overlay').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closePdm() {
            document.getElementById('pdm-overlay').classList.remove('open');
            document.body.style.overflow = '';
        }

        function openSsLightbox(e, method) {
            e.stopPropagation();
            const src = ssData[method] || document.getElementById('ss-img-' + method).src;
            if (!src) return;
            document.getElementById('ss-lightbox-img').src = src;
            document.getElementById('ss-lightbox').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function removeWishlistItem(i) {
            wishlist.splice(i, 1);
            saveWishlist();
            renderWishlist();
            // update heart buttons on grid
            document.querySelectorAll('.wishlist-btn').forEach(btn => {
                const name = btn.dataset.name;
                btn.classList.toggle('active', wishlist.some(w => w.name === name));
            });
        }

        function renderWishlist() {
            const el = document.getElementById('wishlist-items');
            if (!el) return;
            if (!wishlist.length) { el.innerHTML = '<div class="wishlist-empty">♡<br>Your wishlist is empty.<br><small>Click the ♡ on any product to save it.</small></div>'; return; }
            el.innerHTML = wishlist.map((w, i) => {
                const prod = products.find(p => p.name === w.name);
                const prodIdx = prod ? products.indexOf(prod) : -1;
                const thumb = w.img
                    ? `<img class="wishlist-thumb" src="${escHtml(w.img)}" alt="${escHtml(w.name)}" onerror="this.outerHTML='<div class=\'wishlist-thumb-emoji\'>👟</div>'">`
                    : `<div class="wishlist-thumb-emoji">👟</div>`;
                return `<div class="wishlist-item">
      ${thumb}
      <div class="wishlist-info">
        <div class="wishlist-name">${escHtml(w.name)}</div>
        <div class="wishlist-price">Rs. ${w.price.toLocaleString()}</div>
      </div>
      <div class="wishlist-actions">
        ${prodIdx >= 0 ? `<button class="wishlist-shop-btn" onclick="closeWishlist();setTimeout(()=>openPdm(${prodIdx}),200)">Shop</button>` : ''}
        <button class="wishlist-remove-btn" onclick="removeWishlistItem(${i})">✕</button>
      </div>
    </div>`;
            }).join('');
        }

        async function trackById() {
            const input = document.getElementById('track-order-id').value.trim().toUpperCase();
            if (!input) return;
            const res = document.getElementById('track-result');
            res.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem">🔍 Looking up your order...</div>';
            try {
                let order = null;
                if (db && dbReady) {
                    const snap = await db.collection('orders').doc(input).get();
                    if (snap.exists) order = { id: snap.id, ...snap.data() };
                }
                // Also check local cache
                if (!order) order = orders.find(o => o.id === input);
                if (order) renderTrackResult([order]);
                else res.innerHTML = '<div class="track-error">❌ No order found with ID <strong>' + escHtml(input) + '</strong>.<br><small style="color:var(--muted)">Check your confirmation email for your Order ID.</small></div>';
            } catch (e) {
                // Firestore may reject unauthenticated read — fallback to local
                const order = orders.find(o => o.id === input);
                if (order) renderTrackResult([order]);
                else res.innerHTML = '<div class="track-error">❌ Order not found. Check your confirmation email.</div>';
            }
        }

        function saveDeliveryCharge() { /* admin-only */ }

        function updateOrderBadge() {
            const el = document.getElementById('tab-orders-badge');
            if (el) el.textContent = orders.length;
        }

        function addProduct() { /* admin-only */ }

        function enhanceWishlistAnimation(btnEl) {
            if (btnEl && !btnEl.classList.contains('popping')) {
                btnEl.classList.add('popping');
                setTimeout(() => btnEl.classList.remove('popping'), 450);
            }
        }

        function copyText(text, btn) {
            navigator.clipboard.writeText(text).then(() => { const orig = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = orig, 1500); });
        }

        function saveCartToStorage() {
            try { localStorage.setItem('sole_cart', JSON.stringify(cart)); } catch (e) { }
        }

        async function loadReviewsForProduct(productName) {
            if (productReviews[productName] !== undefined) return productReviews[productName];
            if (!db || !dbReady) { productReviews[productName] = []; return []; }
            try {
                const snap = await db.collection('reviews')
                    .where('productName', '==', productName)
                    .where('approved', '==', true)
                    .orderBy('date', 'desc').limit(20).get();
                productReviews[productName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                productReviews[productName] = [];
            }
            return productReviews[productName];
        }

        function closeSizeGuide() {
            document.getElementById('sizeguide-overlay').classList.remove('open');
            document.body.style.overflow = '';
        }

        function pdmSelectSize(btn) {
            document.querySelectorAll('.pdm-sz').forEach(b => b.classList.remove('sel'));
            btn.classList.add('sel');
        }

        function openPayoneerCheckout() {
            const programId = localStorage.getItem('sole_payoneer_program_id') || '';
            const subtotal = cart.reduce((s, i) => s + i.price, 0);
            const total = subtotal + deliveryCharge;
            const fname = document.getElementById('fname').value.trim();
            const lname = document.getElementById('lname').value.trim();
            const email = document.getElementById('email').value.trim();

            if (!programId) {
                alert('Payoneer is not configured yet. Please ask the admin to add the Program ID in Settings.');
                return;
            }
            // Build Payoneer checkout URL using their Pay Checkout link format
            const params = new URLSearchParams({
                program_id: programId,
                currency: 'USD',             // Payoneer uses USD; amount shown as reference
                amount: (total / 280).toFixed(2), // rough PKR→USD conversion for reference
                description: 'SOLE Store Order',
                client_reference_id: 'SOLE-' + Date.now(),
                email: email,
                first_name: fname,
                last_name: lname
            });
            const url = `https://payouts.payoneer.com/partners/lp.aspx?${params.toString()}`;
            window.open(url, '_blank', 'noopener');
        }

        function initScrollReveal() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
                    el.classList.add('revealed');
                });
                return;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target); // only animate once
                    }
                });
            }, {
                threshold: 0.12,
                rootMargin: '0px 0px -40px 0px'
            });

            document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
                observer.observe(el);
            });
        }

        function shareProduct(productName) {
            const p = products.find(pr => pr.name === productName);
            if (!p) return;
            const text = `Check out ${p.name} — Rs. ${p.price.toLocaleString()} at SOLE Store!`;
            if (navigator.share) {
                navigator.share({ title: p.name, text, url: window.location.href })
                    .catch(() => { });
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(text + ' ' + window.location.href)
                    .then(() => alert('Product link copied to clipboard!'))
                    .catch(() => alert('Share: ' + text));
            }
        }

        function renderAdminProducts() { /* admin-only */ }

        function renderOrderStats() { /* admin-only */ }

        function showSsPreview(method, src, name, size) {
            document.getElementById('ss-idle-' + method).style.display = 'none';
            document.getElementById('ss-img-' + method).src = src;
            document.getElementById('ss-name-' + method).textContent = name;
            document.getElementById('ss-size-' + method).textContent = size;
            document.getElementById('ss-preview-' + method).classList.add('show');
        }

        function unhoverReviewStars(current) {
            document.querySelectorAll('.review-write-star').forEach((s, i) => {
                s.classList.toggle('active', i < current);
            });
        }

        async function requestCancelOrder(orderId, customerEmail) {
            if (!confirm('Are you sure you want to request cancellation of order ' + orderId + '?\n\nThis will notify the admin. Cancellation is subject to approval.')) return;
            try {
                if (db && dbReady) {
                    await db.collection('orders').doc(orderId).update({
                        cancelRequested: true,
                        cancelRequestDate: new Date().toISOString(),
                        status: 'cancellation_requested'
                    });
                }
                // Re-render the result to reflect new status
                document.getElementById('track-result').innerHTML =
                    '<div style="background:rgba(255,68,68,.06);border:1px solid rgba(255,68,68,.2);padding:1.2rem;font-size:.88rem;line-height:1.7">' +
                    '<strong style="color:var(--red)">✕ Cancellation Requested</strong><br>' +
                    '<span style="color:var(--muted)">Your cancellation request for order <strong style="color:var(--text)">' + orderId + '</strong> has been submitted. ' +
                    'The admin will review and confirm within 24 hours. You will be contacted at your registered email/phone.</span>' +
                    (waNumber ? '<br><br><a href="https://wa.me/' + waNumber.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi! I requested cancellation of order ' + orderId + '. Please confirm.') + '" target="_blank" class="track-wa-btn" style="margin-top:.8rem">💬 Follow up on WhatsApp</a>' : '') +
                    '</div>';
            } catch (e) {
                alert('Failed to submit cancellation request. Please contact us directly on WhatsApp.');
            }
        }

        function trackProductView(productName) {
            if (!db || !dbReady) return;
            try {
                const key = 'views_' + productName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
                db.collection('analytics').doc('products').set({
                    [key]: firebase.firestore.FieldValue.increment(1)
                }, { merge: true });
            } catch (e) { }
        }

        function ssDragOver(e, method) {
            e.preventDefault();
            document.getElementById('ss-zone-' + method).classList.add('drag-over');
        }

        function checkStockBeforeOrder() {
            const outOfStock = [];
            cart.forEach(item => {
                const p = products.find(pr => pr.name === item.name);
                if (!p) return;
                const ss = p.sizeStock || {};
                const hasSS = Object.keys(ss).length > 0;
                if (hasSS) {
                    const qty = ss[String(item.size)];
                    if (qty !== undefined && qty <= 0) {
                        outOfStock.push(`${item.name} (EU ${item.size})`);
                    }
                }
            });
            return outOfStock;
        }

        function deleteProduct() { /* admin-only */ }

        async function submitReview(productName) {
            const nameEl = document.getElementById('review-author-input');
            const textEl = document.getElementById('review-text-input');
            const hintEl = document.getElementById('review-submit-hint');
            const name = (nameEl?.value || '').trim();
            const text = (textEl?.value || '').trim();
            const rating = pendingReviewRating;
            if (!name) { if (hintEl) { hintEl.textContent = 'Please enter your name.'; hintEl.style.color = 'var(--red)'; } return; }
            if (!rating) { if (hintEl) { hintEl.textContent = 'Please select a star rating.'; hintEl.style.color = 'var(--red)'; } return; }
            if (!text) { if (hintEl) { hintEl.textContent = 'Please write a review.'; hintEl.style.color = 'var(--red)'; } return; }
            if (hintEl) { hintEl.textContent = 'Submitting...'; hintEl.style.color = 'var(--muted)'; }
            try {
                const review = {
                    productName,
                    author: sanitiseInput(name),
                    text: sanitiseInput(text),
                    rating,
                    date: new Date().toISOString(),
                    approved: false // Admin must approve before it shows
                };
                if (db && dbReady) {
                    await db.collection('reviews').add(review);
                } else {
                    const saved = JSON.parse(localStorage.getItem('sole_pending_reviews') || '[]');
                    saved.push(review);
                    localStorage.setItem('sole_pending_reviews', JSON.stringify(saved));
                }
                if (hintEl) { hintEl.textContent = '✓ Review submitted! It will appear after admin approval.'; hintEl.style.color = 'var(--green)'; }
                if (nameEl) nameEl.value = '';
                if (textEl) textEl.value = '';
                pendingReviewRating = 0;
                document.querySelectorAll('.review-write-star').forEach(s => s.classList.remove('active'));
                setTimeout(() => { if (hintEl) hintEl.textContent = ''; }, 4000);
            } catch (e) {
                if (hintEl) { hintEl.textContent = 'Failed to submit. Please try again.'; hintEl.style.color = 'var(--red)'; }
            }
        }

        function hoverReviewStars(n) {
            document.querySelectorAll('.review-write-star').forEach((s, i) => {
                s.classList.toggle('active', i < n);
            });
        }

        function animateProductCards() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const cards = document.querySelectorAll('.product-card');
            cards.forEach((card, i) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(32px)';
                card.style.transition = 'opacity .5s cubic-bezier(.16,1,.3,1) ' + (i * 0.07) + 's, transform .5s cubic-bezier(.16,1,.3,1) ' + (i * 0.07) + 's';
                requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = ''; });
                setTimeout(() => { card.style.transition = ''; }, 700 + i * 70);
            });
        }

        function resetSs(method) { removeSs(null, method); }

        function renderPdmGallery(p, imgs, emoji) {
            const mainWrap = document.getElementById('pdm-main-wrap');
            const thumbsEl = document.getElementById('pdm-thumbs');
            if (imgs.length) {
                mainWrap.innerHTML = `
      <img class="pdm-main-img" id="pdm-main-img" src="${escHtml(imgs[pdmImgIdx])}" alt="${escHtml(p.name)}" onerror="this.style.display='none';document.getElementById('pdm-emoji-fb').style.display='flex'">
      <div id="pdm-emoji-fb" class="pdm-main-emoji" style="display:none">${emoji}</div>
      ${imgs.length > 1 ? `<button class="pdm-nav pdm-prev" onclick="pdmNav(-1)">‹</button><button class="pdm-nav pdm-next" onclick="pdmNav(1)">›</button>` : ''}
      <div class="pdm-img-badge">${pdmImgIdx + 1} / ${imgs.length}</div>`;
                thumbsEl.innerHTML = imgs.map((src, i) => `<img class="pdm-thumb ${i === pdmImgIdx ? 'act' : ''}" src="${escHtml(src)}" onclick="pdmGoTo(${i})" title="Photo ${i + 1}" onerror="this.style.display='none'">`).join('');
            } else {
                mainWrap.innerHTML = `<div class="pdm-main-emoji">${emoji}</div>`;
                thumbsEl.innerHTML = `<div class="pdm-thumb-emoji act">${emoji}</div>`;
            }
        }

        function openAdmin() { /* admin-only */ }

        function resetOrder() {
            const confEl = document.getElementById('order-conf'); if (confEl) confEl.classList.remove('show');
            document.body.style.overflow = '';
            cart = [];
            renderCart();
            const orderEl = document.getElementById('order'); if (orderEl) orderEl.classList.remove('visible');
            const successEl = document.getElementById('success'); if (successEl) successEl.classList.remove('show');
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            Object.keys(selectedSizes).forEach(k => selectedSizes[k] = null);
            ['fname', 'lname', 'email', 'phone', 'address'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            ['easypaisa', 'sadapay', 'bank', 'payoneer'].forEach(m => { if (typeof resetSs === 'function') resetSs(m); });
            const payCards = document.querySelectorAll('.pay-card');
            if (payCards.length > 0 && typeof selectPayment === 'function') selectPayment('cod', payCards[0]);
            // Reset to page 1
            const cp1 = document.getElementById('checkout-page-1'); if (cp1) cp1.style.display = 'block';
            const cp2 = document.getElementById('checkout-page-2'); if (cp2) cp2.style.display = 'none';
            const si1 = document.getElementById('step-ind-1'); if (si1) { si1.classList.add('active'); si1.classList.remove('done'); }
            const si2 = document.getElementById('step-ind-2'); if (si2) si2.classList.remove('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function removeSs(e, method) {
            if (e) e.stopPropagation();
            delete ssData[method];
            document.getElementById('ss-idle-' + method).style.display = 'flex';
            document.getElementById('ss-preview-' + method).classList.remove('show');
            document.getElementById('ss-img-' + method).src = '';
            document.getElementById('ss-zone-' + method).classList.remove('drag-over');
        }

        function openPolicy() {
            document.getElementById('policy-overlay').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function removeFromCart(i) { cart.splice(i, 1); renderCart(); saveCartToStorage(); if (!cart.length) document.getElementById('order').classList.remove('visible'); }

        async function loadCouponsFromCollection() {
            if (!db || !dbReady) {
                try { availableCoupons = JSON.parse(localStorage.getItem('sole_coupons') || '{}'); } catch (e) { }
                return;
            }
            try {
                const snap = await db.collection('coupons').where('active', '==', true).get();
                availableCoupons = {};
                snap.docs.forEach(d => { availableCoupons[d.id] = d.data(); });
                localStorage.setItem('sole_coupons', JSON.stringify(availableCoupons));
            } catch (e) {
                // Fallback to localStorage cache
                try { availableCoupons = JSON.parse(localStorage.getItem('sole_coupons') || '{}'); } catch (e2) { }
            }
        }

        function removeCoupon() {
            appliedCoupon = null;
            document.getElementById('coupon-input').value = '';
            document.getElementById('coupon-input').disabled = false;
            document.getElementById('coupon-hint').textContent = '';
            document.getElementById('coupon-hint').className = 'coupon-hint';
            document.getElementById('coupon-apply-btn').style.display = 'inline-block';
            document.getElementById('coupon-remove-btn').style.display = 'none';
            renderCart();
        }

        function initProductCardReveal() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'none';
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.08,
                rootMargin: '0px 0px -30px 0px'
            });

            document.querySelectorAll('.product-card').forEach((card, i) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(40px)';
                card.style.transition = 'opacity .55s cubic-bezier(.16,1,.3,1) ' + (i % 3 * 0.1) + 's, transform .55s cubic-bezier(.16,1,.3,1) ' + (i % 3 * 0.1) + 's';
                observer.observe(card);
            });
        }

        function getProductRating(productName) {
            const reviews = productReviews[productName];
            if (!reviews || !reviews.length) return null;
            return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length);
        }

        function updateTabBarBadges() {
            const cartBadge = document.getElementById('mob-cart-count');
            const wishBadge = document.getElementById('mob-wish-count');
            if (cartBadge) {
                if (cart.length) { cartBadge.textContent = cart.length; cartBadge.style.display = 'inline-flex'; }
                else cartBadge.style.display = 'none';
            }
            if (wishBadge) {
                if (wishlist.length) { wishBadge.textContent = wishlist.length; wishBadge.style.display = 'inline-flex'; }
                else wishBadge.style.display = 'none';
            }
        }

        function initNavScrollEffect() {
            const nav = document.querySelector('.site-nav');
            if (!nav) return;
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        if (window.scrollY > 60) {
                            nav.classList.add('scrolled');
                        } else {
                            nav.classList.remove('scrolled');
                        }
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }

        function applyRevealClasses() {
            // Section headers
            document.querySelectorAll('.section-header').forEach(el => {
                el.classList.add('reveal');
            });
            document.querySelectorAll('.section-header h2').forEach(el => {
                el.classList.add('reveal');
            });

            // Search bar
            const searchWrap = document.querySelector('.search-bar-wrap');
            if (searchWrap) searchWrap.classList.add('reveal');

            // Category bar
            const catBar = document.getElementById('category-bar');
            if (catBar) catBar.classList.add('reveal');

            // Footer
            const footer = document.querySelector('footer');
            if (footer) footer.classList.add('reveal');
            const footerBottom = document.querySelector('.footer-bottom');
            if (footerBottom) footerBottom.classList.add('reveal');

            // Footer columns with stagger
            document.querySelectorAll('.footer-col').forEach((col, i) => {
                col.classList.add('reveal');
                col.classList.add('stagger-' + (i + 2));
            });

            // Order section
            const orderSection = document.getElementById('order');
            if (orderSection) orderSection.classList.add('reveal');
        }

        function updateWishlistBadge() {
            const badge = document.getElementById('wishlist-badge');
            if (!badge) return;
            if (wishlist.length) { badge.textContent = wishlist.length; badge.style.display = 'inline-flex'; }
            else badge.style.display = 'none';
        }

        function closeWishlist() {
            document.getElementById('wishlist-overlay').classList.remove('open');
            document.body.style.overflow = '';
        }

        function ssDragLeave(method) {
            document.getElementById('ss-zone-' + method).classList.remove('drag-over');
        }

        function closeOrderConf() {
            document.getElementById('order-conf').classList.remove('show');
            document.body.style.overflow = '';
            resetOrder();
            window.location.href = 'store.html';
        }

        function closeTrack() {
            document.getElementById('track-overlay').classList.remove('open');
            document.body.style.overflow = '';
            document.getElementById('track-result').innerHTML = '';
        }

        function initPdmZoom() {
            const wrap = document.getElementById('pdm-main-wrap');
            if (!wrap) return;
            wrap.addEventListener('mousemove', e => {
                if (!wrap.classList.contains('zoomed')) return;
                const r = wrap.getBoundingClientRect();
                const x = ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%';
                const y = ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%';
                wrap.style.setProperty('--zoom-x', x);
                wrap.style.setProperty('--zoom-y', y);
            });
            wrap.addEventListener('click', e => {
                if (e.target.classList.contains('pdm-nav') || e.target.classList.contains('pdm-close-btn')) return;
                wrap.classList.toggle('zoomed');
            });
        }

        function setWaLinks() {
            const num = waNumber.replace(/[^0-9]/g, '');
            if (!num) return;
            const url = 'https://wa.me/' + num;
            const floatBtn = document.getElementById('wa-float-btn');
            const navBtn = document.getElementById('wa-nav-btn');
            const mobWa = document.getElementById('mob-wa-btn');
            if (floatBtn) floatBtn.href = url + '?text=' + encodeURIComponent('Hi! I have a question about my order.');
            if (navBtn) navBtn.href = url + '?text=' + encodeURIComponent('Hi! I have a question about SOLE.');
            if (mobWa) mobWa.href = url + '?text=' + encodeURIComponent('Hi! I have a question about SOLE.');
            const floatWrap = document.querySelector('.wa-float');
            if (floatWrap) floatWrap.style.display = num ? 'flex' : 'none';
            const fwl = document.getElementById('footer-wa-link'); if (fwl && num) fwl.href = 'https://wa.me/' + num;
        }

        function trackPageView() {
            if (!db || !dbReady) return;
            try {
                db.collection('analytics').doc('summary').set({
                    pageviews: firebase.firestore.FieldValue.increment(1),
                    lastVisit: new Date().toISOString()
                }, { merge: true });
            } catch (e) { }
        }

        function waSyncFromFirebase() { waNumber = localStorage.getItem("sole_wa_number") || ""; setWaLinks(); const fwl = document.getElementById("footer-wa-link"); if (fwl && waNumber) fwl.href = "https://wa.me/" + waNumber.replace(/[^0-9]/g, ""); syncFooterContact(); }

        function calcDiscount(subtotal) {
            if (!appliedCoupon) return 0;
            if (appliedCoupon.type === 'pct') return Math.round(subtotal * appliedCoupon.value / 100);
            if (appliedCoupon.type === 'flat') return Math.min(appliedCoupon.value, subtotal);
            return 0;
        }

        function openTrack() {
            document.getElementById('track-overlay').classList.add('open');
            document.body.style.overflow = 'hidden';
            setTimeout(() => { const el = document.getElementById('track-order-id'); if (el) el.focus(); }, 100);
        }

        function setReviewRating(rating, productName) {
            pendingReviewRating = rating;
            pendingReviewProductName = productName;
            document.querySelectorAll('.review-write-star').forEach((s, i) => {
                s.classList.toggle('active', i < rating);
            });
        }

        function filterCategory(cat) {
            activeCat = cat;
            renderCategoryBar();
            handleSearch(); // triggers renderStore with current search + category
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        }

        async function notifyMe(productName, emailEl, hintEl) {
            const email = emailEl.value.trim();
            if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
                hintEl.textContent = 'Please enter a valid email.'; hintEl.className = 'notify-hint err'; return;
            }
            hintEl.textContent = 'Saving...'; hintEl.className = 'notify-hint';
            try {
                if (db && dbReady) {
                    await db.collection('notifications').add({
                        productName, email, date: new Date().toISOString(), notified: false
                    });
                } else {
                    // Save locally as fallback
                    const saved = JSON.parse(localStorage.getItem('sole_notify_requests') || '[]');
                    saved.push({ productName, email, date: new Date().toISOString() });
                    localStorage.setItem('sole_notify_requests', JSON.stringify(saved));
                }
                hintEl.textContent = '✓ We\'ll email you when this is back in stock!';
                hintEl.className = 'notify-hint ok';
                emailEl.value = '';
                setTimeout(() => hintEl.textContent = '', 4000);
            } catch (e) {
                hintEl.textContent = 'Failed to save. Please try again.';
                hintEl.className = 'notify-hint err';
            }
        }

