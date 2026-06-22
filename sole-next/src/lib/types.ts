export interface Product {
  id: string; // Document ID
  name: string;
  price: number;
  salePrice?: number;
  tag?: string;
  category?: string;
  desc?: string;
  sizes: string[];
  img?: string;
  images?: string[];
  sizeStock: Record<string, number>;
  stock: number;
  createdAt?: number;
}

export interface Customer {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  postal?: string;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  selectedSize: string;
  quantity: number;
}

export interface Order {
  id: string;
  idempotencyKey?: string;
  customer: Customer;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  paymentScreenshotUrl?: string | null;
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
  createdAt?: unknown;
}

export interface TrackingOrder {
  id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  items: { name: string; size: string; quantity: number }[];
  total: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  productName: string;
  author: string;
  text: string;
  rating: number;
  date: string; // ISO string
  approved: boolean;
}

export interface StoreSettingsPayment {
  accountName?: string;
  easypaisaNumber?: string;
  sadapayNumber?: string;
  bankName?: string;
  bankAccount?: string;
}

export interface StoreSettingsEmailjs {
  publicKey?: string;
  serviceId?: string;
  templateId?: string;
}

export interface StoreSettings {
  deliveryCharge?: number;
  waNumber?: string;
  storeCity?: string;
  instagram?: string;
  returnPolicy?: string;
  payment?: StoreSettingsPayment;
  emailjs?: StoreSettingsEmailjs;
}

export interface Coupon {
  id: string; // Coupon code
  active: boolean;
  type: 'pct' | 'flat';
  value: number;
  label: string;
}
