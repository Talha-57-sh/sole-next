"use client";

import { useSearchParams } from "next/navigation";
import { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

interface Props {
  products: Product[];
}

export default function ProductGrid({ products }: Props) {
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("category");

  const filtered = activeCat 
    ? products.filter(p => p.category === activeCat || p.tag === activeCat)
    : products;

  if (filtered.length === 0) {
    return (
      <div className="col-span-full py-20 text-center text-muted">
        <div className="text-4xl mb-4">👟</div>
        <p>No products found in this category.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-sm font-medium text-muted">
        Showing <span className="text-text">{filtered.length}</span> of <span className="text-text">{products.length}</span> products
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </>
  );
}
