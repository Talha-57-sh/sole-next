"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface SystemSettings {
  deliveryCharge: number;
  freeShippingThreshold: number;
  sadaPayNumber: string;
  bankAccountDetails: string;
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<SystemSettings>({
    deliveryCharge: 199,
    freeShippingThreshold: 5000,
    sadaPayNumber: "",
    bankAccountDetails: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "system_settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SystemSettings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, "system_settings", "global");
      await setDoc(docRef, settings, { merge: true });
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-2xl bg-panel p-6 rounded border border-border">
      <h2 className="text-xl font-bold tracking-widest uppercase mb-6">System Settings</h2>
      
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Delivery Charge (Rs)</label>
            <input 
              type="number" 
              value={settings.deliveryCharge}
              onChange={(e) => setSettings({...settings, deliveryCharge: Number(e.target.value)})}
              required 
              className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy transition-colors" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Free Shipping Threshold (Rs)</label>
            <input 
              type="number" 
              value={settings.freeShippingThreshold}
              onChange={(e) => setSettings({...settings, freeShippingThreshold: Number(e.target.value)})}
              required 
              className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy transition-colors" 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">SadaPay / NayaPay Number</label>
          <input 
            type="text" 
            value={settings.sadaPayNumber}
            onChange={(e) => setSettings({...settings, sadaPayNumber: e.target.value})}
            className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy transition-colors" 
            placeholder="03XX XXXXXXX"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Bank Account Details</label>
          <textarea 
            value={settings.bankAccountDetails}
            onChange={(e) => setSettings({...settings, bankAccountDetails: e.target.value})}
            rows={4}
            className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy transition-colors" 
            placeholder="Bank Name, Account Title, IBAN"
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="bg-navy text-white font-bold tracking-widest uppercase px-8 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-navy/90 transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
