import PaymentForm from "@/components/checkout/PaymentForm";
import OrderSummary from "@/components/checkout/OrderSummary";

export default function CheckoutPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        <div className="lg:col-span-7">
          <PaymentForm />
        </div>
        
        <div className="lg:col-span-5">
          <OrderSummary />
        </div>
        
      </div>
    </div>
  );
}
