import { Suspense } from "react";
import { getProducts } from "@/lib/services/client";
import { Product } from "@/lib/types";
import Hero from "@/components/storefront/Hero";
import CategoryBar from "@/components/storefront/CategoryBar";
import ProductGrid from "@/components/storefront/ProductGrid";

export default async function Home() {
  let products: Product[] = [];
  try {
    products = await getProducts();
  } catch (error) {
    console.error("Failed to fetch products:", error);
  }

  // Extract unique categories for the filter bar
  const categories = Array.from(new Set(products.map(p => p.category || p.tag).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      
      <section id="products" className="py-20 px-6 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-2">Collection</h2>
          <p className="text-muted">Find your perfect pair from our latest selection.</p>
        </div>

        <Suspense fallback={<div className="h-12 w-full animate-pulse bg-panel rounded-full mb-8" />}>
          <CategoryBar categories={categories} />
        </Suspense>

        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(n => <div key={n} className="aspect-[3/4] bg-panel animate-pulse rounded-xl" />)}
          </div>
        }>
          <ProductGrid products={products} />
        </Suspense>

      </section>
    </div>
  );
}
