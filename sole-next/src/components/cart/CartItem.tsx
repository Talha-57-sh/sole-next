"use client";

import Image from "next/image";
import { Plus, Minus, X } from "lucide-react";
import { CartItem as CartItemType, useCart } from "@/hooks/useCart";

export default function CartItem({ item }: { item: CartItemType }) {
  const { changeQuantity, removeFromCart } = useCart();
  const images = item.product.images?.length ? item.product.images : (item.product.img ? [item.product.img] : []);
  const coverImg = images[0] || '';

  return (
    <div className="flex gap-4 py-4 border-b border-border">
      <div className="relative w-20 h-20 bg-panel rounded overflow-hidden flex-shrink-0">
        {coverImg ? (
          <Image src={coverImg} alt={item.product.name} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">👟</div>
        )}
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-sm text-navy line-clamp-1 pr-4">{item.product.name}</h4>
          <button 
            onClick={() => removeFromCart(item.cartItemId)} 
            className="text-muted hover:text-red transition-colors p-1 -mr-1 -mt-1"
            title="Remove item"
          >
            <X size={16} />
          </button>
        </div>
        
        <p className="text-xs text-muted mb-2">Size EU {item.selectedSize}</p>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center border border-border rounded">
            <button 
              onClick={() => changeQuantity(item.cartItemId, -1)}
              className="p-1 text-muted hover:text-text hover:bg-panel transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
            <button 
              onClick={() => changeQuantity(item.cartItemId, 1)}
              className="p-1 text-muted hover:text-text hover:bg-panel transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <span className="font-bold text-sm text-text">
            Rs. {(item.product.price * item.quantity).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
