/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, getDocs, doc, deleteDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Product } from "@/lib/types";
import Image from "next/image";

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Form State
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [tag, setTag] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Men");
  
  // Size & Stock State
  const [sizesInput, setSizesInput] = useState("");
  const [sizeStock, setSizeStock] = useState<Record<string, number>>({});
  
  // Images
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const q = query(collection(db, "products"));
    const snap = await getDocs(q);
    const p: Product[] = [];
    snap.forEach((d) => p.push({ id: d.id, ...d.data() } as Product));
    setProducts(p);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSizesChange = (val: string) => {
    setSizesInput(val);
    const parsed = val.split(",").map(s => s.trim()).filter(s => s !== "");
    const newStock: Record<string, number> = {};
    parsed.forEach(s => {
      newStock[s] = sizeStock[s] || 0;
    });
    setSizeStock(newStock);
  };

  const handleStockChange = (size: string, val: number) => {
    setSizeStock(prev => ({ ...prev, [size]: Math.max(0, val) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).slice(0, 6)); // max 6
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      alert("Please upload at least 1 image");
      return;
    }

    setIsAdding(true);
    try {
      const parsedSizes = Object.keys(sizeStock);
      
      // Upload images
      const imageUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const storageRef = ref(storage, `products/${filename}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      // Calculate global stock
      const totalStock = Object.values(sizeStock).reduce((a, b) => a + b, 0);

      const newProduct = {
        name,
        price: Number(price),
        tag,
        description: desc,
        category,
        sizes: parsedSizes,
        sizeStock,
        stock: totalStock,
        images: imageUrls,
        img: imageUrls[0], // backward compatibility
      };

      await addDoc(collection(db, "products"), newProduct);
      
      // Reset form
      setName(""); setPrice(""); setTag(""); setDesc(""); setCategory("Men");
      setSizesInput(""); setSizeStock({}); setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      await fetchProducts();
      alert("Product added!");
    } catch {
      console.error("Failed to add product");
      alert("Failed to add product");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter(p => p.id !== id));
    } catch {
      alert("Failed to delete");
    }
  };

  return (
    <div className="space-y-12">
      {/* Add Product Form */}
      <div className="bg-panel p-6 rounded border border-border">
        <h2 className="text-lg font-bold tracking-widest uppercase mb-6">➕ Add New Product</h2>
        <form onSubmit={handleAddProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Name *</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} required className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Price (PKR) *</label>
              <input type="number" value={price} onChange={e=>setPrice(e.target.value)} required min="0" className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Category *</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy">
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Tag</label>
              <input type="text" value={tag} onChange={e=>setTag(e.target.value)} placeholder="New Arrival, Sale" className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Sizes (Comma separated) *</label>
              <input type="text" value={sizesInput} onChange={e=>handleSizesChange(e.target.value)} placeholder="38, 39, 40" required className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy" />
            </div>

            {Object.keys(sizeStock).length > 0 && (
              <div className="md:col-span-2 bg-bg p-4 rounded border border-border">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-4">Stock per Size *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.keys(sizeStock).map(s => (
                    <div key={s}>
                      <label className="block text-xs text-muted mb-1">EU {s}</label>
                      <input type="number" min="0" value={sizeStock[s]} onChange={e=>handleStockChange(s, Number(e.target.value))} required className="w-full border border-border rounded px-3 py-2 bg-panel focus:outline-none focus:border-navy" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Description *</label>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} required rows={3} className="w-full border border-border rounded px-4 py-3 bg-bg focus:outline-none focus:border-navy" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Images (Max 6) *</label>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple required className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-navy file:text-white hover:file:bg-navy/90 cursor-pointer" />
            </div>
          </div>
          
          <button type="submit" disabled={isAdding} className="bg-navy text-white font-bold tracking-widest uppercase px-8 py-3 rounded disabled:opacity-50 hover:bg-navy/90 transition-colors">
            {isAdding ? "Uploading & Saving..." : "Add Product"}
          </button>
        </form>
      </div>

      {/* Product List */}
      <div>
        <h2 className="text-lg font-bold tracking-widest uppercase mb-4">Inventory ({products.length})</h2>
        {loading ? (
          <div className="text-center py-12 text-muted">Loading inventory...</div>
        ) : (
          <div className="space-y-4">
            {products.map(p => {
              const img = p.images?.[0] || p.img || '';
              const totalStock = typeof p.stock === 'number' ? p.stock : Object.values(p.sizeStock || {}).reduce((a,b)=>a+b,0);
              return (
                <div key={p.id} className="bg-panel p-4 rounded border border-border flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative w-20 h-20 bg-bg rounded border border-border flex-shrink-0">
                    {img && <Image src={img} alt={p.name} fill className="object-cover rounded" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{p.name}</h3>
                    <p className="text-xs text-muted mb-2">{p.category} {p.tag && `• ${p.tag}`}</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(p.sizeStock || {}).map(([s, qty]) => (
                        <div key={s} className={`text-xs px-2 py-1 rounded border ${qty === 0 ? 'bg-red/10 border-red/20 text-red' : 'bg-bg border-border'}`}>
                          {s}: {qty}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold mb-1">Rs. {p.price.toLocaleString()}</div>
                    <div className={`text-xs font-bold px-2 py-1 rounded inline-block mb-3 ${totalStock === 0 ? 'bg-red/10 text-red' : 'bg-green/10 text-green'}`}>
                      {totalStock} in stock
                    </div>
                    <br/>
                    <button onClick={() => handleDelete(p.id)} className="text-xs font-bold text-red hover:underline uppercase tracking-wider">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
