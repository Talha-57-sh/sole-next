"use client";

import { useAuth } from "@/hooks/useAuth";
import AdminLogin from "@/components/admin/AdminLogin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-border border-t-navy rounded-full animate-spin mb-4"></div>
          <p className="text-muted tracking-widest uppercase text-sm font-bold">Loading Admin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-bg">
      {children}
    </div>
  );
}
