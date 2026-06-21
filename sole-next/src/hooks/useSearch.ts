import { create } from "zustand";
import { Product } from "@/lib/types";
import { getProducts } from "@/lib/services/client";

interface SearchState {
  isOpen: boolean;
  query: string;
  products: Product[];
  isLoading: boolean;
  error: string | null;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (q: string) => void;
  fetchProducts: () => Promise<void>;
}

export const useSearch = create<SearchState>()((set, get) => ({
  isOpen: false,
  query: "",
  products: [],
  isLoading: false,
  error: null,
  openSearch: () => {
    set({ isOpen: true });
    // Fetch on open if we don't have products yet
    if (get().products.length === 0) {
      get().fetchProducts();
    }
  },
  closeSearch: () => set({ isOpen: false, query: "" }),
  setQuery: (q: string) => set({ query: q }),
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await getProducts();
      set({ products, isLoading: false });
    } catch (err) {
      set({ error: "Failed to load products. Please try again.", isLoading: false });
    }
  },
}));
