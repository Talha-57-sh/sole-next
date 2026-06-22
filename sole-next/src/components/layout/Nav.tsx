/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, MessageCircle, ShoppingBag, Menu, X, Home, Package } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useSearch } from "@/hooks/useSearch";
import { useWishlist } from "@/context/WishlistContext";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const openSearch = useSearch((s) => s.openSearch);
  const { wishlist } = useWishlist();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border' : 'bg-white/80 backdrop-blur-md border-b border-border'}`}>
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          {/* Mobile: Hamburger & Logo */}
          <div className="flex items-center gap-4 md:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="p-1 text-muted hover:text-text transition-colors">
              <Menu size={24} />
            </button>
            <Link href="/" className="font-sans text-xl font-bold tracking-widest text-text">
              SOLE
            </Link>
          </div>

          {/* Desktop: Logo */}
          <Link href="/" className="hidden md:block font-sans text-2xl font-bold tracking-widest text-text hover:opacity-80 transition-opacity">
            SOLE
          </Link>

          {/* Desktop Search Icon */}
          <div className="hidden md:flex items-center">
            <button 
              onClick={openSearch} 
              className="p-2 text-text flex items-center justify-center rounded-full border border-border bg-background hover:border-accent transition-colors gap-2 px-4"
            >
              <Search size={18} className="text-muted" />
              <span className="text-sm text-muted font-medium">Search...</span>
            </button>
          </div>

          {/* Right Actions */}
          <ul className="flex items-center gap-4">
            {/* Mobile Search Icon */}
            <li className="md:hidden">
              <button onClick={openSearch} className="p-2 text-text flex items-center justify-center rounded-full border border-border bg-background hover:border-accent transition-colors">
                <Search size={18} />
              </button>
            </li>

            <li className="hidden md:block">
              <Link href="/track" className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted hover:text-text transition-colors">
                <Package size={18} />
                <span>Track Order</span>
              </Link>
            </li>

            <li className="hidden md:block">
              <Link href="#" className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted hover:text-text transition-colors">
                <div className="relative">
                  <Heart size={18} />
                  {mounted && wishlist.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  )}
                </div>
                <span>Wishlist</span>
              </Link>
            </li>
            
            <li className="hidden md:block">
              <Link href="#" target="_blank" className="p-2 text-text flex items-center justify-center rounded-full border border-border bg-background hover:border-accent hover:text-accent transition-colors">
                <MessageCircle size={18} />
              </Link>
            </li>
            
            <li className="hidden md:block">
              <button onClick={openCart} className="p-2 text-text flex items-center justify-center rounded-full border border-border bg-background hover:border-accent hover:text-accent transition-colors relative">
                <ShoppingBag size={18} />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Side Drawer (Hamburger Menu) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 left-0 h-full w-[80%] max-w-[300px] bg-white z-[70] shadow-2xl flex flex-col p-6 md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-sans text-2xl font-bold tracking-widest text-text">SOLE</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-muted hover:text-text">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col gap-6">
                <Link href="/#products" className="text-lg font-medium text-text uppercase tracking-widest" onClick={() => setMobileMenuOpen(false)}>Shop Collection</Link>
                <Link href="#" className="text-lg font-medium text-text uppercase tracking-widest" onClick={() => setMobileMenuOpen(false)}>Categories</Link>
                <Link href="/track" className="text-lg font-medium text-text uppercase tracking-widest" onClick={() => setMobileMenuOpen(false)}>Track Order</Link>
                <Link href="#" className="text-lg font-medium text-text uppercase tracking-widest" onClick={() => setMobileMenuOpen(false)}>Return Policy</Link>
              </div>
              <div className="mt-auto pb-8">
                <p className="text-sm text-muted">Need help? Chat with us.</p>
                <a href="#" target="_blank" className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-green text-white rounded-full text-sm font-medium">
                  <MessageCircle size={16} /> WhatsApp Us
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border flex justify-between items-center px-4 py-2 pb-safe">
        <Link href="/" className="flex flex-col items-center gap-1 p-2 text-muted hover:text-accent transition-colors">
          <Home size={22} />
          <span className="text-[10px] uppercase tracking-wider">Home</span>
        </Link>
        <button onClick={openSearch} className="flex flex-col items-center gap-1 p-2 text-muted hover:text-accent transition-colors">
          <Search size={22} />
          <span className="text-[10px] uppercase tracking-wider">Search</span>
        </button>
        <Link href="#" target="_blank" className="flex flex-col items-center gap-1 p-2 text-muted hover:text-accent transition-colors">
          <MessageCircle size={22} />
          <span className="text-[10px] uppercase tracking-wider">Chat</span>
        </Link>
        <button onClick={openCart} className="flex flex-col items-center gap-1 p-2 text-muted hover:text-accent transition-colors relative">
          <ShoppingBag size={22} />
          <span className="text-[10px] uppercase tracking-wider">Cart</span>
          {mounted && itemCount > 0 && (
            <span className="absolute top-1 right-1 bg-accent text-white text-[9px] font-bold w-[14px] h-[14px] rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
