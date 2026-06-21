"use client";

import Image from "next/image";
import { useCart } from "@/hooks/useCart";

const FREE_SHIP_THRESHOLD = 5000;
const FLAT_RATE_SHIPPING = 199;

export default function OrderSummary() {
  const { items, cartTotal } = useCart();

  const shippingFee = cartTotal >= FREE_SHIP_THRESHOLD ? 0 : FLAT_RATE_SHIPPING;
  const grandTotal = cartTotal + shippingFee;

  return (
    <div className="bg-panel p-6 rounded-lg lg:sticky lg:top-24">
      <h2 className="text-xl font-bold tracking-widest uppercase mb-6">Order Summary</h2>
      
      <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
        {items.map((item) => {
          const images = item.product.images?.length ? item.product.images : (item.product.img ? [item.product.img] : []);
          const coverImg = images[0] || '';
          
          return (
            <div key={item.cartItemId} className="flex gap-4 items-center">
              <div className="relative w-16 h-16 bg-white rounded flex-shrink-0 border border-border">
                {coverImg ? (
                  <Image src={coverImg} alt={item.product.name} fill className="object-cover rounded" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">👟</div>
                )}
                <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-navy line-clamp-1">{item.product.name}</h4>
                <p className="text-xs text-muted">Size EU {item.selectedSize}</p>
              </div>
              <div className="font-bold text-sm">
                Rs. {(item.product.price * item.quantity).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-bold">Rs. {cartTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Shipping</span>
          <span className="font-bold">
            {shippingFee === 0 ? <span className="text-green uppercase tracking-wider text-xs">Free</span> : `Rs. ${shippingFee.toLocaleString()}`}
          </span>
        </div>
        <div className="flex justify-between text-lg pt-2 border-t border-border">
          <span className="font-bold uppercase tracking-widest">Total</span>
          <span className="font-bold text-navy">Rs. {grandTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
