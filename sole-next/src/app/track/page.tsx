"use client";

import { useState } from "react";
import { Search, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { TrackingOrder } from "@/lib/types";

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackingOrder | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !email.trim()) return;

    setIsLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No order found with that ID and email combination. Please check your order confirmation.");
      }

      setOrder({ id: orderId.trim(), ...data.order });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    const idx = STATUS_STEPS.indexOf(status.toLowerCase());
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <h1 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-navy text-center mb-4">
        Track Your Order
      </h1>
      <p className="text-center text-muted mb-10 max-w-lg mx-auto">
        Enter your order ID and the email address used during checkout to check your order status.
      </p>

      {/* Tracking Form */}
      <form onSubmit={handleTrack} className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-border mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Order ID</label>
            <input
              type="text"
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors"
              placeholder="e.g. 8fG9sK..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors"
              placeholder="e.g. name@example.com"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-navy text-white font-bold tracking-widest uppercase py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-navy/90 transition-colors shadow-lg hover:scale-[1.01] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2"><Search size={18} className="animate-pulse" /> Searching...</span>
          ) : (
            <span className="flex items-center gap-2"><Search size={18} /> Track Order</span>
          )}
        </button>
        {error && (
          <div className="mt-4 p-4 bg-red/10 border border-red/20 rounded-lg text-red text-sm font-medium text-center">
            {error}
          </div>
        )}
      </form>

      {/* Results Display */}
      {order && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-navy">Order #{order.id}</h2>
              <p className="text-sm text-muted mt-1">
                Placed on: {new Date(order.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {order.updatedAt && order.updatedAt !== order.createdAt && (
                <p className="text-sm text-muted">
                  Last updated: {new Date(order.updatedAt).toLocaleString('en-PK', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-muted font-bold uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-navy">Rs. {order.total.toLocaleString()}</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-panel -translate-y-1/2 rounded-full hidden sm:block" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-navy -translate-y-1/2 rounded-full hidden sm:block transition-all duration-500" 
              style={{ width: `${(getStepIndex(order.status) / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
            
            <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-0 relative z-10">
              {[
                { id: "pending", label: "Pending", icon: Clock },
                { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
                { id: "shipped", label: "Shipped", icon: Truck },
                { id: "delivered", label: "Delivered", icon: Package },
              ].map((step, idx) => {
                const currentIdx = getStepIndex(order.status);
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex flex-row sm:flex-col items-center gap-4 sm:gap-2">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 transition-colors ${
                      isCompleted 
                        ? 'bg-navy border-white text-white shadow-md' 
                        : 'bg-panel border-white text-muted'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="sm:text-center">
                      <p className={`font-bold uppercase tracking-wider text-xs sm:text-sm ${isCompleted ? 'text-navy' : 'text-muted'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-muted mt-1 hidden sm:block">Current Status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items List */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-navy mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {order.items?.map((item, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-panel border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded flex items-center justify-center text-xl shadow-sm border border-border">👟</div>
                    <div>
                      <p className="font-bold text-navy text-sm">{item.name}</p>
                      <p className="text-xs text-muted mt-1">Size EU: {item.size}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
