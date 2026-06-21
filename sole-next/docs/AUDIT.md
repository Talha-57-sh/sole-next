# SOLE — Phase 0 Audit & Discovery

**Date:** 2026-06-21  
**Scope:** Read-only audit of existing vanilla JS codebase before Next.js migration.  
**Files reviewed:** `files/core.js`, `files/server.js`, `files/store.js`, `files/checkout.js`, `files/admin.js`, all CSS under `files/css/` (+ `files/shared.css`, `files/admin.css`, `files/checkout.css`), `.env.example`, `files/SOLE_Nextjs_Migration_Plan.md`.

---

## Architecture Summary (for context)

| File | Role |
|---|---|
| `core.js` | Shared Firebase init, auth, Firestore CRUD helpers, cart/checkout utilities, reviews, coupons, analytics, wishlist, order tracking |
| `server.js` | Express static file server + Firebase config injection (`/config.js`) |
| `store.js` | Storefront page logic (product grid, cart drawer, PDM modal, hero carousel, search/filter) |
| `checkout.js` | Checkout page logic (order form, payment, coupons, order confirmation) |
| `admin.js` | Admin dashboard (products CRUD, orders, settings, reviews, restock notifications) — also contains duplicated store/checkout helpers |

**Note:** Logic is heavily duplicated across page JS files. `core.js` is the canonical shared layer; page files override or re-implement some functions (e.g. `renderCart`, `placeOrder`, `ssLoadFile`).

---

## Firestore Schema (collections + fields, inferred from code)

### `products` (collection)

| Field | Type (inferred) | Read | Write | Notes |
|---|---|---|---|---|
| `name` | string | ✓ | ✓ | Primary display identifier; used to match cart items on stock decrement |
| `price` | number | ✓ | ✓ | PKR |
| `tag` | string | ✓ | ✓ | Display badge; fallback category label |
| `category` | string | ✓ | ✓ | Optional; used for filtering when present |
| `desc` | string | ✓ | ✓ | Product description |
| `sizes` | number[] | ✓ | ✓ | EU shoe sizes |
| `img` | string | ✓ | ✓ | Legacy single image URL or base64 data URL |
| `images` | string[] | ✓ | ✓ | Multi-image gallery (base64 or external URL) |
| `sizeStock` | map `{ "38": 5, ... }` | ✓ | ✓ | Per-size inventory; preferred stock model |
| `stock` | number | ✓ | ✓ | Legacy aggregate stock; kept in sync with `sizeStock` total |
| `createdAt` | number (ms epoch) | ✓ | ✓ | Set on add/migrate; used for sort order |

**Client-side only:** `_fbId` — Firestore document ID appended locally after snapshot.

**Access patterns:** Realtime `onSnapshot` on entire collection; admin adds via `.add()`, deletes via `.doc(_fbId).delete()`, stock updates via `.update({ sizeStock, stock })`.

---

### `orders` (collection)

Document ID = order `id` (e.g. `ORD-XXXX`).

| Field | Type (inferred) | Read | Write | Notes |
|---|---|---|---|---|
| `id` | string | ✓ | ✓ | Same as doc ID |
| `date` | string (ISO) | ✓ | ✓ | Order timestamp |
| `customer.fname` | string | ✓ | ✓ | Sanitised on checkout |
| `customer.lname` | string | ✓ | ✓ | |
| `customer.email` | string | ✓ | ✓ | Used for order tracking query |
| `customer.phone` | string | ✓ | ✓ | |
| `customer.address` | string | ✓ | ✓ | Checkout builds from address + apartment + city + postal |
| `items` | array | ✓ | ✓ | `{ name, price, size, productIdx?, img? }` — no `qty` field (always 1 per line) |
| `subtotal` | number | ✓ | ✓ | |
| `discount` | number | ✓ | ✓ | From coupon |
| `couponCode` | string | ✓ | ✓ | Empty string if none |
| `deliveryCharge` | number | ✓ | ✓ | |
| `total` | number | ✓ | ✓ | `subtotal + deliveryCharge - discount` |
| `payment` | string | ✓ | ✓ | `cod`, `easypaisa`, `sadapay`, `payoneer`, `bank` |
| `paymentRef` | string | ✓ | ✓ | e.g. `"Payoneer"` |
| `paymentScreenshot` | string (base64) | ✓ | ✓ | Stored inline in Firestore doc — can be large |
| `status` | string | ✓ | ✓ | `pending`, `confirmed`, `shipped`, `cancelled`, `cancellation_requested` |
| `cancelRequested` | boolean | ✓ | ✓ | Set by customer cancellation request |
| `cancelRequestDate` | string (ISO) | ✓ | ✓ | |
| `trackingNumber` | string | ✓ | ? | Read in track UI; **not written anywhere in JS** |

**Access patterns:** Realtime `onSnapshot`; writes via `.doc(orderId).set()`; status updates via `.update({ status })`; customer track by email (`.where('customer.email', '==', email).orderBy('date', 'desc')`) or by doc ID.

---

### `settings` → doc `store`

| Field | Type (inferred) | Read | Write | Notes |
|---|---|---|---|---|
| `deliveryCharge` | number | ✓ | ✓ | PKR flat delivery fee |
| `waNumber` | string | ✓ | ✓ | WhatsApp contact |
| `storeCity` | string | ✓ | ✓ | Footer display |
| `instagram` | string (URL) | ✓ | ✓ | Footer link |
| `returnPolicy` | string (HTML) | ✓ | ✓ | Injected into policy modal |
| `coupons` | object or JSON string | ✓ | ? | **Legacy** — superseded by `coupons` collection |
| `freeDeliveryThreshold` | number | ✓ | ? | Loaded into client var; **no admin UI to save** found |
| `usdRate` | number | ✓ | ? | Currency toggle removed; still loaded |
| `payment.accountName` | string | ✓ | ✓ | |
| `payment.easypaisaNumber` | string | ✓ | ✓ | |
| `payment.sadapayNumber` | string | ✓ | ✓ | |
| `payment.bankName` | string | ✓ | ✓ | |
| `payment.bankAccount` | string | ✓ | ✓ | |
| `emailjs.publicKey` | string | ✓ | ✓ | |
| `emailjs.serviceId` | string | ✓ | ✓ | |
| `emailjs.templateId` | string | ✓ | ✓ | |

**Access:** Realtime `onSnapshot` on `settings/store`; partial merges via `.set({...}, { merge: true })`.

---

### `reviews` (collection)

| Field | Type | Read | Write | Notes |
|---|---|---|---|---|
| `productName` | string | ✓ | ✓ | Links review to product by name |
| `author` | string | ✓ | ✓ | Sanitised |
| `text` | string | ✓ | ✓ | Sanitised |
| `rating` | number (1–5) | ✓ | ✓ | |
| `date` | string (ISO) | ✓ | ✓ | |
| `approved` | boolean | ✓ | ✓ | Default `false`; admin must approve |

**Access:** Public reads filtered `where('productName','==',name).where('approved','==',true)`; admin reads all, approves/deletes.

---

### `coupons` (collection)

Document ID appears to be the coupon **code**.

| Field | Type | Read | Write | Notes |
|---|---|---|---|---|
| `active` | boolean | ✓ | ? | Queried `where('active','==',true)` |
| `type` | string | ✓ | ? | `'pct'` or `'flat'` (from `calcDiscount`) |
| `value` | number | ✓ | ? | Percentage or flat PKR amount |
| `label` | string | ✓ | ? | Display text |

**Note:** No admin UI or write path for coupons found in JS — coupons may be managed directly in Firestore console.

---

### `notifications` (collection) — restock requests

| Field | Type | Read | Write | Notes |
|---|---|---|---|---|
| `productName` | string | ✓ | ✓ | |
| `email` | string | ✓ | ✓ | |
| `date` | string (ISO) | ✓ | ✓ | **Written by storefront `notifyMe()`** |
| `timestamp` | ? | ✓ | ✗ | **Read by admin `renderNotifications()`** — field mismatch (see Open Questions) |
| `notified` | boolean | ✓ | ✓ | Admin marks as notified |

---

### `analytics` (collection)

**Doc `summary`:**
| Field | Type | Read | Write |
|---|---|---|---|
| `pageviews` | number (increment) | — | ✓ |
| `lastVisit` | string (ISO) | — | ✓ |

**Doc `products`:**
| Field | Type | Read | Write |
|---|---|---|---|
| `views_{sanitizedProductName}` | number (increment) | — | ✓ |

---

### localStorage keys (not Firestore, but critical for migration)

| Key | Purpose |
|---|---|
| `sole_products`, `sole_orders`, `sole_cart`, `sole_wishlist` | Offline/cache fallback |
| `sole_firebase_config` | Firebase client config (also from `/config.js`) |
| `sole_delivery_charge`, `sole_wa_number`, `sole_store_city`, `sole_instagram` | Store settings cache |
| `sole_payment` | Payment account details cache |
| `sole_emailjs` | EmailJS config cache |
| `sole_coupons` | Coupons cache |
| `sole_payoneer_program_id` | Payoneer checkout program ID (**localStorage only**, not synced to Firestore) |
| `sole_last_order_ts` | Client-side order rate limit (60s cooldown) |
| `sole_pending_reviews`, `sole_notify_requests` | Offline fallbacks when Firebase unavailable |

---

### Admin auth (Firebase Auth — not Firestore)

- **Method:** Firebase Auth email/password (`signInWithEmailAndPassword`)
- **Session:** `SESSION` persistence
- **Gate:** Any authenticated Firebase user unlocks admin (`adminUnlocked = true` → `showDashboard()`)
- **No custom claims or hardcoded UID check** found in code
- Password change via `currentUser.updatePassword()` in admin settings
- Legacy SHA-256 password hash constants remain but are unused

---

### Stock decrement behavior

- **Not atomic.** On `placeOrder()`, client decrements `sizeStock` / `stock` in memory, then calls `dbUpdateSizeStock()` per product — separate Firestore `.update()` calls, no transaction.
- **Race condition risk:** Two concurrent orders can oversell.
- **Recommendation for Phase 6:** Move order creation + stock decrement to a Next.js Route Handler with Firestore transaction or Firebase Admin SDK.

---

### Payment methods (actual vs migration plan)

Migration plan mentions JazzCash/EasyPaisa. **Actual code uses:**
- `cod` — Cash on Delivery
- `easypaisa` — Easypaisa (screenshot required)
- `sadapay` — SadaPay (screenshot required)
- `payoneer` — Payoneer (screenshot + external checkout link)
- `bank` — Bank Transfer (screenshot required)

EmailJS sends confirmation emails **client-side** when admin sets order status to `confirmed` (checkout flow); older `store.js`/`admin.js` `placeOrder` also called `sendOrderConfirmationEmail` immediately.

---

## Environment Variables

From `.env.example` (loaded by `server.js` via `dotenv`, injected into client as `window.__SOLE_CONFIG`):

| Variable | Used by | Next.js equivalent |
|---|---|---|
| `FIREBASE_API_KEY` | `server.js` → `/config.js` → client Firebase init | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `FIREBASE_AUTH_DOMAIN` | same | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `FIREBASE_PROJECT_ID` | same | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `FIREBASE_STORAGE_BUCKET` | same | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `FIREBASE_MESSAGING_SENDER_ID` | same | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `FIREBASE_APP_ID` | same | `NEXT_PUBLIC_FIREBASE_APP_ID` |

**Not in `.env.example` but configured elsewhere:**
- **EmailJS** — stored in Firestore `settings/store.emailjs` and cached in `localStorage` (`sole_emailjs`); configured via admin UI
- **Payoneer Program ID** — `localStorage` only (`sole_payoneer_program_id`)
- **Firebase config fallback** — admin can paste config into UI → saved to `localStorage` (`sole_firebase_config`)

No server-side secrets beyond Firebase client config. No webhook secrets, no EmailJS private keys on server.

---

## server.js Purpose & Recommended Next.js Equivalent

### What it actually does

`server.js` is a **minimal Express 5 static file server** (port 3000). It is **not** a payment webhook, email proxy, or order API.

| Route | Purpose |
|---|---|
| `GET /config.js` | Returns JS that sets `window.__SOLE_CONFIG` with Firebase env vars from `.env` |
| `GET /` | Serves `store.html` |
| `GET /checkout` | Serves `checkout.html` |
| `GET /admin` | Serves `admin.html` |
| `express.static(__dirname)` | Serves all files in `files/` (JS, CSS, HTML, images) |

**All business logic runs client-side** in the browser via Firebase client SDK + EmailJS.

### Recommended Next.js equivalent

| Current | Next.js replacement |
|---|---|
| `/config.js` dynamic injection | `NEXT_PUBLIC_*` env vars in `.env.local` — no runtime config endpoint needed |
| Static HTML pages | App Router pages: `app/page.tsx`, `app/checkout/page.tsx`, `app/admin/page.tsx` |
| `express.static` | Next.js built-in static serving + `public/` for assets |
| *(none exists today)* | **New** Route Handlers needed for: atomic order placement + stock decrement, optional server-side EmailJS/Resend |

**Conclusion:** `server.js` does **not** need to survive as a separate microservice. It can be fully replaced by Next.js static/page serving. The migration plan's question about webhooks/API routes is moot for the current codebase — those capabilities would be **net-new** improvements, not ports of existing server logic.

---

## Custom Animations to Recreate

Animations found via `@keyframes` across CSS files. Primary sources: `files/css/animations.css`, `files/css/hero.css`, `files/css/modals.css`, `files/css/payment.css`, `files/admin.css`, `files/css/responsive.css`.

Also note **JS-driven animations** (IntersectionObserver scroll-reveal, inline style transitions on product cards) in `core.js` — these should become Framer Motion `whileInView` / `staggerChildren`.

### Hero & landing (`animations.css`, `hero.css`)

| Keyframe | Effect | Framer Motion equivalent |
|---|---|---|
| `heroTextSlide` | Opacity + translateY + skewY entrance | `initial={{ opacity: 0, y: 80, skewY: 4 }}` → `animate` |
| `heroFadeIn` | Fade up | `initial={{ opacity: 0, y: 24 }}` |
| `heroScaleIn` | Scale + rotate entrance | `initial={{ scale: 0.7, rotate: -8 }}` |
| `proFadeUp` | Fade up (hero.css) | Same as heroFadeIn |
| `float` | Gentle Y oscillation + rotate (hero.css) | `animate={{ y: [0, -20, 0] }}` with `repeat: Infinity` |
| `kenBurns` | Slow zoom/pan on background | `animate={{ scale: 1.1, x: '-2%', y: '2%' }}` over long duration |
| `scrollBounce` | Scroll indicator bounce | `y` keyframes loop |
| `orbFloat1/2/3` | Background orb drift | `x`/`y`/`scale` keyframe loops |
| `auroraShift` | Gradient background position shift | Animated gradient or `backgroundPosition` keyframes |
| `glowPulse` | Box-shadow pulse | `boxShadow` keyframes or CSS variable animation |

### UI interactions

| Keyframe | Used for | Framer Motion equivalent |
|---|---|---|
| `cartPulse` | Add-to-cart button (`.add-btn.pulsed`) | `whileTap={{ scale: 1.3 }}` |
| `heartPop` | Wishlist toggle (`.wishlist-btn.popping`) | `whileTap={{ scale: 1.4 }}` |
| `pillPop` | Category pill selection | `whileTap` spring |
| `pop` | Generic scale pop (payment.css) | `whileTap` spring |
| `shimmer` / `skeletonShimmer` | Loading skeleton | Shimmer overlay component |
| `accentIn` | ScaleX line reveal (section headers) | `scaleX` from 0 → 1 |
| `geoSpin` / `geoPulse` | Decorative geometry (products.css) | `rotate` / `opacity` loops |

### Modals & drawers (`modals.css`)

| Keyframe | Used for | Framer Motion equivalent |
|---|---|---|
| `pdmFade` | Product detail overlay backdrop | `AnimatePresence` opacity |
| `pdmUp` | Product detail modal entrance | `y: 24 → 0` + opacity |
| `drawerIn` | Cart drawer slide from right | `x: '100%' → 0` |
| `slideUp` / `bottomSheetIn` | Mobile bottom sheets | `y: '100%' → 0` |
| `trackIn` | Track order / overlay content | `y: 24 → 0` + opacity |
| `orderSlideIn` | Order section entrance | `y: 40 → 0` + opacity |
| `fadeIn` | Payment detail panels | opacity + slight y |

### Utility

| Keyframe | Used for |
|---|---|
| `spin` | Loading spinners (responsive.css, payment.css, admin.css) |
| `ssShake` | Payment screenshot drop-zone validation shake (admin.css) |
| `pageIn` | Page fade-in on load |

### Scroll-reveal (CSS classes + JS, not @keyframes)

Classes `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale` in `animations.css` — toggled to `.revealed` by `initScrollReveal()` IntersectionObserver in `core.js`. Product cards also use inline JS transitions in `animateProductCards()` and `initProductCardReveal()`.

**Also JS-only (no @keyframes):**
- Hero video slider (`initHeroSlider` in store.js) — class toggle on `#vi-vid-1/2/3`
- Hero polaroid carousel (`initHeroCarousel` in store.js) — DOM manipulation, swipe/autoplay
- Nav scroll effect — `.site-nav.scrolled` class on scroll
- PDM image zoom — CSS custom properties `--zoom-x`, `--zoom-y` on mousemove

### Missing keyframe

- `slideIn` — referenced inline in `admin.js` email success banner but **not defined in any CSS file** (likely falls back to no animation).

---

## Open Questions / Anything Unclear

1. **Admin access control:** Any Firebase Auth user can access admin. Is there a single admin account created manually in Firebase Console, or should Next.js migration add UID allowlist / custom claims?

2. **Stock atomicity:** Current stock decrement is non-transactional client-side. Should Phase 6 fix this (recommended) or preserve current behavior?

3. **Product images hosting:** Images are stored as **base64 data URLs inside Firestore product documents** (admin upload, max ~5–6 images, compressed). Hero carousel uses local `images/hero/*.png`. Firebase Storage is configured in env but **not used in JS**. Confirm whether to migrate to Firebase Storage or keep base64.

4. **`notifications` schema mismatch:** Storefront writes `date`; admin reads `timestamp` and orders by `timestamp`. Restock tab may show "Unknown date" or fail the query if Firestore index/rules reject it. Which field is canonical?

5. **`trackingNumber` on orders:** Displayed in order tracking UI but never set in any JS write path. Is this set manually in Firestore console?

6. **Coupons management:** Loaded from `coupons` collection but no admin UI to create/edit coupons. Are coupons managed externally?

7. **`freeDeliveryThreshold`:** Loaded from settings but hardcoded `FREE_SHIP = 5000` in store.js cart drawer. Which value is intended?

8. **Payoneer Program ID:** Stored in localStorage only — not synced to Firestore. Will break across devices/browsers. Intentional?

9. **File duplication:** `store.js`, `checkout.js`, and `admin.js` duplicate large portions of each other and `core.js`. During migration, which file is the source of truth for divergent implementations (e.g. `renderCart` differs between store vs checkout; `placeOrder` in checkout has sanitisation/rate-limit/coupon support that admin.js version lacks)?

10. **`paymentScreenshot` in Firestore:** Full base64 images stored in order documents. Firestore 1MB doc limit applies. Is this acceptable at current order volume, or should uploads move to Storage?

11. **Firestore security rules:** Not present in this repo. Rules must be reviewed before tightening client/server split in Phase 8.

12. **Email timing:** Checkout sends email on admin "confirmed" status; older code paths send immediately on order place. Which behavior should Next.js preserve?

13. **Order status `cancellation_requested`:** Used in customer cancel flow but admin status buttons only offer pending/confirmed/shipped/cancelled — no UI to handle cancellation requests.

14. **Reviews on storefront:** Review submission exists in `core.js` but store.js PDM explicitly says "Reviews removed" — are public reviews in scope for migration?

15. **`category` vs `tag`:** Products use both; filtering treats them interchangeably. Should Next.js normalize to a single `category` field?

16. **Express server location:** `server.js` loads `.env` from parent dir (`../.env`) but lives in `files/`. Confirm deployment runs from repo root with `.env` at root (matches current setup).

---

## core.js Function Index (reference)

<details>
<summary>All functions defined in core.js (~100 functions)</summary>

**Config & store settings:** `loadStorePaymentCache`, `applyStoreSettings`

**Auth:** `initAuth`, `doLogin`, `adminSignOut`, `sha256`, `initPasswordHash`

**EmailJS:** `loadEmailJsConfig`, `saveEmailJsConfig`, `initEmailJs`, `sendOrderConfirmationEmail`, `testEmailJs`

**Firebase / Firestore:** `setDbStatus`, `loadFirebaseConfig`, `initFirebase`, `startRealtimeListeners`, `migrateLocalProductsToFirebase`, `saveProducts`, `saveOrders`, `dbAddProduct`, `dbDeleteProduct`, `dbSaveOrder`, `dbUpdateOrderStatus`, `dbDeleteAllOrders`, `dbUpdateSizeStock`, `dbSaveDeliveryCharge`, `saveFirebaseConfig`, `disconnectFirebase`, `loadData`

**Utilities:** `escHtml`, `sanitiseInput`, `sanitisePhone`, `slugify`, `genId`, `fmtPrice`, `copyText`, `calcDiscount`

**Cart & checkout:** `saveCartToStorage`, `removeFromCart`, `renderPaySummary`, `checkStockBeforeOrder`, `checkRateLimit`, `setRateLimitTimestamp`, `goBackToDelivery`, `resetOrder`, `showOrderConfirmation`, `closeOrderConf`, `openPayoneerCheckout`, `validateField`, `setSubmitLoading` (stub in core; implemented in page files)

**Coupons:** `applyCoupon`, `removeCoupon`, `loadCouponsFromSettings`, `loadCouponsFromCollection`

**Product detail modal (PDM):** `openPdm` (stub), `closePdm`, `pdmClickOutside`, `pdmNav`, `pdmGoTo`, `pdmSelectSize`, `renderPdmGallery`, `initPdmZoom`, `enhanceAddToCartAnimation`

**Reviews:** `starHtml`, `renderReviewsSection`, `loadReviewsForProduct`, `preloadVisibleReviews`, `submitReview`, `setReviewRating`, `hoverReviewStars`, `unhoverReviewStars`, `getProductRating`

**Wishlist:** `loadWishlist`, `toggleWishlist`, `saveWishlist`, `renderWishlist`, `openWishlist`, `closeWishlist`, `removeWishlistItem`, `updateWishlistBadge`, `enhanceWishlistAnimation`

**Order tracking:** `openTrack`, `closeTrack`, `switchTrackTab`, `trackByEmail`, `trackById`, `renderTrackResult`, `requestCancelOrder`

**Screenshots (payment):** `ssLoadFile`, `ssFileSelect`, `ssDrop`, `ssDragOver`, `ssDragLeave`, `showSsPreview`, `resetSs`, `removeSs`, `openSsLightbox`, `openSsLightboxFromSrc`, `closeSsLightbox`

**Store UI:** `renderCategoryBar`, `filterCategory`, `animateProductCards`, `initProductCardReveal`, `initScrollReveal`, `applyRevealClasses`, `initNavScrollEffect`, `shareProduct`, `notifyMe`

**Analytics:** `trackPageView`, `trackProductView`

**Policy & size guide:** `openPolicy`, `closePolicy`, `openSizeGuide`, `closeSizeGuide`

**WhatsApp:** `setWaLinks`, `waSyncFromFirebase`, `syncFooterContact` (stub)

**Admin stubs (implemented in admin.js):** `switchTab`, `clearAllOrders`, `renderOrders`, `showDashboard`, `closeAdmin`, `openAdmin`, `saveDeliveryCharge`, `addProduct`, `deleteProduct`, `renderAdminProducts`, `renderOrderStats`, `loadPayoneerId`

**Misc:** `updateOrderBadge`, `updateTabBarBadges`, `toggleCurrency` (removed), `updateFreeDeliveryBar` (no-op stub)

</details>

---

*Phase 0 complete. No code was modified. Ready for review before Phase 1 scaffolding.*
