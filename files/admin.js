
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCrSsQfobC6HsGDq1BFd7tRhAC7OrrZkeY",
  authDomain:        "sole-5fa90.firebaseapp.com",
  projectId:         "sole-5fa90",
  storageBucket:     "sole-5fa90.firebasestorage.app",
  messagingSenderId: "386350872003",
  appId:             "1:386350872003:web:4d739688ffa30816cff976"
};


// =============================================
//   EDIT YOUR DEFAULT PRODUCTS HERE
// =============================================
const DEFAULT_PRODUCTS = [
  { name:"Aero Runner", price:12900, tag:"Bestseller", desc:"Lightweight mesh upper with responsive foam cushioning. Built for speed, designed to impress.", sizes:[38,39,40,41,42,43,44,45], img:"" },
  { name:"Urban Slip",  price:9500,  tag:"New Arrival", desc:"Effortless elegance meets street comfort. Premium suede, butter-soft leather lining.", sizes:[38,39,40,41,42,43,44], img:"" },
  { name:"Oxford Elite",price:21000, tag:"Classic", desc:"Handcrafted full-grain leather. A modern interpretation of timeless formality.", sizes:[39,40,41,42,43,44,45], img:"" },
  { name:"Trail Hike Pro",price:18500,tag:"Outdoor", desc:"Waterproof upper with deep-lug outsole. Conquer any terrain.", sizes:[38,39,40,41,42,43,44,45], img:"" },
  { name:"Vela Heel",   price:24800, tag:"Luxury", desc:"Sculptural block heel, Italian nappa leather. Runway presence, all-day comfort.", sizes:[35,36,37,38,39,40,41], img:"" },
  { name:"Drift Sandal",price:7200,  tag:"Summer", desc:"Contoured cork footbed with adjustable straps. The perfect warm-weather companion.", sizes:[36,37,38,39,40,41,42,43], img:"" }
];

// =============================================
//  DEFAULT PASSWORD (SHA-256 of "sole2025")
// After first run, password hash is stored in localStorage
// =============================================
const DEFAULT_PW_HASH = "b9c950640b0040b1c5e73c76aef8ee13b73b4e9e9c2b0d46a4f1d3e2b0e5c8f1"; // sole2025 placeholder – real hash computed at init

// Payment method display names
const PAY_LABELS = { cod:"Cash on Delivery", easypaisa:"Easypaisa", sadapay:"SadaPay", payoneer:"Payoneer", bank:"Bank Transfer" };
const PAY_ICONS  = { cod:"💵", easypaisa:"📱", sadapay:"💜", payoneer:"🌐", bank:"🏦" };
const EMOJIS = ["👟","🥿","👞","🥾","👠","🩴","👡","👢","🪖","🎿"];

let products = [], orders = [], cart = [], selectedSizes = {}, adminUnlocked = false;
let selectedPayment = "cod";
let deliveryCharge = 0;

// SHA-256 using Web Crypto API
// =============================================
// FIREBASE AUTHENTICATION
// =============================================
let auth = null;
let currentUser = null;

function initAuth() {
  try {
    auth = firebase.auth();
    // Use session persistence — stays logged in during browser session, clears on browser close
    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(e => console.warn('Persistence:', e.message));

    // Listen for auth state changes — fires on every page load
    auth.onAuthStateChanged(user => {
      if (user) {
        // User is signed in
        currentUser = user;
        adminUnlocked = true;
        // Update email display everywhere
        document.querySelectorAll('.auth-email-display').forEach(el => el.textContent = user.email);
        // Always go straight to dashboard on admin page
        showDashboard();
      } else {
        // User is signed out
        currentUser = null;
        adminUnlocked = false;
        document.querySelectorAll('.auth-email-display').forEach(el => el.textContent = '—');
      }
    });
  } catch(e) {
    console.warn('Auth init failed:', e.message);
  }
}

async function doLogin() {
  if (!auth) {
    // Firebase not ready yet — show setup notice
    document.getElementById('auth-setup-notice').style.display = 'block';
    return;
  }

  const email    = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

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
  } catch(e) {
    btn.textContent = 'Sign In →';
    btn.disabled = false;
    // Show friendly error messages
    const msg = e.code === 'auth/user-not-found'    ? 'No account found with this email.'
              : e.code === 'auth/wrong-password'    ? 'Incorrect password.'
              : e.code === 'auth/invalid-email'     ? 'Invalid email address.'
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
  } catch(e) {
    alert('Sign out failed: ' + e.message);
  }
}

// Keep sha256 for any legacy use but no longer used for auth
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

function initPasswordHash() {
  // No longer needed — Firebase Auth handles authentication
}

// =============================================
// EMAILJS — ORDER CONFIRMATION EMAILS
// =============================================
function loadEmailJsConfig() {
  try { return JSON.parse(localStorage.getItem('sole_emailjs')) || null; } catch(e) { return null; }
}

function saveEmailJsConfig() {
  const cfg = {
    publicKey:  document.getElementById('ejs-public-key').value.trim(),
    serviceId:  document.getElementById('ejs-service-id').value.trim(),
    templateId: document.getElementById('ejs-template-id').value.trim(),
  };
  const hint = document.getElementById('ejs-hint');
  if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
    hint.textContent = '⚠ All three fields are required.'; hint.style.color='var(--red)'; return;
  }
  localStorage.setItem('sole_emailjs', JSON.stringify(cfg));
  emailjs.init(cfg.publicKey);
  hint.textContent = '✓ EmailJS config saved! Emails will be sent on new orders.';
  hint.style.color = 'var(--green)';
  setTimeout(()=>hint.textContent='', 4000);
}

function initEmailJs() {
  const cfg = loadEmailJsConfig();
  if (cfg && cfg.publicKey) {
    try { emailjs.init(cfg.publicKey); } catch(e) {}
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
      to_email:        order.customer.email,
      customer_name:   `${order.customer.fname} ${order.customer.lname}`,
      order_id:        order.id,
      order_total:     `Rs. ${Number(order.total).toLocaleString()}`,
      order_subtotal:  `Rs. ${Number(order.subtotal).toLocaleString()}`,
      delivery_charge: `Rs. ${Number(order.deliveryCharge).toLocaleString()}`,
      order_items:     itemsList,
      payment_method:  PAY_LABELS[order.payment] || order.payment,
      delivery_address:order.customer.address,
      customer_phone:  order.customer.phone || '—',
      order_date:      new Date(order.date).toLocaleDateString('en-PK', {year:'numeric',month:'long',day:'numeric'}),
    });
    console.log('✅ Confirmation email sent to', order.customer.email);
  } catch(e) {
    console.warn('Email send failed:', e.text || e.message);
  }
}

async function testEmailJs() {
  const cfg = loadEmailJsConfig();
  const hint = document.getElementById('ejs-hint');
  if (!cfg || !cfg.publicKey) {
    hint.textContent = '⚠ Save your config first.'; hint.style.color='var(--red)'; return;
  }
  if (!currentUser) {
    hint.textContent = '⚠ You must be signed in to send a test.'; hint.style.color='var(--red)'; return;
  }
  hint.textContent = '📧 Sending test email...'; hint.style.color='var(--muted)';
  try {
    await emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email:        currentUser.email,
      customer_name:   'Test Customer',
      order_id:        'TEST-' + Date.now().toString(36).toUpperCase(),
      order_total:     'Rs. 1,500',
      order_subtotal:  'Rs. 1,300',
      delivery_charge: 'Rs. 200',
      order_items:     'Test Shoe (Size EU 42) — Rs. 1,300',
      payment_method:  'Cash on Delivery',
      delivery_address:'123 Test Street, Karachi',
      customer_phone:  '0300-1234567',
      order_date:      new Date().toLocaleDateString('en-PK', {year:'numeric',month:'long',day:'numeric'}),
    });
    hint.textContent = `✅ Test email sent to ${currentUser.email}!`;
    hint.style.color = 'var(--green)';
  } catch(e) {
    hint.textContent = '❌ Failed: ' + (e.text || e.message);
    hint.style.color = 'var(--red)';
  }
  setTimeout(()=>hint.textContent='', 5000);
}

// Session persistence handles auth lifecycle — no auto-logout needed

// =============================================
// FIREBASE DATABASE LAYER
// =============================================
let db = null;         // Firestore instance
let dbReady = false;   // true when connected
let unsubProducts = null; // realtime listener
let unsubOrders   = null;

function setDbStatus(state, text) {
  const bar  = document.getElementById('db-status-bar');
  const span = document.getElementById('db-status-text');
  if (bar)  { bar.className  = ''; bar.classList.add(state); }
  if (span) span.textContent = text;
}

function loadFirebaseConfig() {
  try {
    const raw = localStorage.getItem('sole_firebase_config');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function initFirebase(config) {
  try {
    // Clean up existing listeners
    if (unsubProducts) { unsubProducts(); unsubProducts = null; }
    if (unsubOrders)   { unsubOrders();   unsubOrders   = null; }

    // Delete existing app if any
    try {
      const existing = firebase.app();
      if (existing) existing.delete();
    } catch(e) {}

    firebase.initializeApp(config);
    db = firebase.firestore();
    initAuth(); // Start Firebase Authentication listener

    // Test connection using a public products read (works before auth)
    db.collection('products').limit(1).get().then(() => {
      dbReady = true;
      setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
      const chip = document.getElementById('fb-status-chip');
      if (chip) { chip.className = 'firebase-status-chip ok'; chip.textContent = 'Connected'; }
      startRealtimeListeners();
    }).catch(() => {
      // Still start listeners — auth state fires separately
      dbReady = true;
      setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
      startRealtimeListeners();
    });
  } catch(e) {
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
      products = incoming.sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
      localStorage.setItem('sole_products', JSON.stringify(products));
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
        if (typeof renderAdminProducts === 'function') renderAdminProducts();
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
      .sort((a,b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('sole_orders', JSON.stringify(orders));
    renderOrders && renderOrders();
    renderOrderStats && renderOrderStats();
    updateOrderBadge();
  }, err => {
    console.warn('Orders listener error:', err.message);
  });

  // Settings listener
  db.collection('settings').doc('store').onSnapshot(snap => {
    if (snap.exists) {
      const data = snap.data();
      if (typeof data.deliveryCharge === 'number') {
        deliveryCharge = data.deliveryCharge;
        localStorage.setItem('sole_delivery_charge', deliveryCharge);
        renderCart();
      }
    }
  });
}

// ---- MIGRATE local products → Firebase (runs once when Firebase is empty) ----
async function migrateLocalProductsToFirebase(localProducts) {
  if (!db || !dbReady) return;
  setDbStatus('saving', '📦 Migrating products to Firebase...');
  try {
    const batch = db.batch();
    localProducts.forEach(p => {
      const clean = {...p};
      delete clean._fbId; // remove any stale _fbId
      const ref = db.collection('products').doc();
      batch.set(ref, { ...clean, createdAt: Date.now() });
    });
    await batch.commit();
    setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
    console.log('✅ Migration complete');
  } catch(e) {
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
    renderStore(); renderAdminProducts();
    return;
  }
  setDbStatus('saving', '💾 Saving product...');
  try {
    await db.collection('products').add({ ...productData, createdAt: Date.now() });
    setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
  } catch(e) {
    alert('Failed to save product to database: ' + e.message);
    setDbStatus('disconnected', '⚠ Save failed: ' + e.message);
  }
}

async function dbDeleteProduct(prodIdx) {
  const p = products[prodIdx];
  if (!dbReady || !db || !p._fbId) {
    products.splice(prodIdx, 1);
    localStorage.setItem('sole_products', JSON.stringify(products));
    renderStore(); renderAdminProducts();
    return;
  }
  setDbStatus('saving', '🗑 Deleting product...');
  try {
    await db.collection('products').doc(p._fbId).delete();
    setDbStatus('connected', '🔥 Firebase connected — data syncing in real-time');
  } catch(e) {
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
  } catch(e) {
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
  } catch(e) {
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
  } catch(e) {
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
  } catch(e) {
    console.error('Stock update failed:', e.message);
    setDbStatus('disconnected', '⚠ Stock sync failed: ' + e.message);
  }
}

async function dbSaveDeliveryCharge(val) {
  localStorage.setItem('sole_delivery_charge', val);
  if (!dbReady || !db) return;
  try {
    await db.collection('settings').doc('store').set({ deliveryCharge: val }, { merge: true });
  } catch(e) { console.error('Delivery charge save failed:', e.message); }
}

function saveFirebaseConfig() {
  const config = {
    apiKey:            document.getElementById('fb-apiKey').value.trim(),
    authDomain:        document.getElementById('fb-authDomain').value.trim(),
    projectId:         document.getElementById('fb-projectId').value.trim(),
    storageBucket:     document.getElementById('fb-storageBucket').value.trim(),
    messagingSenderId: document.getElementById('fb-messagingSenderId').value.trim(),
    appId:             document.getElementById('fb-appId').value.trim(),
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
  if (unsubOrders)   { unsubOrders();   unsubOrders   = null; }
  try { firebase.app().delete(); } catch(e) {}
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
  } catch(e) { products = []; }
  try { orders   = JSON.parse(localStorage.getItem('sole_orders'))   || []; } catch(e) { orders = []; }
  try { deliveryCharge = parseInt(localStorage.getItem('sole_delivery_charge')) || 0; } catch(e) { deliveryCharge = 0; }
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]/g,'-'); }
function genId()    { return 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,3).toUpperCase(); }

// =============================================
// STORE RENDER (search-aware)
// =============================================
function renderStore(filtered) {
  const grid  = document.getElementById('product-grid');
  const label = document.getElementById('product-count-label');
  const infoEl = document.getElementById('search-results-info');
  selectedSizes = {};

  const list = filtered !== undefined ? filtered : products;

  if (!products.length) {
    // If Firebase is configured but not yet ready, show loading spinner
    const hasFbConfig = !!localStorage.getItem('sole_firebase_config');
    if (grid) {
      if (hasFbConfig && !dbReady) {
        grid.innerHTML = `<div style="grid-column:1/-1;padding:4rem;color:var(--muted);text-align:center"><div style="font-size:2rem;margin-bottom:1rem;animation:spin 1s linear infinite;display:inline-block">⏳</div><div>Loading products...</div></div>`;
      } else {
        grid.innerHTML = `<div style="grid-column:1/-1;padding:4rem;color:var(--muted);text-align:center"><div style="font-size:3rem;margin-bottom:1rem">👟</div>No products yet. Open Admin to add some.</div>`;
      }
    }
    if (label) label.textContent = '0 Products';
    if (infoEl) infoEl.style.display='none';
    return;
  }

  if (label) label.textContent = `${products.length} Product${products.length!==1?'s':''}`;

  // Show search info
  const query = document.getElementById('store-search') ? document.getElementById('store-search').value.trim() : '';
  if (query || filtered !== undefined) {
    if (infoEl) {
      infoEl.style.display = 'block';
      if (!list.length) {
        infoEl.innerHTML = `No results for "<span>${escHtml(query)}</span>"`;
      } else {
        infoEl.innerHTML = `Showing <span>${list.length}</span> of <span>${products.length}</span> products${query ? ` for "<span>${escHtml(query)}</span>"` : ''}`;
      }
    }
  } else {
    if (infoEl) infoEl.style.display = 'none';
  }

  if (!list.length) {
    if (grid) grid.innerHTML = `<div class="no-results"><span class="no-results-icon">🔍</span>No shoes found matching "<strong>${escHtml(query)}</strong>".<br><span style="font-size:.85rem">Try a different keyword or clear the search.</span></div>`;
    return;
  }

  grid.innerHTML = '';
  list.forEach((p, originalIndex) => {
    const i = products.indexOf(p);
    const key = slugify(p.name)+'-'+i;
    selectedSizes[key] = null;
    const emoji = EMOJIS[i%EMOJIS.length];
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
    const imgTitle    = isOos ? 'Out of Stock' : 'View details';
    const hintHtml    = isOos ? '' : '<div class="pdm-card-hint">👁 View Details' + (coverImg ? ' · ' + imgs.length + ' photo' + (imgs.length !== 1 ? 's' : '') : '') + '</div>';
    const imgHTML = coverImg
      ? '<div class="product-img-wrap" ' + clickHandler + ' title="' + imgTitle + '">'
        + '<img class="product-img" src="' + escHtml(coverImg) + '" alt="' + escHtml(p.name) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
        + '<div class="product-img-placeholder" style="display:none">' + emoji + '</div>'
        + hintHtml + '</div>'
      : '<div class="product-img-wrap" ' + clickHandler + ' title="' + imgTitle + '">'
        + '<div class="product-img-placeholder">' + emoji + '</div>'
        + hintHtml + '</div>';

    const nameClick  = isOos ? '' : 'onclick="openPdm(' + i + ')"';
    const nameCursor = isOos ? 'default' : 'pointer';
    const oosLine    = isOos ? '<div class="oos-label">⛔ Currently unavailable</div>' : '';
    const addDisabled = isOos ? 'disabled title="Out of stock"' : '';

    const card = document.createElement('div');
    card.className = 'product-card' + (isOos ? ' oos' : '');
    card.innerHTML =
      stockBanner +
      imgHTML +
      '<div class="product-tag">' + escHtml(p.tag||'') + '</div>' +
      '<div class="product-name" style="cursor:' + nameCursor + '" ' + nameClick + '>' + escHtml(p.name) + '</div>' +
      '<div class="product-desc">' + escHtml(p.desc) + '</div>' +
      oosLine +
      '<div class="size-row" id="sizes-' + key + '"></div>' +
      '<div class="product-footer">' +
        '<div class="product-price">Rs. ' + p.price.toLocaleString() + '</div>' +
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
  const sort  = document.getElementById('search-sort').value;
  const clearBtn = document.getElementById('search-clear-btn');

  clearBtn.classList.toggle('visible', query.length > 0);

  let filtered = products.filter(p => {
    if (!query) return true;
    return p.name.toLowerCase().includes(query)
        || (p.tag||'').toLowerCase().includes(query)
        || p.desc.toLowerCase().includes(query);
  });

  // Sort
  if (sort === 'price-asc')  filtered = [...filtered].sort((a,b)=>a.price-b.price);
  if (sort === 'price-desc') filtered = [...filtered].sort((a,b)=>b.price-a.price);
  if (sort === 'name-asc')   filtered = [...filtered].sort((a,b)=>a.name.localeCompare(b.name));

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
    r.style.outline = '1px solid #c8ff00';
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
function removeFromCart(i) { cart.splice(i,1); renderCart(); const orderEl=document.getElementById('order'); if(orderEl && !cart.length) orderEl.classList.remove('visible'); }
function renderCart() {
  const c=document.getElementById('cart-items'), cnt=document.getElementById('order-count'), tot=document.getElementById('cart-total');
  // Guard: these elements don't exist on admin page
  if (!c || !cnt || !tot) return;
  const grandEl=document.getElementById('cart-grand-total-val');
  const delivEl=document.getElementById('cart-delivery-val');
  cnt.textContent=cart.length;
  if(!cart.length){
    c.innerHTML='<div class="empty-cart">No items yet — pick a pair above ↑</div>';
    tot.textContent='Rs. 0';
    if(grandEl) grandEl.textContent='Rs. 0';
    if(delivEl) delivEl.textContent='Rs. '+deliveryCharge.toLocaleString();
    return;
  }
  let html='',subtotal=0;
  cart.forEach((item,i)=>{
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
  c.innerHTML=html;
  tot.textContent='Rs. '+subtotal.toLocaleString();
  if(delivEl) delivEl.textContent='Rs. '+deliveryCharge.toLocaleString();
  if(grandEl) grandEl.textContent='Rs. '+(subtotal+deliveryCharge).toLocaleString();
}

// =============================================
// 2-PAGE CHECKOUT NAVIGATION
// =============================================
function goToPaymentPage() {
  const fname   = document.getElementById('fname').value.trim();
  const lname   = document.getElementById('lname').value.trim();
  const email   = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();
  if (!fname||!lname||!email||!address) {
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
  document.getElementById('order').scrollIntoView({behavior:'smooth',block:'start'});
}

function goBackToDelivery() {
  document.getElementById('checkout-page-2').style.display = 'none';
  document.getElementById('checkout-page-1').style.display = 'block';
  document.getElementById('step-ind-2').classList.remove('active');
  document.getElementById('step-ind-1').classList.remove('done');
  document.getElementById('step-ind-1').classList.add('active');
  document.getElementById('order').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderPaySummary() {
  const subtotal = cart.reduce((s,i)=>s+i.price,0);
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
  document.getElementById('pay-summary-subtotal').textContent  = 'Rs. '+subtotal.toLocaleString();
  document.getElementById('pay-summary-delivery').textContent  = 'Rs. '+deliveryCharge.toLocaleString();
  document.getElementById('pay-summary-total').textContent     = 'Rs. '+total.toLocaleString();

  // Update payoneer amount display
  const pav = document.getElementById('payoneer-amount-val');
  if (pav) pav.textContent = 'Rs. '+total.toLocaleString();
}

// =============================================
// PAYONEER CHECKOUT
// =============================================
function openPayoneerCheckout() {
  const programId = localStorage.getItem('sole_payoneer_program_id') || '';
  const subtotal  = cart.reduce((s,i)=>s+i.price,0);
  const total     = subtotal + deliveryCharge;
  const fname     = document.getElementById('fname').value.trim();
  const lname     = document.getElementById('lname').value.trim();
  const email     = document.getElementById('email').value.trim();

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
    client_reference_id: 'SOLE-'+Date.now(),
    email: email,
    first_name: fname,
    last_name: lname
  });
  const url = `https://payouts.payoneer.com/partners/lp.aspx?${params.toString()}`;
  window.open(url, '_blank', 'noopener');
}


function selectPayment(method, btn) {
  selectedPayment = method;
  document.querySelectorAll('.pay-card').forEach(c=>c.classList.remove('selected'));
  btn.classList.add('selected');
  document.querySelectorAll('.pay-detail').forEach(d=>d.classList.remove('active'));
  document.getElementById('pay-'+method).classList.add('active');
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(()=>{ const orig=btn.textContent; btn.textContent='✓ Copied!'; setTimeout(()=>btn.textContent=orig,1500); });
}



// =============================================
// PLACE ORDER
// =============================================
async function placeOrder() {
  const fname   = document.getElementById('fname').value.trim();
  const lname   = document.getElementById('lname').value.trim();
  const email   = document.getElementById('email').value.trim();
  const phone   = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();

  if (!fname||!lname||!email||!address) { alert('Please fill in name, email, and delivery address.'); return; }
  if (!cart.length) { alert('Add at least one item first.'); return; }

  const subtotal = cart.reduce((s,i)=>s+i.price,0);
  const total    = subtotal + deliveryCharge;

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
    deliveryCharge,
    total,
    payment: selectedPayment,
    paymentRef,
    paymentScreenshot,
    status: 'pending'
  };

  orders.unshift(order);
  // Save order to Firestore
  await dbSaveOrder(order);
  updateOrderBadge();
  // Send confirmation email to customer (non-blocking)
  sendOrderConfirmationEmail(order);

  // Deduct per-size stock — update each affected product in Firestore
  const stockUpdatePromises = [];
  cart.forEach(item => {
    const idx = item.productIdx;
    if (idx === undefined || !products[idx]) return;
    const p = products[idx];
    const sKey = String(item.size);
    if (p.sizeStock && p.sizeStock[sKey] !== undefined) {
      p.sizeStock[sKey] = Math.max(0, p.sizeStock[sKey] - 1);
    } else if (typeof p.stock === 'number') {
      p.stock = Math.max(0, p.stock - 1);
    }
    stockUpdatePromises.push(dbUpdateSizeStock(idx));
  });
  await Promise.all(stockUpdatePromises);
  renderStore();

  document.getElementById('success-msg').textContent =
    `Thank you, ${fname}! Your Rs. ${total.toLocaleString()} order via ${PAY_ICONS[selectedPayment]} ${PAY_LABELS[selectedPayment]} has been received. We'll contact you at ${email} to confirm.`;
  document.getElementById('success-order-id').textContent = `Order ID: ${orderId}`;
  document.getElementById('success').classList.add('show');
}

function resetOrder() {
  cart = [];
  renderCart();
  document.getElementById('order').classList.remove('visible');
  document.getElementById('success').classList.remove('show');
  document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));
  Object.keys(selectedSizes).forEach(k=>selectedSizes[k]=null);
  ['fname','lname','email','phone','address'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['easypaisa','sadapay','bank','payoneer'].forEach(m=>resetSs(m));
  selectPayment('cod', document.querySelectorAll('.pay-card')[0]);
  // Reset to page 1
  document.getElementById('checkout-page-1').style.display='block';
  document.getElementById('checkout-page-2').style.display='none';
  document.getElementById('step-ind-1').classList.add('active');
  document.getElementById('step-ind-1').classList.remove('done');
  document.getElementById('step-ind-2').classList.remove('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

function updateOrderBadge() {
  document.getElementById('tab-orders-badge').textContent = orders.length;
}

// =============================================
// SCREENSHOT UPLOAD FUNCTIONS
// =============================================
const ssData = {}; // { 'easypaisa': base64, 'sadapay': base64, 'bank': base64 }

function ssFileSelect(input, method) {
  const file = input.files[0];
  if (!file) return;
  ssLoadFile(file, method);
  input.value = '';
}

function ssDragOver(e, method) {
  e.preventDefault();
  document.getElementById('ss-zone-'+method).classList.add('drag-over');
}

function ssDragLeave(method) {
  document.getElementById('ss-zone-'+method).classList.remove('drag-over');
}

function ssDrop(e, method) {
  e.preventDefault();
  document.getElementById('ss-zone-'+method).classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) { ssLoadFile(file, method); }
  else { alert('Please drop an image file.'); }
}

function ssLoadFile(file, method) {
  if (file.size > 8 * 1024 * 1024) { alert('Screenshot too large. Max 8 MB.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    ssData[method] = e.target.result;
    showSsPreview(method, e.target.result, file.name, formatBytes(file.size));
  };
  reader.readAsDataURL(file);
}

function showSsPreview(method, src, name, size) {
  document.getElementById('ss-idle-'+method).style.display = 'none';
  document.getElementById('ss-img-'+method).src = src;
  document.getElementById('ss-name-'+method).textContent = name;
  document.getElementById('ss-size-'+method).textContent = size;
  document.getElementById('ss-preview-'+method).classList.add('show');
}

function removeSs(e, method) {
  if (e) e.stopPropagation();
  delete ssData[method];
  document.getElementById('ss-idle-'+method).style.display = 'flex';
  document.getElementById('ss-preview-'+method).classList.remove('show');
  document.getElementById('ss-img-'+method).src = '';
  document.getElementById('ss-zone-'+method).classList.remove('drag-over');
}

function resetSs(method) { removeSs(null, method); }

function openSsLightbox(e, method) {
  e.stopPropagation();
  const src = ssData[method] || document.getElementById('ss-img-'+method).src;
  if (!src) return;
  document.getElementById('ss-lightbox-img').src = src;
  document.getElementById('ss-lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function openSsLightboxFromSrc(src) {
  document.getElementById('ss-lightbox-img').src = src;
  document.getElementById('ss-lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSsLightbox() {
  document.getElementById('ss-lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('ss-lightbox').classList.contains('open')) {
    closeSsLightbox();
  }
});

// =============================================
// ADMIN
// =============================================


function openAdmin() { /* no-op on admin page */ }
function closeAdmin() { /* no-op on admin page — use Sign Out */ }
// doLogin() — handled by Firebase Auth above
// Admin page: showDashboard shows full page instead of overlay
function showDashboard() {
  document.getElementById('admin-login').style.display='none';
  document.getElementById('admin-dashboard').style.display='block';
  renderAdminProducts();
  renderOrderStats();
  renderOrders();
  updateOrderBadge();
  // Update signed-in email display
  if (currentUser) {
    document.querySelectorAll('.auth-email-display').forEach(el => el.textContent = currentUser.email);
  }
  // Populate settings
  document.getElementById('setting-delivery').value = deliveryCharge;
  const pid = localStorage.getItem('sole_payoneer_program_id') || '';
  const pidEl = document.getElementById('setting-payoneer-id');
  if (pidEl) pidEl.value = pid;

  // Populate EmailJS fields
  const ejsCfg = loadEmailJsConfig();
  if (ejsCfg) {
    const ef = document.getElementById('ejs-public-key');
    const es = document.getElementById('ejs-service-id');
    const et = document.getElementById('ejs-template-id');
    if (ef) ef.value = ejsCfg.publicKey || '';
    if (es) es.value = ejsCfg.serviceId || '';
    if (et) et.value = ejsCfg.templateId || '';
  }

  // Populate Firebase config fields
  const fbCfg = loadFirebaseConfig();
  if (fbCfg) {
    const fields = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
    fields.forEach(k => {
      const el = document.getElementById('fb-' + k);
      if (el) el.value = fbCfg[k] || '';
    });
    const chip = document.getElementById('fb-status-chip');
    if (chip) {
      chip.className = 'firebase-status-chip ' + (dbReady ? 'ok' : 'idle');
      chip.textContent = dbReady ? '✅ Connected to Firebase' : '⬤ Config loaded — testing...';
    }
  }
}
function switchTab(name, btn) {
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
  if(name==='orders'){ renderOrderStats(); renderOrders(); }
  if(name==='settings'){
    document.getElementById('setting-delivery').value=deliveryCharge;
    const pid = localStorage.getItem('sole_payoneer_program_id') || '';
    const pidEl = document.getElementById('setting-payoneer-id');
    if (pidEl) pidEl.value = pid;
    // Populate EmailJS fields
    const ejsCfg = loadEmailJsConfig();
    if (ejsCfg) {
      const ef = document.getElementById('ejs-public-key');
      const es = document.getElementById('ejs-service-id');
      const et = document.getElementById('ejs-template-id');
      if (ef) ef.value = ejsCfg.publicKey || '';
      if (es) es.value = ejsCfg.serviceId || '';
      if (et) et.value = ejsCfg.templateId || '';
    }

  // Populate Firebase config fields
  const fbCfg = loadFirebaseConfig();
  if (fbCfg) {
    const fields = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
    fields.forEach(k => {
      const el = document.getElementById('fb-' + k);
      if (el) el.value = fbCfg[k] || '';
    });
    const chip = document.getElementById('fb-status-chip');
    if (chip) {
      chip.className = 'firebase-status-chip ' + (dbReady ? 'ok' : 'idle');
      chip.textContent = dbReady ? '✅ Connected to Firebase' : '⬤ Config loaded — testing...';
    }
  }
  }
}

// =============================================
// ADMIN — PRODUCTS
// =============================================
function renderAdminProducts() {
  const list=document.getElementById('admin-products-list');
  document.getElementById('admin-prod-count').textContent=products.length;
  document.getElementById('tab-prod-count').textContent=products.length;
  if(!products.length){ list.innerHTML='<div class="admin-empty">No products yet. Add one above.</div>'; return; }
  list.innerHTML='';
  products.forEach((p,i)=>{
    const emoji=EMOJIS[i%EMOJIS.length];
    const thumb=p.img?`<img class="admin-product-thumb" src="${escHtml(p.img)}" alt="${escHtml(p.name)}" onerror="this.outerHTML='<div class=\\'admin-product-thumb-placeholder\\'>${emoji}</div>'">`:`<div class="admin-product-thumb-placeholder">${emoji}</div>`;

    // Per-size stock grid
    const ss = p.sizeStock || {};
    const hasSS = Object.keys(ss).length > 0;
    const totalStock = hasSS ? p.sizes.reduce((t,s)=>t+(ss[String(s)]||0),0) : (typeof p.stock==='number'?p.stock:0);
    const availCount = hasSS ? p.sizes.filter(s=>(ss[String(s)]||0)>0).length : (totalStock>0?p.sizes.length:0);
    const badgeClass = totalStock===0?'out':totalStock<=5?'low':'in';
    const badgeLabel = totalStock===0?'⛔ Out of Stock':totalStock<=5?`⚠ ${totalStock} total left`:`✓ ${availCount}/${p.sizes.length} sizes available`;

    const sizeCells = p.sizes.map(s=>{
      const qty = hasSS && ss[String(s)]!==undefined ? ss[String(s)] : '';
      const cellClass = qty===''?'':qty===0?'out':qty<=3?'low':'in';
      return `<div class="size-stock-cell ${cellClass}">
        <span class="size-stock-cell-label">EU ${s}</span>
        <div class="size-stock-cell-ctrl">
          <button onclick="adjSizeStock(${i},'${s}',-1)">−</button>
          <input type="number" id="ss-${i}-${s}" value="${qty}" placeholder="?" min="0" onchange="sizeStockChanged(${i},'${s}')">
          <button onclick="adjSizeStock(${i},'${s}',1)">+</button>
        </div>
        <span class="size-stock-cell-num">${qty===''?'—':qty===0?'Out':qty+' left'}</span>
      </div>`;
    }).join('');

    const row=document.createElement('div'); row.className='admin-product-row';
    row.innerHTML=`${thumb}
      <div style="flex:1;min-width:0">
        <div class="apname">${escHtml(p.name)}</div>
        <div class="apdesc">${escHtml(p.desc)}</div>
        <div class="stock-badge ${badgeClass}" style="margin:.4rem 0">${badgeLabel}</div>
        <div class="size-stock-grid">${sizeCells}</div>
        <div class="size-stock-save-row">
          <button class="size-stock-save-btn" onclick="saveSizeStock(${i})">💾 Save Stock</button>
          <span class="settings-hint" id="ss-hint-${i}"></span>
        </div>
      </div>
      <div class="admin-price-badge">Rs. ${p.price.toLocaleString()}</div>
      <div class="admin-tag-badge">${escHtml(p.tag||'—')}</div>
      <button class="delete-product-btn" onclick="deleteProduct(${i})">✕ Delete</button>`;
    list.appendChild(row);
  });
}
// Holds multiple uploaded images for current add-product form
let pendingImages = []; // array of {src, label}

async function addProduct() {
  const name    = document.getElementById('ap-name').value.trim();
  const price   = parseFloat(document.getElementById('ap-price').value);
  const tag     = document.getElementById('ap-tag').value.trim();
  const sizesRaw= document.getElementById('ap-sizes').value.trim();
  const desc    = document.getElementById('ap-desc').value.trim();
  if(!name)  { alert('Product name required.'); return; }
  if(!price||price<=0){ alert('Valid price required.'); return; }
  if(!sizesRaw){ alert('Enter at least one size.'); return; }
  if(!desc)  { alert('Description required.'); return; }
  const sizes = sizesRaw.split(',').map(s=>parseFloat(s.trim())).filter(s=>!isNaN(s));
  if(!sizes.length){ alert('Enter valid sizes separated by commas.'); return; }

  // Read per-size stock from dynamic fields
  const sizeStock = {};
  let anyStockEntered = false;
  sizes.forEach(s => {
    const el = document.getElementById('ap-sz-stock-' + s);
    if (el && el.value !== '') {
      sizeStock[String(s)] = Math.max(0, parseInt(el.value)||0);
      anyStockEntered = true;
    }
  });
  if (!anyStockEntered) { alert('Please enter stock quantity for at least one size.'); return; }

  const images = pendingImages.map(x=>x.src);
  const img = images[0] || '';
  const productData = { name, price, tag, desc, sizes, img, images, sizeStock };

  // Show loading state on button
  const btn=document.querySelector('.add-product-btn'), orig=btn.textContent;
  btn.textContent='⏳ Saving...'; btn.disabled=true;

  try {
    // Use dbAddProduct which handles both Firestore and localStorage fallback
    await dbAddProduct(productData);

    // If dbReady is false, dbAddProduct already pushed to products array
    // If dbReady is true, the Firestore snapshot listener will auto-update the products array
    // Either way, re-render
    renderStore(); renderAdminProducts();

    // Clear form
    ['ap-name','ap-price','ap-tag','ap-sizes','ap-desc'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('ap-size-stock-fields').innerHTML = '';
    document.getElementById('ap-size-stock-group').style.display = 'none';
    resetMultiUploader();
    btn.textContent='✓ Added!'; btn.style.background='#aee600'; btn.disabled=false;
    setTimeout(()=>{btn.textContent=orig;btn.style.background='';},2000);
  } catch(e) {
    btn.textContent=orig; btn.disabled=false;
    alert('Failed to add product: ' + e.message);
  }
}

async function deleteProduct(i) {
  if(!confirm(`Delete "${products[i].name}"?`)) return;
  await dbDeleteProduct(i);
}

// ---- MULTI IMAGE UPLOAD ----
function handleMultiFileSelect(input) {
  const files = Array.from(input.files);
  files.forEach(file => {
    if(pendingImages.length >= 6){alert('Maximum 6 images per product.');return;}
    if(file.size > 5*1024*1024){alert(`${file.name} is too large (max 5MB).`);return;}
    const reader = new FileReader();
    reader.onload = e => { addPendingImage(e.target.result, file.name); };
    reader.readAsDataURL(file);
  });
  input.value='';
}

function addUrlImage() {
  const url = document.getElementById('ap-img-url').value.trim();
  if(!url) return;
  if(pendingImages.length >= 6){alert('Maximum 6 images per product.');return;}
  const img = new Image();
  img.onload = ()=>{ addPendingImage(url,'URL image'); document.getElementById('ap-img-url').value=''; };
  img.onerror = ()=>alert('Could not load image from that URL. Check the link and try again.');
  img.src = url;
}

function addPendingImage(src, label) {
  pendingImages.push({src, label});
  renderMultiImgList();
}

function removePendingImage(idx) {
  pendingImages.splice(idx,1);
  renderMultiImgList();
}

function renderMultiImgList() {
  const list = document.getElementById('multi-img-list');
  list.innerHTML = '';
  pendingImages.forEach((img,i)=>{
    const item = document.createElement('div');
    item.className='multi-img-item';
    item.innerHTML=`<img src="${escHtml(img.src)}" title="${escHtml(img.label)}"><button class="multi-img-del" onclick="removePendingImage(${i})" title="Remove">✕</button>`;
    list.appendChild(item);
  });
  if(pendingImages.length < 6){
    const add = document.createElement('div');
    add.className='multi-img-add';
    add.innerHTML='<span>📁</span><span>Add Image</span>';
    add.onclick = ()=>document.getElementById('ap-img-file').click();
    list.appendChild(add);
  }
}

function resetMultiUploader() {
  pendingImages = [];
  renderMultiImgList();
  document.getElementById('ap-img-url').value='';
  document.getElementById('url-input-wrap').style.display='none';
  document.getElementById('url-toggle-label').textContent='🔗 Or paste an image URL instead';
}

function toggleUrlInput() {
  const wrap=document.getElementById('url-input-wrap');
  const label=document.getElementById('url-toggle-label');
  const vis = wrap.style.display==='flex';
  wrap.style.display= vis?'none':'flex';
  label.textContent= vis?'🔗 Or paste an image URL instead':'✕ Hide URL input';
  if(!vis) setTimeout(()=>document.getElementById('ap-img-url').focus(),50);
}

// kept for backward compat
function previewImg(url) {}
function handleDragOver(e){e.preventDefault();}
function handleDragLeave(e){}
function handleDrop(e){e.preventDefault();}
function handleFileSelect(i){ handleMultiFileSelect(i); }
function removeUploadedImage(e){e.stopPropagation();}
function resetImageUploader(){ resetMultiUploader(); }
function formatBytes(b){ if(b<1024)return b+' B'; if(b<1048576)return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }

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

  // Render gallery main
  renderPdmGallery(p, imgs, emoji);

  const ss = p.sizeStock || {};
  const hasSizeStock = Object.keys(ss).length > 0;
  const availSizes = p.sizes.filter(s => !hasSizeStock || (ss[String(s)] === undefined || ss[String(s)] > 0));
  const isOos = hasSizeStock && availSizes.length === 0;
  const isLow = !isOos && hasSizeStock && p.sizes.reduce((t,s)=>t+(ss[String(s)]||0),0) <= 5 && p.sizes.reduce((t,s)=>t+(ss[String(s)]||0),0) > 0;

  // Build size pills — grayed if OOS per size
  const sizesHtml = p.sizes.map(s => {
    const qty = hasSizeStock ? (ss[String(s)] !== undefined ? ss[String(s)] : -1) : -1;
    const sOos = hasSizeStock && qty === 0;
    const sLow = hasSizeStock && qty > 0 && qty <= 3;
    const cls = 'pdm-sz' + (sOos ? ' size-oos' : '') + (sLow ? ' size-low' : '');
    const title = sOos ? `Size ${s} — Out of Stock` : sLow ? `Size ${s} — Only ${qty} left` : '';
    const stock_note = sLow ? `<span style="font-size:.6rem;display:block;color:var(--orange)">${qty} left</span>` : '';
    return `<div class="${cls}" data-size="${s}" ${sOos?'':'onclick="pdmSelectSize(this)"'} title="${title}">${s}${stock_note}</div>`;
  }).join('');

  const totalLeft = hasSizeStock ? p.sizes.reduce((t,s)=>t+(ss[String(s)]||0),0) : (typeof p.stock==='number'?p.stock:null);
  const stockVal = isOos ? '<span style="color:var(--red)">⛔ Out of Stock</span>'
    : !hasSizeStock && totalLeft === null ? '—'
    : isLow ? `<span style="color:var(--orange)">⚠ Only ${totalLeft} pairs left</span>`
    : `<span style="color:var(--green)">✓ Available in ${availSizes.length} size${availSizes.length!==1?'s':''}</span>`;

  const specRows = [
    {label:'Category', val: p.tag || '—'},
    {label:'Available Sizes', val: availSizes.length + ' of ' + p.sizes.length},
    {label:'Price', val: 'Rs. '+p.price.toLocaleString()},
    {label:'Stock', val: stockVal},
  ];
  const specsHtml = specRows.map(r=>`<div class="pdm-spec-cell"><div class="pdm-spec-label">${r.label}</div><div class="pdm-spec-val">${r.val}</div></div>`).join('');

  document.getElementById('pdm-info').innerHTML = `
    <div class="pdm-badge">${escHtml(p.tag||'')}</div>
    <div class="pdm-title">${escHtml(p.name)}</div>
    <div class="pdm-price-tag">Rs. ${p.price.toLocaleString()}</div>
    <div class="pdm-hr"></div>
    <div>
      <div class="pdm-specs-title">Description</div>
      <div class="pdm-desc-text">${escHtml(p.desc)}</div>
    </div>
    <div class="pdm-hr"></div>
    <div>
      <div class="pdm-specs-title">Key Details</div>
      <div class="pdm-specs-grid">${specsHtml}</div>
    </div>
    <div class="pdm-hr"></div>
    <div>
      <div class="pdm-specs-title">Select Size</div>
      <div class="pdm-sizes-row" id="pdm-sizes-row">${sizesHtml}</div>
    </div>
    <button class="pdm-add-btn" onclick="pdmAddToCart(${productIdx})" ${isOos?'disabled style="opacity:.3;cursor:not-allowed"':''}>${isOos?'⛔ Out of Stock':'Add to Cart →'}</button>`;

  document.getElementById('pdm-overlay').classList.add('open');
  document.body.style.overflow='hidden';
}

function renderPdmGallery(p, imgs, emoji) {
  const mainWrap = document.getElementById('pdm-main-wrap');
  const thumbsEl = document.getElementById('pdm-thumbs');

  if(imgs.length){
    mainWrap.innerHTML = `
      <img class="pdm-main-img" id="pdm-main-img" src="${escHtml(imgs[pdmImgIdx])}" alt="${escHtml(p.name)}" onerror="this.style.display='none';document.getElementById('pdm-emoji-fb').style.display='flex'">
      <div id="pdm-emoji-fb" class="pdm-main-emoji" style="display:none">${emoji}</div>
      ${imgs.length>1?`<button class="pdm-nav pdm-prev" onclick="pdmNav(-1)">‹</button><button class="pdm-nav pdm-next" onclick="pdmNav(1)">›</button>`:''}
      <div class="pdm-img-badge">${pdmImgIdx+1} / ${imgs.length}</div>`;

    // Thumbnails
    thumbsEl.innerHTML = imgs.map((src,i)=>`<img class="pdm-thumb ${i===pdmImgIdx?'act':''}" src="${escHtml(src)}" onclick="pdmGoTo(${i})" title="Photo ${i+1}" onerror="this.style.display='none'">`).join('');
  } else {
    mainWrap.innerHTML = `<div class="pdm-main-emoji">${emoji}</div>`;
    thumbsEl.innerHTML = `<div class="pdm-thumb-emoji act">${emoji}</div>`;
  }
}

function pdmNav(dir) {
  const p = products[pdmProductIdx];
  const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
  if(!imgs.length) return;
  pdmImgIdx = (pdmImgIdx + dir + imgs.length) % imgs.length;
  pdmGoTo(pdmImgIdx);
}

function pdmGoTo(idx) {
  const p = products[pdmProductIdx];
  const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
  pdmImgIdx = idx;
  const mainImg = document.getElementById('pdm-main-img');
  if(mainImg){ mainImg.src = imgs[idx]; }
  // update badge
  const badge = document.querySelector('#pdm-main-wrap .pdm-img-badge');
  if(badge) badge.textContent = `${idx+1} / ${imgs.length}`;
  // update thumbs
  document.querySelectorAll('.pdm-thumb').forEach((t,i)=>t.classList.toggle('act',i===idx));
}

function pdmSelectSize(btn) {
  document.querySelectorAll('.pdm-sz').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
}

function pdmAddToCart(productIdx) {
  const p = products[productIdx];
  const ss = p.sizeStock || {};
  const hasSizeStock = Object.keys(ss).length > 0;
  if (hasSizeStock && p.sizes.every(s => (ss[String(s)] || 0) === 0)) {
    alert('Sorry, this product is out of stock.'); return;
  }
  const selBtn = document.querySelector('#pdm-sizes-row .pdm-sz.sel');
  if (!selBtn) {
    document.querySelectorAll('.pdm-sz').forEach(b => b.style.outline = '1px solid #c8ff00');
    setTimeout(() => document.querySelectorAll('.pdm-sz').forEach(b => b.style.outline = ''), 1000);
    return;
  }
  const size = Number(selBtn.getAttribute('data-size'));
  if (hasSizeStock && ss[String(size)] !== undefined && ss[String(size)] <= 0) {
    alert(`Sorry, size EU ${size} is out of stock.`); return;
  }
  cart.push({ name: p.name, price: p.price, size, productIdx });
  renderCart();
  document.getElementById('order').classList.add('visible');
  closePdm();
  document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePdm() {
  document.getElementById('pdm-overlay').classList.remove('open');
  document.body.style.overflow='';
}

function pdmClickOutside(e) {
  if(e.target === document.getElementById('pdm-overlay')) closePdm();
}

// Keyboard nav for modal
document.addEventListener('keydown', e=>{
  if(!document.getElementById('pdm-overlay').classList.contains('open')) return;
  if(e.key==='Escape') closePdm();
  if(e.key==='ArrowLeft') pdmNav(-1);
  if(e.key==='ArrowRight') pdmNav(1);
});

// =============================================
// ADMIN — ORDERS LIBRARY
// =============================================
function renderOrderStats() {
  const total    = orders.length;
  const revenue  = orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.total,0);
  const pending  = orders.filter(o=>o.status==='pending').length;
  const shipped  = orders.filter(o=>o.status==='shipped').length;
  document.getElementById('orders-stats').innerHTML = `
    <div class="stat-box"><div class="stat-label">Total Orders</div><div class="stat-value accent">${total}</div></div>
    <div class="stat-box"><div class="stat-label">Total Revenue</div><div class="stat-value accent">Rs. ${revenue.toLocaleString()}</div></div>
    <div class="stat-box"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--orange)">${pending}</div></div>
    <div class="stat-box"><div class="stat-label">Shipped</div><div class="stat-value" style="color:var(--blue)">${shipped}</div></div>`;
}

function renderOrders() {
  const search  = document.getElementById('orders-search').value.toLowerCase();
  const statusF = document.getElementById('orders-status-filter').value;
  const payF    = document.getElementById('orders-pay-filter').value;
  const list    = document.getElementById('orders-list');

  let filtered = orders.filter(o => {
    const cust = `${o.customer.fname} ${o.customer.lname} ${o.customer.email} ${o.id}`.toLowerCase();
    return (!search || cust.includes(search))
        && (!statusF || o.status===statusF)
        && (!payF    || o.payment===payF);
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="no-orders"><span>${orders.length?'🔍':'📋'}</span>${orders.length?'No orders match your filters.':'No orders yet. They will appear here when customers place orders.'}</div>`;
    return;
  }

  list.innerHTML='';
  filtered.forEach(o=>{
    const dateStr = new Date(o.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const dc = o.deliveryCharge || 0;

    // Build items with product images
    const itemsHtml = o.items.map(it => {
      // Find the product image from the products array
      const prod = products.find(p => p.name === it.name);
      const imgSrc = it.img || (prod && (prod.img || (prod.images && prod.images[0]))) || '';
      const emoji = ['👟','🥿','👞','🥾','👠','🩴','👡','👢'][Math.abs((it.name||'').length % 8)];
      const thumb = imgSrc
        ? `<img class="order-item-thumb" src="${escHtml(imgSrc)}" alt="${escHtml(it.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : '';
      const placeholder = `<div class="order-item-thumb-placeholder" style="${imgSrc?'display:none':''}">${emoji}</div>`;
      return `<div class="order-item-line order-item-line-img">
        <div class="order-item-img-wrap">${thumb}${placeholder}</div>
        <div class="order-item-details">
          <div class="order-item-name">${escHtml(it.name)}</div>
          <div class="order-item-meta">EU ${it.size}</div>
        </div>
        <span class="order-item-price">Rs. ${it.price.toLocaleString()}</span>
      </div>`;
    }).join('');

    const delivLine = dc>0 ? `<div class="order-item-line"><span>🚚 Delivery</span><span>Rs. ${dc.toLocaleString()}</span></div>` : '';
    const row=document.createElement('div'); row.className='order-row';
    row.innerHTML=`
      <div class="order-row-header" onclick="toggleOrder('expand-${o.id}',this)">
        <div class="order-row-thumb-col">
          ${o.items.slice(0,3).map(it => {
            const prod = products.find(p => p.name === it.name);
            const imgSrc = it.img || (prod && (prod.img || (prod.images && prod.images[0]))) || '';
            const emoji = ['👟','🥿','👞','🥾','👠','🩴','👡','👢'][Math.abs((it.name||'').length % 8)];
            return imgSrc
              ? `<img class="order-row-mini-thumb" src="${escHtml(imgSrc)}" alt="${escHtml(it.name)}" title="${escHtml(it.name)}" onerror="this.outerHTML='<span class=\'order-row-mini-emoji\'>${emoji}</span>'">`
              : `<span class="order-row-mini-emoji">${emoji}</span>`;
          }).join('')}
          ${o.items.length > 3 ? `<span class="order-row-more">+${o.items.length-3}</span>` : ''}
        </div>
        <div><div class="order-id">${o.id}</div><div class="order-customer">${escHtml(o.customer.fname)} ${escHtml(o.customer.lname)}<div class="order-customer-email">${escHtml(o.customer.email)}</div></div></div>
        <div class="order-total-badge">Rs. ${o.total.toLocaleString()}</div>
        <div><span class="order-status status-${o.status}">${o.status}</span><div class="order-payment-badge">${PAY_ICONS[o.payment]} ${PAY_LABELS[o.payment]}</div></div>
        <div class="order-date">${dateStr}</div>
        <div style="color:var(--muted);font-size:.8rem">▼</div>
      </div>
      <div class="order-expand" id="expand-${o.id}">
        <div>
          <div class="order-expand-section"><h6>Items Ordered</h6>
            <div class="order-items-list">
              ${itemsHtml}
              ${delivLine}
              <div class="order-item-line" style="font-weight:500;margin-top:.3rem"><span>Grand Total</span><span>Rs. ${o.total.toLocaleString()}</span></div>
            </div>
          </div>
          <div style="margin-top:1.5rem">
            <div class="order-expand-section"><h6>Update Status</h6></div>
            <div class="order-status-changer">
              <button class="status-btn s-pending"   onclick="updateStatus('${o.id}','pending')">⏳ Pending</button>
              <button class="status-btn s-confirmed" onclick="updateStatus('${o.id}','confirmed')">✅ Confirmed</button>
              <button class="status-btn s-shipped"   onclick="updateStatus('${o.id}','shipped')">🚚 Shipped</button>
              <button class="status-btn s-cancelled" onclick="updateStatus('${o.id}','cancelled')">✕ Cancelled</button>
            </div>
            <div style="margin-top:1rem">
              <button class="gen-slip-btn" onclick="generateSlip('${o.id}')">🧾 Generate Delivery Slip</button>
            </div>
          </div>
        </div>
        <div>
          <div class="order-expand-section"><h6>Delivery Details</h6>
            <div class="order-delivery-info">
              <span>Customer</span>${escHtml(o.customer.fname)} ${escHtml(o.customer.lname)}
              <span style="margin-top:.8rem">Phone</span>${escHtml(o.customer.phone||'—')}
              <span style="margin-top:.8rem">Email</span>${escHtml(o.customer.email)}
              <span style="margin-top:.8rem">Address</span>${escHtml(o.customer.address)}
            </div>
          </div>
          ${o.paymentScreenshot ? `
          <div class="order-ss-wrap" style="margin-top:1.2rem">
            <div class="order-ss-label">📸 Payment Screenshot</div>
            <img class="order-ss-img" src="${escHtml(o.paymentScreenshot)}" alt="Payment proof" onclick="openSsLightboxFromSrc('${escHtml(o.paymentScreenshot)}')" title="Click to view full size">
          </div>` : `<div style="margin-top:.8rem;font-size:.8rem;color:var(--muted)">No screenshot attached.</div>`}
        </div>
      </div>`;
    list.appendChild(row);
  });
}

function toggleOrder(id, header) {
  const el=document.getElementById(id);
  const arrow=header.querySelector('div:last-child');
  if(el.classList.contains('open')){ el.classList.remove('open'); arrow.textContent='▼'; }
  else { el.classList.add('open'); arrow.textContent='▲'; }
}

async function updateStatus(orderId, newStatus) {
  await dbUpdateOrderStatus(orderId, newStatus);
  renderOrderStats();
  renderOrders();
  updateOrderBadge();

  // Send confirmation email only when status changes to 'confirmed'
  if (newStatus === 'confirmed') {
    const order = orders.find(x => x.id === orderId);
    if (order) {
      sendConfirmationEmail(order);
    }
  }
}

// =============================================
// SEND CONFIRMATION EMAIL (triggered on CONFIRMED)
// =============================================
function sendConfirmationEmail(order) {
  const cfg = loadEmailJsConfig();
  if (!cfg || !cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
    alert('EmailJS is not configured. Go to Settings → Order Confirmation Emails to set it up.');
    return;
  }

  const itemsList = (order.items || []).map(item =>
    item.name + ' (EU ' + item.size + ') x' + (item.qty || 1) + ' — Rs. ' + Number(item.price).toLocaleString('en-PK')
  ).join('\n');

  const customerName = order.customer
    ? `${order.customer.fname || ''} ${order.customer.lname || ''}`.trim()
    : (order.name || 'Customer');

  const customerEmail = order.customer ? order.customer.email : order.email;
  const customerAddress = order.customer ? order.customer.address : (order.address || '—');
  const customerPhone = order.customer ? (order.customer.phone || '—') : (order.phone || '—');

  const templateParams = {
    to_email:         customerEmail,
    customer_name:    customerName,
    order_id:         order.id || order.orderId,
    order_total:      Number(order.total || 0).toLocaleString('en-PK'),
    order_subtotal:   Number(order.subtotal || 0).toLocaleString('en-PK'),
    order_delivery:   Number(order.deliveryCharge || 0).toLocaleString('en-PK'),
    order_discount:   Number(order.discount || 0).toLocaleString('en-PK'),
    order_items:      itemsList,
    payment_method:   PAY_LABELS[order.payment] || order.paymentMethod || 'Cash on Delivery',
    delivery_address: customerAddress,
    customer_phone:   customerPhone,
    order_date:       new Date(order.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }),
    wa_number:        localStorage.getItem('sole_wa_number') || '',
  };

  return emailjs.send(cfg.serviceId, cfg.templateId, templateParams)
    .then(() => {
      console.log('✅ Confirmation email sent to', customerEmail);
      // Show success banner in admin UI
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:20px;right:20px;background:#16a34a;color:white;padding:14px 20px;border-radius:10px;z-index:99999;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;animation:slideIn .3s ease;';
      banner.innerHTML = '📧 Confirmation email sent to <strong>' + escHtml(customerEmail) + '</strong>';
      document.body.appendChild(banner);
      setTimeout(() => { banner.style.opacity = '0'; banner.style.transition = 'opacity .3s'; setTimeout(() => banner.remove(), 300); }, 5000);
    })
    .catch((err) => {
      console.error('Email send failed:', err);
      // Show error banner
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:20px;right:20px;background:#dc2626;color:white;padding:14px 20px;border-radius:10px;z-index:99999;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.15);';
      banner.textContent = '⚠ Status updated but email failed: ' + (err.text || err);
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 7000);
    });
}

async function clearAllOrders() {
  if(!orders.length){alert('No orders to clear.');return;}
  if(!confirm(`Delete all ${orders.length} orders permanently? This cannot be undone.`))return;
  await dbDeleteAllOrders();
  renderOrderStats();
  renderOrders();
  updateOrderBadge();
}

// =============================================
// SETTINGS — DELIVERY CHARGE
// =============================================
async function saveDeliveryCharge() {
  const val = parseInt(document.getElementById('setting-delivery').value) || 0;
  deliveryCharge = val;
  await dbSaveDeliveryCharge(val);
  renderCart();
  const hint = document.getElementById('delivery-hint');
  hint.textContent = `✓ Saved — Rs. ${val.toLocaleString()} delivery charge is now active`;
  hint.classList.remove('err');
  setTimeout(()=>hint.textContent='', 3000);
}

// =============================================
// SETTINGS — CHANGE PASSWORD (SHA-256)
// =============================================
// =============================================
// CHANGE PASSWORD via Firebase Auth
// =============================================
async function changeFirebasePassword() {
  if (!auth || !currentUser) {
    alert('You must be signed in to change your password.');
    return;
  }
  const newPw      = document.getElementById('setting-new-pw').value;
  const confirmPw  = document.getElementById('setting-confirm-pw').value;
  const hint       = document.getElementById('pw-hint');

  if (!newPw || newPw.length < 6) {
    hint.textContent = '⚠ Password must be at least 6 characters.';
    hint.style.color = 'var(--red)';
    return;
  }
  if (newPw !== confirmPw) {
    hint.textContent = '⚠ Passwords do not match.';
    hint.style.color = 'var(--red)';
    return;
  }
  try {
    await currentUser.updatePassword(newPw);
    hint.textContent = '✓ Password updated successfully!';
    hint.style.color = 'var(--green)';
    document.getElementById('setting-new-pw').value = '';
    document.getElementById('setting-confirm-pw').value = '';
    setTimeout(() => hint.textContent = '', 3000);
  } catch(e) {
    if (e.code === 'auth/requires-recent-login') {
      hint.textContent = '⚠ Please sign out and sign back in, then try again.';
    } else {
      hint.textContent = '⚠ ' + e.message;
    }
    hint.style.color = 'var(--red)';
  }
}


function generateSlip(orderId) {
  // Find order — works with both local and Firebase-loaded orders
  const o = orders.find(x => x.id === orderId);
  if (!o) { alert('Order not found. Please refresh and try again.'); return; }

  const dateStr = new Date(o.date).toLocaleDateString('en-PK', {
    year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'
  });

  // Build items rows
  const itemsRows = (o.items || []).map(item => `
    <tr>
      <td>${escHtml(item.name)}</td>
      <td style="text-align:center">EU ${escHtml(String(item.size||'—'))}</td>
      <td style="text-align:right">Rs. ${Number(item.price||0).toLocaleString()}</td>
    </tr>`).join('');

  // Payment method label
  const payLabel = (PAY_LABELS[o.payment] || o.payment || '—');
  const payIcon  = (PAY_ICONS[o.payment]  || '💳');

  // Status badge color
  const statusColor = o.status === 'confirmed' ? '#22c55e'
                    : o.status === 'shipped'   ? '#38bdf8'
                    : o.status === 'cancelled' ? '#ff4444'
                    : '#fb923c';

  document.getElementById('slip-paper').innerHTML = `
    <div class="slip-header">
      <div>
        <div class="slip-logo">SOLE</div>
        <div style="font-size:.75rem;color:#888;margin-top:.2rem;letter-spacing:.05em">Premium Footwear</div>
      </div>
      <div class="slip-meta">
        <strong>${escHtml(o.id)}</strong>
        ${dateStr}<br>
        <span style="display:inline-block;margin-top:.3rem;padding:.2rem .6rem;background:${statusColor};color:#fff;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;font-weight:500">${escHtml(o.status||'pending')}</span>
      </div>
    </div>

    <div class="slip-section">
      <div class="slip-section-title">Deliver To</div>
      <div class="slip-row"><span>Name</span><span>${escHtml(o.customer.fname)} ${escHtml(o.customer.lname)}</span></div>
      <div class="slip-row"><span>Phone</span><span>${escHtml(o.customer.phone||'—')}</span></div>
      <div class="slip-row"><span>Email</span><span>${escHtml(o.customer.email)}</span></div>
      <div class="slip-row"><span>Address</span><span>${escHtml(o.customer.address)}</span></div>
    </div>

    <div class="slip-section">
      <div class="slip-section-title">Items Ordered</div>
      <table class="slip-items-table">
        <thead><tr><th>Product</th><th style="text-align:center">Size</th><th style="text-align:right">Price</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <div class="slip-total-box">
      <div class="slip-total-row"><span>Subtotal</span><span>Rs. ${Number(o.subtotal||0).toLocaleString()}</span></div>
      <div class="slip-total-row"><span>Delivery</span><span>Rs. ${Number(o.deliveryCharge||0).toLocaleString()}</span></div>
      <div class="slip-total-row grand"><span>Grand Total</span><span>Rs. ${Number(o.total||0).toLocaleString()}</span></div>
    </div>

    <div class="slip-section" style="margin-top:1rem">
      <div class="slip-section-title">Payment</div>
      <div class="slip-row"><span>Method</span><span>${payIcon} ${escHtml(payLabel)}</span></div>
      ${o.paymentRef ? `<div class="slip-row"><span>Reference</span><span>${escHtml(o.paymentRef)}</span></div>` : ''}
    </div>

    <div class="slip-barcode">
      <span class="slip-barcode-text">${escHtml(o.id)}</span>
      <span class="slip-barcode-label">Order ID — scan or quote when contacting support</span>
    </div>

    <div class="slip-footer">
      Thank you for shopping with SOLE!<br>
      For queries contact us via WhatsApp or email.
    </div>`;

  document.getElementById('slip-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSlip() {
  document.getElementById('slip-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function printSlip() {
  // Create a hidden print root and print it
  let root = document.getElementById('slip-print-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'slip-print-root';
    root.style.cssText = 'display:none;position:fixed;inset:0;background:#fff;z-index:99999;padding:2cm;font-family:"DM Sans",sans-serif;';
    document.body.appendChild(root);
  }
  // Copy Google Fonts link for print
  root.innerHTML = `<style>
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',sans-serif;}
    ${document.querySelector('style').textContent.split('@media print')[0]}
  </style>` + document.getElementById('slip-paper').innerHTML;
  root.style.display = 'block';
  window.print();
  setTimeout(()=>{ root.style.display='none'; }, 1000);
}

// =============================================
// STOCK MANAGEMENT — PER SIZE
// =============================================

// Dynamically render size-stock input fields in the Add Product form
function renderApSizeStockFields() {
  const raw = document.getElementById('ap-sizes').value;
  const sizes = raw.split(',').map(s=>parseFloat(s.trim())).filter(s=>!isNaN(s));
  const group = document.getElementById('ap-size-stock-group');
  const wrap  = document.getElementById('ap-size-stock-fields');
  if (!sizes.length) { group.style.display='none'; wrap.innerHTML=''; return; }
  group.style.display = 'block';
  // Preserve existing values
  const existing = {};
  wrap.querySelectorAll('.ap-size-stock-field').forEach(el => {
    const inp = el.querySelector('input');
    if (inp) existing[inp.dataset.size] = inp.value;
  });
  wrap.innerHTML = sizes.map(s => `
    <div class="ap-size-stock-field">
      <span>EU ${s}</span>
      <input type="number" id="ap-sz-stock-${s}" data-size="${s}"
        value="${existing[String(s)]||''}" placeholder="0" min="0"
        title="Stock for size EU ${s}">
    </div>`).join('');
}

// Admin product row: adjust a single size's stock input
function adjSizeStock(prodIdx, size, delta) {
  const inp = document.getElementById(`ss-${prodIdx}-${size}`);
  if (!inp) return;
  inp.value = Math.max(0, (parseInt(inp.value)||0) + delta);
}

function sizeStockChanged(prodIdx, size) {
  const inp = document.getElementById(`ss-${prodIdx}-${size}`);
  if (!inp) return;
  const v = parseInt(inp.value);
  if (isNaN(v)||v<0) inp.value=0;
}

// Save all size stocks for a product
async function saveSizeStock(prodIdx) {
  const p = products[prodIdx];
  if (!p) return;
  const sizeStock = p.sizeStock ? {...p.sizeStock} : {};
  let changed = false;
  p.sizes.forEach(s => {
    const inp = document.getElementById(`ss-${prodIdx}-${s}`);
    if (inp && inp.value !== '') {
      const val = Math.max(0, parseInt(inp.value)||0);
      sizeStock[String(s)] = val;
      changed = true;
    }
  });
  if (!changed) { alert('Please enter at least one size quantity.'); return; }
  products[prodIdx].sizeStock = sizeStock;
  // Keep legacy stock field in sync (total)
  products[prodIdx].stock = p.sizes.reduce((t,s)=>t+(sizeStock[String(s)]||0),0);
  await dbUpdateSizeStock(prodIdx);
  renderAdminProducts();
  renderStore();
  const hint = document.getElementById(`ss-hint-${prodIdx}`);
  if (hint) {
    hint.textContent = '✓ Stock updated!';
    hint.style.color = 'var(--green)';
    setTimeout(()=>hint.textContent='', 2500);
  }
}

// =============================================
// PAYONEER ID SETTINGS
// =============================================
function savePayoneerId() {
  const id = document.getElementById('setting-payoneer-id').value.trim();
  const hint = document.getElementById('payoneer-id-hint');
  if (!id) { hint.textContent = 'Please enter a valid Program ID.'; hint.classList.add('err'); return; }
  localStorage.setItem('sole_payoneer_program_id', id);
  hint.classList.remove('err');
  hint.textContent = '✓ Payoneer Program ID saved — checkout button is now active!';
  // Update notice visibility
  const notice = document.getElementById('payoneer-not-configured');
  if (notice) notice.style.display = 'none';
  setTimeout(()=>hint.textContent='', 3500);
}

function loadPayoneerId() {
  const id = localStorage.getItem('sole_payoneer_program_id') || '';
  const notice = document.getElementById('payoneer-not-configured');
  if (!id && notice) notice.style.display = 'block';
  else if (notice) notice.style.display = 'none';
}

// Drop-zone shake animation for missing screenshot
function shakeDropZone(method) {
  const zone = document.getElementById('ss-zone-' + method);
  if (!zone) return;
  zone.style.transition = 'border-color .15s';
  zone.style.borderColor = 'var(--red)';
  zone.style.animation = 'ssShake .4s ease';
  setTimeout(() => { zone.style.borderColor = ''; zone.style.animation = ''; }, 1000);
}
// =============================================
// INIT — runs on page load
// =============================================
// (store init skipped - admin page only)



// ADMIN INIT
loadData();
initEmailJs();
updateOrderBadge();
loadPayoneerId();
setDbStatus('saving', 'Connecting to Firebase...');
initFirebase(FIREBASE_CONFIG);
localStorage.setItem('sole_firebase_config', JSON.stringify(FIREBASE_CONFIG));
