/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import CartItem from "./CartItem";

const FREE_SHIP_THRESHOLD = 5000;

export default function CartDrawer() {
  const { isDrawerOpen, closeCart, items, cartTotal, itemCount } = useCart();
  const [mounted, setMounted] = useState(false);

  // Hydration guard to prevent Server/Client mismatch for localStorage state
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const remainingForFreeShip = FREE_SHIP_THRESHOLD - cartTotal;
  const progressPercent = Math.min(100, (cartTotal / FREE_SHIP_THRESHOLD) * 100);

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[80]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-[90] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-sans text-xl font-bold tracking-widest text-text flex items-center gap-2">
                <ShoppingBag size={20} /> CART <span className="text-muted text-sm font-normal">({itemCount})</span>
              </h2>
              <button onClick={closeCart} className="p-2 text-muted hover:text-text hover:bg-panel rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Free Shipping Bar */}
            <div className="bg-panel px-6 py-3 border-b border-border">
              {remainingForFreeShip > 0 ? (
                <p className="text-xs text-text mb-2 text-center">
                  🚚 Spend <strong>Rs. {remainingForFreeShip.toLocaleString()}</strong> more to get free shipping
                </p>
              ) : (
                <p className="text-xs text-green font-medium mb-2 text-center">
                  🎉 <strong>You qualify for free shipping!</strong>
                </p>
              )}
              <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-navy h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted gap-4">
                  <ShoppingBag size={48} className="text-border" />
                  <p>Your cart is empty.</p>
                  <button onClick={closeCart} className="px-6 py-2 bg-navy text-white rounded-full text-sm font-medium hover:bg-navy/90 transition-colors">
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {items.map((item) => (
                    <CartItem key={item.cartItemId} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-border bg-white pb-safe">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted uppercase tracking-widest">Subtotal</span>
                  <span className="text-xl font-bold text-navy">Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted mb-4 text-center">Shipping & taxes calculated at checkout.</p>
                <Link 
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full flex items-center justify-center py-4 bg-navy text-white rounded font-bold uppercase tracking-widest hover:bg-navy/90 hover:scale-[1.02] transition-all shadow-lg"
                >
                  Proceed to Checkout
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
