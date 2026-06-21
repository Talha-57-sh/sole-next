import { collection, getDocs, doc, getDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, StoreSettings } from "@/lib/types";

export async function getProducts(): Promise<Product[]> {
  const q = query(collection(db, "products"), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Product[];
}

export async function getProductById(id: string): Promise<Product | null> {
  const docRef = doc(db, "products", id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Product;
  }
  return null;
}

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const docRef = doc(db, "settings", "store");
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as StoreSettings;
  }
  return null;
}
