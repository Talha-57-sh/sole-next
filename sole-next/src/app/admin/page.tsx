"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ProductsTab from "@/components/admin/tabs/ProductsTab";
import OrdersTab from "@/components/admin/tabs/OrdersTab";
import SettingsTab from "@/components/admin/tabs/SettingsTab";
import { LogOut } from "lucide-react";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "settings">("products");

  return (
    <div>
      {/* Topbar */}
      <div className="bg-panel border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-widest uppercase">SOLE <span className="text-muted text-sm ml-2">Admin</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted hidden md:inline-block">{user?.email}</span>
            <button onClick={logout} className="flex items-center gap-2 text-sm text-red hover:text-red/80 transition-colors font-bold uppercase tracking-wider">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          <button 
            onClick={() => setActiveTab("products")}
            className={`py-4 font-bold tracking-widest uppercase text-sm border-b-2 transition-colors ${activeTab === "products" ? "border-navy text-navy" : "border-transparent text-muted hover:text-navy"}`}
          >
            Products
          </button>
          <button 
            onClick={() => setActiveTab("orders")}
            className={`py-4 font-bold tracking-widest uppercase text-sm border-b-2 transition-colors ${activeTab === "orders" ? "border-navy text-navy" : "border-transparent text-muted hover:text-navy"}`}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`py-4 font-bold tracking-widest uppercase text-sm border-b-2 transition-colors ${activeTab === "settings" ? "border-navy text-navy" : "border-transparent text-muted hover:text-navy"}`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
