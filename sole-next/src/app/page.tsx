import { Suspense } from "react";
import { getProducts } from "@/lib/services/client";
import { Product } from "@/lib/types";
import CategoryBar from "@/components/storefront/CategoryBar";
import ProductGrid from "@/components/storefront/ProductGrid";
import { 
  LandingHero, 
  Marquee, 
  HorizontalShowcase, 
  CategoryParallax
} from "@/components/storefront/landing/LandingSections";

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
    <div className="flex flex-col min-h-screen overflow-x-clip">
      <LandingHero />
      <Marquee />
      <HorizontalShowcase products={products} />
      <CategoryParallax />
      
      <section id="products" className="py-32 px-6 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="mb-12 text-center md:text-left">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-navy mb-4">Complete Collection</h2>
          <p className="text-lg text-navy/70 max-w-2xl">Find your perfect pair from our latest selection of premium footwear.</p>
        </div>

        <Suspense fallback={<div className="h-12 w-full animate-pulse bg-panel rounded-full mb-8" />}>
          <CategoryBar categories={categories} />
        </Suspense>

        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(n => <div key={n} className="aspect-[3/4] bg-panel animate-pulse rounded-3xl" />)}
          </div>
        }>
          <ProductGrid products={products} />
        </Suspense>

      </section>
    </div>
  );
}
