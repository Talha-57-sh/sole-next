"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative bg-white pt-16 pb-24 md:pb-8 mt-24">
      {/* Top Gradient Border using Tailwind native classes */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="flex flex-col">
          <span className="font-sans text-3xl font-bold tracking-widest text-text mb-4">SOLE</span>
          <p className="text-sm text-muted leading-relaxed max-w-xs">
            Quality footwear for everyday wear. Browse the collection, order online, and pay your way — COD or mobile wallet.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h5 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-2">Shop</h5>
          <Link href="#products" className="text-sm text-muted hover:text-text transition-colors">All Shoes</Link>
          <Link href="#" className="text-sm text-muted hover:text-text transition-colors">Men&apos;s</Link>
          <Link href="#" className="text-sm text-muted hover:text-text transition-colors">Women&apos;s</Link>
          <Link href="#" className="text-sm text-muted hover:text-text transition-colors">New Arrivals</Link>
        </div>

        <div className="flex flex-col gap-3">
          <h5 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-2">Help</h5>
          <Link href="#" className="text-sm text-muted hover:text-text transition-colors">Track Order</Link>
          <Link href="#" className="text-sm text-muted hover:text-text transition-colors">Return Policy</Link>
          <Link href="#" className="text-sm text-muted hover:text-text transition-colors">WhatsApp Us</Link>
          <Link href="#" className="text-sm text-muted hover:text-text transition-colors">Search</Link>
        </div>

        <div className="flex flex-col gap-3">
          <h5 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-2">Contact</h5>
          <p className="text-sm text-muted">Order on WhatsApp</p>
          <p className="text-sm text-muted">Pakistan</p>
          <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-text transition-colors">Instagram</a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted">
        <span>© 2026 SOLE. All rights reserved.</span>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-text transition-colors">Return Policy</Link>
          <span>·</span>
          <Link href="#" className="hover:text-text transition-colors">Track Order</Link>
        </div>
      </div>
    </footer>
  );
}
