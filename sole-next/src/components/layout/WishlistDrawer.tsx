"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useWishlist } from "@/context/WishlistContext";

export default function WishlistDrawer() {
  const { isWishlistOpen, closeWishlist, wishlist, removeFromWishlist } = useWishlist();
  const [mounted, setMounted] = useState(false);

  // Hydration guard to prevent Server/Client mismatch for localStorage state
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isWishlistOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeWishlist}
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
              <h2 className="font-sans text-xl font-bold tracking-widest text-text flex items-center gap-2 uppercase">
                <Heart size={20} className="text-[#E53935] fill-[#E53935]" /> WISHLIST <span className="text-muted text-sm font-normal uppercase">({wishlist.length})</span>
              </h2>
              <button onClick={closeWishlist} className="p-2 text-muted hover:text-text hover:bg-panel rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {wishlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted gap-4">
                  <Heart size={48} className="text-border" />
                  <p>Your wishlist is empty.</p>
                  <button onClick={closeWishlist} className="px-6 py-2 bg-navy text-white rounded-full text-sm font-medium hover:bg-navy/90 transition-colors uppercase tracking-widest">
                    Discover Styles
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 mt-4">
                  {wishlist.map((product) => {
                    const imageSrc = product.images?.length ? product.images[0] : (product.img || '');
                    return (
                      <div key={product.id} className="flex gap-4 p-4 border border-border rounded-xl bg-panel/30">
                        <Link href={`/product/${product.id}`} onClick={closeWishlist} className="relative w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-border">
                          {imageSrc ? (
                            <Image src={imageSrc} alt={product.name} fill sizes="80px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">👟</div>
                          )}
                        </Link>
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <Link href={`/product/${product.id}`} onClick={closeWishlist} className="font-bold text-navy truncate hover:underline">
                            {product.name}
                          </Link>
                          <span className="text-sm font-semibold text-text mt-1">Rs. {product.price?.toLocaleString()}</span>
                        </div>
                        <button 
                          onClick={() => removeFromWishlist(product.id)}
                          className="self-center p-2 text-muted hover:text-red hover:bg-red/10 rounded-full transition-colors"
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
