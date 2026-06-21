import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getProductById } from "@/lib/services/client";
import ProductDetailClient from "@/components/storefront/ProductDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return { title: "Product Not Found — SOLE" };
  }

  return {
    title: `${product.name} — SOLE`,
    description: product.desc || `Shop ${product.name} at SOLE. Premium footwear, fast delivery across Pakistan.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <ProductDetailClient product={product} />
    </div>
  );
}
