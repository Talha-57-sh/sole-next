"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="bg-panel border border-border p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest uppercase mb-2">SOLE Admin</h1>
          <p className="text-muted text-sm">Sign in to manage your store</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy transition-colors" 
              placeholder="admin@example.com" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy transition-colors" 
              placeholder="••••••••" 
            />
          </div>
          
          {error && (
            <div className="text-red text-sm font-medium bg-red/10 border border-red/20 p-3 rounded">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-navy text-white font-bold tracking-widest uppercase py-4 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-navy/90 transition-colors"
          >
            {loading ? "Signing In..." : "Sign In →"}
          </button>
          
          <div className="text-center pt-4">
            <span className="text-xs text-muted font-bold tracking-widest uppercase">🔒 Secured by Firebase Auth</span>
          </div>
        </form>
      </div>
    </div>
  );
}
