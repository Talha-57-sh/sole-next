"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Check } from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/hooks/useCart";

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const images = product.images?.length
    ? product.images
    : product.img
      ? [product.img]
      : [];
  const [activeImg, setActiveImg] = useState(0);

  const ss = product.sizeStock || {};
  const hasSizeStock = Object.keys(ss).length > 0;

  const availableSizes = product.sizes.filter((s) => {
    if (!hasSizeStock) return true;
    const qty = ss[s];
    return qty === undefined || qty > 0;
  });

  const isOos = hasSizeStock && availableSizes.length === 0;

  const totalStock = hasSizeStock
    ? product.sizes.reduce((sum, s) => sum + (ss[s] || 0), 0)
    : typeof product.stock === "number"
      ? product.stock
      : null;

  const isLow =
    !isOos && totalStock !== null && totalStock > 0 && totalStock <= 5;

  const handleAddToCart = () => {
    if (isOos) return;
    if (!selectedSize) {
      alert("Please select a size first.");
      return;
    }

    if (
      hasSizeStock &&
      ss[selectedSize] !== undefined &&
      ss[selectedSize] <= 0
    ) {
      alert(`Sorry, size EU ${selectedSize} is out of stock.`);
      return;
    }

    addToCart(product, selectedSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div>
      {/* Back link */}
      <Link
        href="/#products"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-navy transition-colors mb-8 group"
      >
        <ArrowLeft
          size={16}
          className="group-hover:-translate-x-1 transition-transform"
        />
        Back to Collection
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* ── Image Gallery ── */}
        <div className="flex flex-col gap-4">
          {/* Main image */}
          <div className="relative w-full aspect-square bg-panel rounded-2xl overflow-hidden border border-border">
            {images[activeImg] ? (
              <Image
                src={images[activeImg]}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                👟
              </div>
            )}

            {/* Stock badges */}
            <div className="absolute top-4 left-4 z-10">
              {isOos ? (
                <span className="bg-red text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                  Out of Stock
                </span>
              ) : isLow ? (
                <span className="bg-orange text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                  Only {totalStock} left!
                </span>
              ) : null}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    activeImg === i
                      ? "border-navy shadow-md"
                      : "border-border hover:border-muted"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${product.name} view ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info ── */}
        <div className="flex flex-col">
          {/* Tag / Category */}
          <span className="text-xs uppercase tracking-widest text-muted font-semibold mb-2">
            {product.tag || product.category || "Footwear"}
          </span>

          {/* Name */}
          <h1 className="text-3xl md:text-4xl font-bold text-navy leading-tight mb-3">
            {product.name}
          </h1>

          {/* Price */}
          <p className="text-2xl font-bold text-text mb-6">
            Rs. {product.price.toLocaleString()}
          </p>

          {/* Description */}
          {product.desc && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-navy mb-3">
                Description
              </h2>
              <p className="text-muted leading-relaxed">{product.desc}</p>
            </div>
          )}

          {/* OOS message */}
          {isOos && (
            <div className="text-sm text-red font-medium mb-4 flex items-center gap-2 bg-red/5 px-4 py-3 rounded-lg">
              <span>⛔</span> This product is currently unavailable.
            </div>
          )}

          {/* Size Selector */}
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-navy mb-3">
              Select Size (EU)
            </h2>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const qty = hasSizeStock
                  ? ss[s] !== undefined
                    ? ss[s]
                    : -1
                  : -1;
                const sizeOos = hasSizeStock && qty === 0;
                const sizeLow = hasSizeStock && qty > 0 && qty <= 3;

                return (
                  <button
                    key={s}
                    disabled={isOos || sizeOos}
                    onClick={() => setSelectedSize(s)}
                    title={
                      sizeOos
                        ? `Size ${s} out of stock`
                        : sizeLow
                          ? `Only ${qty} left`
                          : `Size EU ${s}`
                    }
                    className={`w-12 h-12 rounded-lg text-sm font-medium border-2 flex items-center justify-center transition-all
                      ${
                        isOos || sizeOos
                          ? "opacity-40 cursor-not-allowed bg-panel border-border text-muted line-through"
                          : selectedSize === s
                            ? "bg-navy text-white border-navy scale-105 shadow-md"
                            : "bg-white text-text border-border hover:border-navy hover:text-navy"
                      }
                      ${sizeLow && selectedSize !== s ? "border-orange/50 text-orange" : ""}
                    `}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {selectedSize && (
              <p className="text-xs text-muted mt-2">
                Selected: EU {selectedSize}
                {hasSizeStock &&
                  ss[selectedSize] !== undefined &&
                  ss[selectedSize] > 0 &&
                  ss[selectedSize] <= 3 &&
                  ` — Only ${ss[selectedSize]} left`}
              </p>
            )}
          </div>

          {/* Add to Cart */}
          <button
            disabled={isOos}
            onClick={handleAddToCart}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg font-bold uppercase tracking-widest text-sm transition-all ${
              isOos
                ? "bg-panel text-muted cursor-not-allowed"
                : added
                  ? "bg-green text-white"
                  : "bg-navy text-white hover:bg-navy/90 hover:scale-[1.02] shadow-lg shadow-navy/20"
            }`}
          >
            {added ? (
              <>
                <Check size={18} /> Added to Cart
              </>
            ) : (
              <>
                <ShoppingBag size={18} /> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
