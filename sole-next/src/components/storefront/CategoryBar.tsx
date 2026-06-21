"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  categories: string[];
}

export default function CategoryBar({ categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("category") || "";

  const handleSelect = (cat: string) => {
    if (activeCat === cat) {
      router.push("/#products"); // Clear filter
    } else {
      router.push(`/?category=${encodeURIComponent(cat)}#products`);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
      <button 
        onClick={() => router.push("/#products")}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
          !activeCat ? 'bg-navy text-white border-navy' : 'bg-white text-muted border-border hover:border-navy hover:text-navy'
        }`}
      >
        All Shoes
      </button>
      {categories.map(c => (
        <button 
          key={c}
          onClick={() => handleSelect(c)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
            activeCat === c ? 'bg-navy text-white border-navy' : 'bg-white text-muted border-border hover:border-navy hover:text-navy'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
