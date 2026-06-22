/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSearch } from "@/hooks/useSearch";

export default function SearchOverlay() {
  const { isOpen, closeSearch, query, setQuery, products, isLoading, error } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Local state for debouncing
  const [localQuery, setLocalQuery] = useState("");

  // Sync local query when overlay opens/closes
  useEffect(() => {
    if (isOpen) {
      setLocalQuery("");
      setQuery("");
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, setQuery]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeSearch]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(localQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [localQuery, setQuery]);

  const handleClear = () => {
    setLocalQuery("");
    inputRef.current?.focus();
  };

  // Filter products
  const filtered = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.tag && p.tag.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-navy/80 backdrop-blur-sm" 
            onClick={closeSearch}
          />

          {/* Search Panel */}
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="relative bg-white w-full rounded-b-2xl shadow-2xl flex flex-col max-h-[80vh]"
          >
            {/* Header / Input */}
            <div className="flex items-center gap-4 px-6 py-6 border-b border-border">
              <Search size={24} className="text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search for a shoe..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xl md:text-2xl text-navy placeholder-muted"
              />
              {localQuery && (
                <button
                  onClick={handleClear}
                  className="p-2 text-muted hover:text-navy transition-colors bg-panel rounded-full"
                >
                  <X size={16} />
                </button>
              )}
              <div className="w-px h-8 bg-border mx-2" />
              <button
                onClick={closeSearch}
                className="text-sm font-bold uppercase tracking-widest text-muted hover:text-navy transition-colors"
              >
                Close
              </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-panel/30">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p>Loading products...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-red">
                  <p className="font-medium">{error}</p>
                  <button 
                    onClick={() => useSearch.getState().fetchProducts()}
                    className="mt-4 text-sm font-bold uppercase underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : query && filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted">
                  <div className="text-4xl mb-4">👟</div>
                  <p>No results found for &quot;{query}&quot;.</p>
                </div>
              ) : query && filtered.length > 0 ? (
                <div className="max-w-4xl mx-auto w-full">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
                    Products ({filtered.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((product) => {
                      const images = product.images?.length ? product.images : (product.img ? [product.img] : []);
                      const coverImg = images[0] || '';
                      
                      // Using Record<string, unknown> cast here in case 'salePrice' was added loosely
                      const hasSale = (product as Record<string, unknown>).salePrice !== undefined;
                      const displayPrice = hasSale ? (product as Record<string, unknown>).salePrice : product.price;

                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.id}`}
                          onClick={closeSearch}
                          className="flex items-center gap-4 p-3 rounded-xl bg-white border border-border hover:border-navy hover:shadow-md transition-all group"
                        >
                          <div className="relative w-16 h-16 rounded-lg bg-panel overflow-hidden flex-shrink-0">
                            {coverImg ? (
                              <Image 
                                src={coverImg} 
                                alt={product.name} 
                                fill 
                                className="object-cover group-hover:scale-105 transition-transform" 
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">👟</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-navy text-sm truncate group-hover:text-blue transition-colors">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-bold text-sm">Rs. {displayPrice.toLocaleString()}</span>
                              {hasSale && (
                                <span className="text-xs text-muted line-through">
                                  Rs. {product.price.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted/50">
                  <Search size={48} className="mb-4 opacity-50" />
                  <p>Start typing to search for products</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
