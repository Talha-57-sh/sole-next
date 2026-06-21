"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/lib/types';

export interface CartItem {
  cartItemId: string;
  product: Product;
  selectedSize: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  itemCount: number;
  cartTotal: number;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, size: string) => void;
  changeQuantity: (cartItemId: string, amount: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isDrawerOpen: false,
      itemCount: 0,
      cartTotal: 0,
      openCart: () => {
        if (typeof window !== 'undefined') document.body.style.overflow = 'hidden';
        set({ isDrawerOpen: true });
      },
      closeCart: () => {
        if (typeof window !== 'undefined') document.body.style.overflow = '';
        set({ isDrawerOpen: false });
      },
      addToCart: (product, size) => {
        set((state) => {
          const cartItemId = `${product.id}_${size}`;
          const existingItemIndex = state.items.findIndex(i => i.cartItemId === cartItemId);
          
          const newItems = [...state.items];
          if (existingItemIndex >= 0) {
            newItems[existingItemIndex].quantity += 1;
          } else {
            newItems.push({
              cartItemId,
              product,
              selectedSize: size,
              quantity: 1,
            });
          }
          
          if (typeof window !== 'undefined') document.body.style.overflow = 'hidden';

          return { 
            items: newItems, 
            itemCount: newItems.reduce((acc, item) => acc + item.quantity, 0),
            cartTotal: newItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0),
            isDrawerOpen: true,
          };
        });
      },
      changeQuantity: (cartItemId, amount) => {
        set((state) => {
          const newItems = [...state.items];
          const index = newItems.findIndex(i => i.cartItemId === cartItemId);
          if (index >= 0) {
            newItems[index].quantity += amount;
            if (newItems[index].quantity <= 0) {
              newItems.splice(index, 1);
            }
          }
          return { 
            items: newItems, 
            itemCount: newItems.reduce((acc, item) => acc + item.quantity, 0),
            cartTotal: newItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0),
          };
        });
      },
      removeFromCart: (cartItemId) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.cartItemId !== cartItemId);
          return { 
            items: newItems, 
            itemCount: newItems.reduce((acc, item) => acc + item.quantity, 0),
            cartTotal: newItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0),
          };
        });
      },
      clearCart: () => set({ items: [], itemCount: 0, cartTotal: 0 }),
    }),
    {
      name: 'sole-cart',
    }
  )
);
