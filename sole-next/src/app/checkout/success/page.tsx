import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { orderId: string };
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      <CheckCircle size={64} className="text-green mb-6" />
      <h1 className="text-3xl font-bold tracking-widest uppercase mb-2 text-center">Order Confirmed!</h1>
      <p className="text-muted mb-6 text-center">Thank you for your order. We will process it shortly.</p>
      
      {searchParams.orderId && (
        <div className="bg-panel px-6 py-3 rounded mb-8 font-mono text-sm border border-border">
          Order ID: {searchParams.orderId}
        </div>
      )}
      
      <Link 
        href="/"
        className="px-8 py-3 bg-navy text-white font-bold tracking-widest uppercase rounded hover:bg-navy/90 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
