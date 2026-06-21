"use client";

import { useSearchParams } from "next/navigation";
import { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import { useSearch } from "@/hooks/useSearch";

interface Props {
  products: Product[];
}

export default function ProductGrid({ products }: Props) {
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("category");
  const searchQuery = useSearch((s) => s.query);

  let filtered = activeCat 
    ? products.filter(p => p.category === activeCat || p.tag === activeCat)
    : products;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.tag && p.tag.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="col-span-full py-20 text-center text-muted">
        <div className="text-4xl mb-4">👟</div>
        {searchQuery ? (
          <p>No results found for &quot;{searchQuery}&quot;.</p>
        ) : (
          <p>No products found in this category.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-sm font-medium text-muted">
        Showing <span className="text-text">{filtered.length}</span> of <span className="text-text">{products.length}</span> products
        {searchQuery && <span> for &quot;{searchQuery}&quot;</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </>
  );
}
