import { create } from "zustand";

interface SearchState {
  query: string;
  setQuery: (q: string) => void;
}

export const useSearch = create<SearchState>()((set) => ({
  query: "",
  setQuery: (q: string) => set({ query: q }),
}));
