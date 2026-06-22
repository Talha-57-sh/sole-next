"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Order } from "@/lib/types";
import Image from "next/image";

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear ALL orders? This action cannot be undone.")) {
      try {
        const promises = orders.map(order => deleteDoc(doc(db, "orders", order.id)));
        await Promise.all(promises);
      } catch (error) {
        console.error("Error clearing orders:", error);
        alert("Failed to clear orders.");
      }
    }
  };

  const filteredOrders = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);

  if (loading) return <div>Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-panel p-4 rounded border border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold tracking-widest uppercase">Orders ({filteredOrders.length})</h2>
          {orders.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="px-3 py-1 bg-red text-white text-xs font-bold uppercase rounded hover:bg-red/90 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border rounded px-4 py-2 bg-bg focus:outline-none focus:border-navy"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted bg-panel border border-border rounded">No orders found.</div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-panel border border-border rounded p-6">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                
                {/* Order Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-muted font-mono mb-1">ID: {order.id}</div>
                      <h3 className="font-bold text-navy text-lg">{order.customer.fname} {order.customer.lname}</h3>
                      <p className="text-sm text-muted">{order.customer.email} • {order.customer.phone}</p>
                      <p className="text-sm mt-1">{order.customer.address}, {order.customer.city} {order.customer.postal}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl mb-2">Rs. {order.total.toLocaleString()}</div>
                      <select 
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded border-2 outline-none
                          ${order.status === 'pending' ? 'border-orange text-orange' : 
                            order.status === 'confirmed' ? 'border-blue-500 text-blue-500' :
                            order.status === 'shipped' ? 'border-accent text-accent' :
                            order.status === 'delivered' ? 'border-green text-green' :
                            'border-red text-red'}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-bg p-3 rounded border border-border text-sm flex justify-between items-center">
                    <div>
                      <span className="text-muted mr-2">Method:</span>
                      <span className="font-bold uppercase">{order.paymentMethod}</span>
                    </div>
                    {order.paymentScreenshotUrl && (
                      <a href={order.paymentScreenshotUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold">
                        View Receipt ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="lg:w-1/3 bg-bg p-4 rounded border border-border space-y-3">
                  <h4 className="text-xs font-bold tracking-widest uppercase text-muted border-b border-border pb-2">Items ({order.items.length})</h4>
                  <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                    {order.items.map((item) => {
                      const img = item.product.images?.[0] || item.product.img || '';
                      return (
                        <div key={item.cartItemId} className="flex gap-3 items-center">
                          <div className="relative w-12 h-12 bg-panel rounded border border-border flex-shrink-0">
                            {img ? (
                              <Image src={img} alt={item.product.name} fill className="object-cover rounded" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">👟</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{item.product.name}</div>
                            <div className="text-xs text-muted">EU {item.selectedSize} × {item.quantity}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
