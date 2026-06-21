# SOLE — Vanilla JS → Next.js Migration Plan
**For: Cursor AI execution**
**Stack target: Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion + Firebase (kept)**

---

## 0. Goal

Migrate SOLE from its current multi-page vanilla HTML/CSS/JS architecture to a Next.js + TypeScript + Tailwind + Framer Motion frontend, while **keeping Firebase (Firestore + Auth) as the backend**. No functionality should be lost. The site has three surfaces: storefront, checkout, and admin.

**Non-negotiables:**
- Firestore data structure / collections must not be broken — read existing queries before writing new ones.
- `.env` Firebase config keys carry over as-is (rename to `NEXT_PUBLIC_*` where used client-side).
- Every page must be migrated, tested, and visually compared against the old version before the old file is deleted.
- Do not delete any old file until its Next.js replacement is confirmed working.

---

## Phase 0 — Audit & Discovery (do this FIRST, before writing any new code)

Cursor should read and summarize the following before touching anything:

1. `core.js` — what shared logic lives here? (likely Firebase init, cart utilities, shared helpers)
2. `server.js` — is this a Node/Express server? What routes does it expose? (likely candidates: EmailJS proxy, payment webhook, order confirmation). This determines whether it becomes a Next.js API route or stays a separate microservice.
3. `store.js`, `checkout.js`, `admin.js` — map out what DOM elements/Firestore calls each file touches.
4. All `.css` files — note any custom animations/keyframes in `animations.css` and `hero.css` specifically, since these need Framer Motion equivalents.
5. `.env.example` — list every environment variable currently in use.

**Output of Phase 0:** a short `AUDIT.md` file (Cursor should generate this) listing:
- All Firestore collections/fields currently read or written, inferred from the JS files
- All environment variables
- What `server.js` actually does and whether it needs to survive independently

Do not proceed to Phase 1 until this audit is done — the data model in Phase 2 depends on it.

---

## Phase 1 — Project Scaffolding

```bash
npx create-next-app@latest sole-next --typescript --tailwind --app --src-dir --import-alias "@/*"
cd sole-next
npm install framer-motion firebase
npm install -D @types/node
```

Target folder structure:

```
sole-next/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← root layout, fonts, global providers
│   │   ├── page.tsx                ← homepage (was store.html landing)
│   │   ├── globals.css             ← Tailwind directives + any non-utility CSS
│   │   ├── product/
│   │   │   └── [id]/page.tsx       ← product detail page
│   │   ├── checkout/
│   │   │   └── page.tsx            ← checkout.html
│   │   └── admin/
│   │       ├── layout.tsx          ← admin-only auth guard
│   │       └── page.tsx            ← admin.html
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Nav.tsx             ← nav.css
│   │   │   └── Footer.tsx          ← footer.css
│   │   ├── store/
│   │   │   ├── Hero.tsx            ← hero.css
│   │   │   ├── ProductCard.tsx     ← products.css
│   │   │   ├── ProductGrid.tsx
│   │   │   └── Filters.tsx
│   │   ├── cart/
│   │   │   ├── CartDrawer.tsx      ← cart.css
│   │   │   └── CartItem.tsx
│   │   ├── checkout/
│   │   │   └── PaymentForm.tsx     ← payment.css
│   │   └── ui/
│   │       └── Modal.tsx           ← modals.css
│   ├── lib/
│   │   ├── firebase.ts             ← Firebase client init (from core.js)
│   │   ├── firebaseAdmin.ts        ← Firebase Admin SDK (server-only, for admin/order ops)
│   │   ├── types.ts                ← Product, Order, User, CartItem interfaces
│   │   └── cart.ts                 ← cart logic (from core.js)
│   └── hooks/
│       ├── useCart.ts
│       └── useAuth.ts
├── .env.local
└── package.json
```

**Task list:**
- [ ] Scaffold project with command above
- [ ] Set up `tailwind.config.ts` with SOLE's brand colors/fonts (pull from `shared.css` and `base.css`)
- [ ] Create `.env.local` with Firebase config (mirror `.env.example`, prefix client-exposed vars with `NEXT_PUBLIC_`)
- [ ] Set up `lib/firebase.ts` — port Firebase init logic from `core.js`
- [ ] Confirm Firebase connects (simple test read from Firestore in a temporary page)

---

## Phase 2 — Data Layer & Types

Based on the Phase 0 audit, define TypeScript interfaces in `lib/types.ts`. Example shape (Cursor should adjust based on actual Firestore audit, not assume this blindly):

```typescript
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  images: string[];
  sizes: { size: string; stock: number }[];
  category: string;
  description: string;
}

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  paymentMethod: 'cod' | 'jazzcash' | 'easypaisa';
  createdAt: Timestamp;
}
```

**Task list:**
- [ ] Define all interfaces matching actual Firestore documents found in Phase 0
- [ ] Write data-fetching functions in `lib/` (e.g. `getProducts()`, `getProduct(id)`, `createOrder()`) — these wrap Firestore calls so components never call Firestore directly
- [ ] Decide: client-side Firestore reads (public product data) vs. server-side via Firebase Admin SDK (order writes, admin operations) — public catalog = client SDK is fine; anything involving stock decrement or payment confirmation = server-side via Next.js Route Handlers for atomicity

---

## Phase 3 — Shared Layout (Nav + Footer)

**Task list:**
- [ ] Build `Nav.tsx` — port markup/logic from current nav, convert `nav.css` to Tailwind classes
- [ ] Build `Footer.tsx` — same approach for `footer.css`
- [ ] Wire both into `app/layout.tsx` so they persist across all routes (this alone replaces duplicated markup across `store.html`, `checkout.html`, `admin.html`)
- [ ] Add cart icon with item-count badge in Nav, wired to `useCart()` hook (build this hook now, even as a stub)
- [ ] Mobile responsiveness: hamburger menu with Framer Motion slide-in animation

---

## Phase 4 — Storefront (highest priority — biggest UI/UX payoff)

**Task list:**
- [ ] `Hero.tsx` — recreate hero section; replace any CSS keyframe animation in `hero.css` with Framer Motion (`motion.div` with `initial`/`animate`/`whileInView`)
- [ ] `ProductCard.tsx` — image, name, price, hover state (scale/shadow via Framer Motion `whileHover`)
- [ ] `ProductGrid.tsx` — responsive grid (Tailwind `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), staggered entrance animation using Framer Motion `staggerChildren`
- [ ] `Filters.tsx` — size/brand/price filters, client-state managed (no need for Firestore round-trip per filter change — fetch all products once, filter client-side, unless catalog is large)
- [ ] `app/page.tsx` — assemble homepage: Hero + Filters + ProductGrid
- [ ] `app/product/[id]/page.tsx` — product detail: image gallery (swipeable on mobile), size selector, add-to-cart button with Framer Motion feedback animation
- [ ] Image optimization: replace all `<img>` with `next/image`, configure `next.config.js` for Firebase Storage domain if images are hosted there

**Visual QA checkpoint:** Compare side-by-side with old `store.html` before moving on.

---

## Phase 5 — Cart

**Task list:**
- [ ] `useCart.ts` hook — manages cart state (consider `zustand` for global state if Context gets unwieldy: `npm install zustand`)
- [ ] Persist cart in `localStorage` so it survives refresh (port this logic from `core.js` if it already exists)
- [ ] `CartDrawer.tsx` — slide-in panel from the right, Framer Motion `AnimatePresence` for enter/exit
- [ ] `CartItem.tsx` — quantity adjuster, remove button, line-item total
- [ ] Cart total calculation, empty-state UI

---

## Phase 6 — Checkout (test thoroughly — this touches money)

**Task list:**
- [ ] `app/checkout/page.tsx` — order summary + `PaymentForm.tsx`
- [ ] `PaymentForm.tsx` — shipping details form, payment method selector (COD / JazzCash / EasyPaisa)
- [ ] Decide and implement: does `server.js`'s current responsibility (from Phase 0 audit) become a Next.js Route Handler (`app/api/.../route.ts`) or stay a separate service? If it handles payment verification or webhooks, it likely needs to stay server-side regardless — port it into `app/api/checkout/route.ts` using Firebase Admin SDK for the order write, so stock decrement + order creation happen atomically (Firestore transaction).
- [ ] Order confirmation: port email logic (EmailJS or migrate to Resend — your call, EmailJS works fine if it's already working)
- [ ] Order confirmation page/state after successful checkout

**This phase needs real end-to-end testing**: place a test order, confirm Firestore writes correctly, confirm stock decrements, confirm email sends.

---

## Phase 7 — Admin (lowest risk, do last)

**Task list:**
- [ ] `app/admin/layout.tsx` — auth guard (redirect non-admins using Firebase Auth custom claims or a hardcoded admin UID check, whichever the current `admin.js` already does)
- [ ] `app/admin/page.tsx` — product CRUD interface, order list/status updates
- [ ] Reuse `Modal.tsx` (from `modals.css`) for add/edit product forms
- [ ] Keep this UI simple — it's internal-only, doesn't need the same animation polish as the storefront

---

## Phase 8 — Cleanup & Deploy

**Task list:**
- [ ] Run Lighthouse audit (target 90+ on Performance, Accessibility)
- [ ] Confirm every old `.html`/`.css`/`.js` file has a working Next.js replacement
- [ ] Delete old vanilla files only after full QA pass
- [ ] Deploy to Vercel, connect custom domain
- [ ] Set production environment variables in Vercel dashboard (mirror `.env.local`)
- [ ] Set up Firebase security rules review — confirm rules still match the new client/server split (e.g. if order writes moved server-side, tighten Firestore rules so clients can no longer write orders directly)

---

## Component Mapping Reference

| Old file | New location |
|---|---|
| `animations.css` | Framer Motion variants (inline in components) |
| `base.css` | `globals.css` (Tailwind base layer) + `tailwind.config.ts` theme |
| `cart.css` | `components/cart/CartDrawer.tsx`, `CartItem.tsx` |
| `footer.css` | `components/layout/Footer.tsx` |
| `hero.css` | `components/store/Hero.tsx` |
| `modals.css` | `components/ui/Modal.tsx` |
| `nav.css` | `components/layout/Nav.tsx` |
| `payment.css` | `components/checkout/PaymentForm.tsx` |
| `products.css` | `components/store/ProductCard.tsx`, `ProductGrid.tsx` |
| `responsive.css` | Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — no separate file needed |
| `shared.css` | `globals.css` |
| `core.js` | `lib/firebase.ts`, `lib/cart.ts`, `hooks/useCart.ts` |
| `server.js` | `app/api/*/route.ts` (or kept standalone — confirm in Phase 0) |
| `store.html` + `store.js` | `app/page.tsx`, `app/product/[id]/page.tsx` |
| `checkout.html` + `checkout.js` | `app/checkout/page.tsx` |
| `admin.html` + `admin.js` | `app/admin/page.tsx` |

---

## Working Rules for Cursor

1. **One phase per work session.** Don't jump ahead to Phase 4 components before Phase 0-2 are confirmed working.
2. **Never guess Firestore schema** — read the actual queries in the old JS files before defining types. If a field's purpose is unclear, flag it as a question rather than assuming.
3. **Commit after each completed phase** with a clear message (e.g. `"Phase 3: shared layout complete"`) so progress can be rolled back cleanly if something breaks.
4. **Don't delete old files preemptively.** Old vanilla files stay until their replacement is visually and functionally confirmed.
5. **Flag anything destructive** (schema changes, security rule changes, deleting files) before executing — ask first.
6. **Mobile-first.** Build every component at mobile width first, then scale up with Tailwind breakpoints — don't build desktop-first and retrofit.

---

## Open Questions to Resolve During Phase 0

- [ ] What does `server.js` actually do? (proxy / webhook / something else)
- [ ] Is stock currently decremented atomically anywhere, or is that a gap to fix during migration?
- [ ] Where are product images hosted — Firebase Storage, or local `images/` folder? (affects `next.config.js` image domain setup)
- [ ] How is admin access currently gated in `admin.js`? (custom claims, hardcoded UID, separate login?)
