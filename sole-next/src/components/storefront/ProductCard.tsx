"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/types";
import { useCart } from "@/hooks/useCart";

interface Props {
  product: Product;
  index: number;
}

export default function ProductCard({ product, index }: Props) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const images = product.images?.length ? product.images : (product.img ? [product.img] : []);
  const coverImg = images[0] || '';

  const ss = product.sizeStock || {};
  const hasSizeStock = Object.keys(ss).length > 0;

  const availableSizes = product.sizes.filter(s => {
    if (!hasSizeStock) return true;
    const qty = ss[s];
    return qty === undefined || qty > 0;
  });

  const isOos = hasSizeStock && availableSizes.length === 0;

  const totalStock = hasSizeStock
    ? product.sizes.reduce((sum, s) => sum + (ss[s] || 0), 0)
    : (typeof product.stock === 'number' ? product.stock : null);

  const isLow = !isOos && totalStock !== null && totalStock > 0 && totalStock <= 5;

  const handleAddToCart = () => {
    if (isOos) return;
    if (!selectedSize) {
      alert("Please select a size first.");
      return;
    }
    
    if (hasSizeStock && ss[selectedSize] !== undefined && ss[selectedSize] <= 0) {
      alert(`Sorry, size EU ${selectedSize} is out of stock.`);
      return;
    }

    addToCart(product, selectedSize);
  };

  return (
    <div className={`relative flex flex-col bg-white border border-border rounded-xl p-4 transition-all hover:shadow-xl hover:-translate-y-1 ${isOos ? 'opacity-70 grayscale-[0.5]' : ''}`}>
      {/* Banners */}
      <div className="absolute top-4 left-4 z-10">
        {isOos ? (
          <span className="bg-red text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">Out of Stock</span>
        ) : isLow ? (
          <span className="bg-orange text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">Only {totalStock} left!</span>
        ) : null}
      </div>

      {/* Image */}
      <div className="relative w-full aspect-square bg-panel rounded-lg overflow-hidden mb-4 cursor-pointer group">
        {coverImg ? (
          <Image src={coverImg} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">👟</div>
        )}
      </div>

      <div className="flex flex-col flex-1">
        <span className="text-[10px] uppercase tracking-widest text-muted mb-1 font-semibold">{product.tag || product.category || 'Footwear'}</span>
        <h3 className="font-bold text-navy text-sm md:text-base leading-tight mb-2 truncate cursor-pointer">{product.name}</h3>
        <p className="text-xs text-muted line-clamp-2 mb-4 flex-1">{product.desc}</p>

        {isOos && (
          <div className="text-xs text-red font-medium mb-3 flex items-center gap-1">
            <span>⛔</span> Currently unavailable
          </div>
        )}

        {/* Sizes */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {product.sizes.map(s => {
            const qty = hasSizeStock ? (ss[s] !== undefined ? ss[s] : -1) : -1;
            const sizeOos = hasSizeStock && qty === 0;
            const sizeLow = hasSizeStock && qty > 0 && qty <= 3;
            
            return (
              <button
                key={s}
                disabled={isOos || sizeOos}
                onClick={() => setSelectedSize(s)}
                title={sizeOos ? `Size ${s} out of stock` : sizeLow ? `Only ${qty} left` : ''}
                className={`w-8 h-8 rounded text-xs font-medium border flex items-center justify-center transition-colors
                  ${isOos || sizeOos ? 'opacity-40 cursor-not-allowed bg-panel border-border text-muted' : 
                    selectedSize === s ? 'bg-navy text-white border-navy' : 
                    'bg-white text-text border-border hover:border-navy'
                  }
                  ${sizeLow && selectedSize !== s ? 'border-orange/50 text-orange' : ''}
                `}
              >
                {s}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
          <span className="font-bold text-text">Rs. {product.price.toLocaleString()}</span>
          <button 
            disabled={isOos}
            onClick={handleAddToCart}
            className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded transition-colors ${
              isOos ? 'bg-panel text-muted cursor-not-allowed' : 'bg-blue text-white hover:bg-navy'
            }`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
