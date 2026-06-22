/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const FREE_SHIP_THRESHOLD = 5000;
const FLAT_RATE_SHIPPING = 199;

export default function PaymentForm() {
  const router = useRouter();
  const { items, cartTotal, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sadapay" | "bank">("cod");
  const [file, setFile] = useState<File | null>(null);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Double-submission guard idempotency key
  const [idempotencyKey, setIdempotencyKey] = useState("");
  
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (!val) {
      setEmailError("");
      return;
    }
    if (!val.includes('@')) {
      setEmailError("Please enter a valid email address (e.g. name@gmail.com)");
      return;
    }
    const parts = val.split('@');
    if (parts.length !== 2 || !parts[1].includes('.')) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (!val) {
      setPhoneError("");
      return;
    }
    let cleaned = val.replace(/[\s-]/g, '');
    if (cleaned.startsWith('+92')) cleaned = '0' + cleaned.substring(3);
    else if (cleaned.startsWith('0092')) cleaned = '0' + cleaned.substring(4);
    else if (cleaned.startsWith('92')) cleaned = '0' + cleaned.substring(2);
    
    if (!cleaned.startsWith('03') || cleaned.length !== 11) {
      setPhoneError("Please enter a valid 11-digit Pakistani phone number (e.g. 0300 1234567)");
      return;
    }
    setPhoneError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (items.length === 0) {
      alert("Your cart is empty.");
      return;
    }
    
    if (paymentMethod !== "cod" && !file) {
      alert("Please upload a payment screenshot for this payment method.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    let hasError = false;

    // Email validation
    if (!email.includes('@')) {
      setEmailError("Please enter a valid email address (e.g. name@gmail.com)");
      hasError = true;
    } else {
      const parts = email.split('@');
      if (parts.length !== 2 || !parts[1].includes('.')) {
        setEmailError("Please enter a valid email address.");
        hasError = true;
      } else {
        setEmailError("");
      }
    }

    // Phone validation
    let cleanedPhone = phone.replace(/[\s-]/g, '');
    if (cleanedPhone.startsWith('+92')) cleanedPhone = '0' + cleanedPhone.substring(3);
    else if (cleanedPhone.startsWith('0092')) cleanedPhone = '0' + cleanedPhone.substring(4);
    else if (cleanedPhone.startsWith('92')) cleanedPhone = '0' + cleanedPhone.substring(2);
    
    if (!cleanedPhone.startsWith('03') || cleanedPhone.length !== 11) {
      setPhoneError("Please enter a valid 11-digit Pakistani phone number (e.g. 0300 1234567)");
      hasError = true;
    } else {
      setPhoneError("");
    }

    if (hasError) return;

    setIsSubmitting(true);

    try {
      const customer = {
        email,
        fname: formData.get("fname") as string,
        lname: formData.get("lname") as string,
        address: formData.get("address") as string,
        city: formData.get("city") as string,
        postal: formData.get("postal") as string,
        phone: formData.get("phone") as string,
      };

      let paymentScreenshotUrl = "";

      if (paymentMethod !== "cod" && file) {
        const ext = file.name.split('.').pop();
        const filename = `receipt_${idempotencyKey}.${ext}`;
        const storageRef = ref(storage, `payment_receipts/${filename}`);
        const snapshot = await uploadBytes(storageRef, file);
        paymentScreenshotUrl = await getDownloadURL(snapshot.ref);
      }

      const shippingFee = cartTotal >= FREE_SHIP_THRESHOLD ? 0 : FLAT_RATE_SHIPPING;
      const total = cartTotal + shippingFee;

      const payload = {
        idempotencyKey,
        customer,
        items,
        total,
        paymentMethod,
        paymentScreenshotUrl,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to place order.");
      }

      clearCart();
      router.push(`/checkout/success?orderId=${data.orderId}`);

    } catch (error: unknown) {
      console.error(error);
      alert(error instanceof Error ? error.message : "An error occurred during checkout.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Contact Section */}
      <section>
        <h2 className="text-xl font-bold tracking-widest uppercase mb-4">Contact</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Email</label>
            <input name="email" type="email" required onBlur={handleEmailBlur} className={`w-full border ${emailError ? 'border-red' : 'border-border'} rounded px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors`} placeholder="Email address" />
            {emailError && <p className="text-red text-xs mt-1 font-medium">{emailError}</p>}
          </div>
        </div>
      </section>

      {/* Delivery Section */}
      <section>
        <h2 className="text-xl font-bold tracking-widest uppercase mb-4">Delivery</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">First Name</label>
              <input name="fname" type="text" required className="w-full border border-border rounded px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors" placeholder="First name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Last Name</label>
              <input name="lname" type="text" required className="w-full border border-border rounded px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors" placeholder="Last name" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Address</label>
            <input name="address" type="text" required className="w-full border border-border rounded px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors" placeholder="House, street, etc." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">City</label>
              <input name="city" type="text" required className="w-full border border-border rounded px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors" placeholder="City" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Postal Code</label>
              <input name="postal" type="text" className="w-full border border-border rounded px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors" placeholder="Postal code (optional)" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Phone</label>
            <input name="phone" type="tel" required onBlur={handlePhoneBlur} className={`w-full border ${phoneError ? 'border-red' : 'border-border'} rounded px-4 py-3 bg-panel focus:outline-none focus:border-navy transition-colors`} placeholder="Phone number" />
            {phoneError && <p className="text-red text-xs mt-1 font-medium">{phoneError}</p>}
          </div>
        </div>
      </section>

      {/* Payment Section */}
      <section>
        <h2 className="text-xl font-bold tracking-widest uppercase mb-4">Payment</h2>
        <div className="space-y-3">
          <label className={`block border rounded p-4 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-navy bg-panel' : 'border-border'}`}>
            <div className="flex items-center gap-3">
              <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-4 h-4 accent-navy" />
              <span className="font-bold text-sm">Cash on Delivery (COD)</span>
            </div>
          </label>

          <label className={`block border rounded p-4 cursor-pointer transition-colors ${paymentMethod === 'sadapay' ? 'border-navy bg-panel' : 'border-border'}`}>
            <div className="flex items-center gap-3">
              <input type="radio" name="payment" value="sadapay" checked={paymentMethod === 'sadapay'} onChange={() => setPaymentMethod('sadapay')} className="w-4 h-4 accent-navy" />
              <span className="font-bold text-sm">SadaPay / NayaPay</span>
            </div>
          </label>

          <label className={`block border rounded p-4 cursor-pointer transition-colors ${paymentMethod === 'bank' ? 'border-navy bg-panel' : 'border-border'}`}>
            <div className="flex items-center gap-3">
              <input type="radio" name="payment" value="bank" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-4 h-4 accent-navy" />
              <span className="font-bold text-sm">Direct Bank Transfer (HBL / Raast)</span>
            </div>
          </label>
        </div>

        {paymentMethod !== 'cod' && (
          <div className="mt-4 p-4 border border-dashed border-border rounded bg-panel">
            <h3 className="font-bold text-sm mb-2">Upload Payment Receipt</h3>
            <p className="text-xs text-muted mb-4">Please transfer the exact total amount to our account and upload a screenshot of your successful transaction.</p>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-navy file:text-white hover:file:bg-navy/90 cursor-pointer"
            />
          </div>
        )}
      </section>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-navy text-white font-bold tracking-widest uppercase py-4 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-navy/90 transition-colors shadow-lg hover:scale-[1.01]"
      >
        {isSubmitting ? "Processing..." : "Complete Order"}
      </button>
    </form>
  );
}
