import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idempotencyKey, customer, items, total, paymentMethod, paymentScreenshotUrl } = body;

    if (!items || !items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // Reference to the 'orders' collection
    const orderRef = adminDb.collection("orders").doc(); // Generate new doc ID for the order
    
    // We will run a transaction to atomically update stock for all items
    await adminDb.runTransaction(async (transaction) => {
      // 1. Read phase: get all product documents
      const productDocs = new Map();
      for (const item of items) {
        const pRef = adminDb.collection("products").doc(item.product.id);
        const pDoc = await transaction.get(pRef);
        
        if (!pDoc.exists) {
          throw new Error(`Product not found: ${item.product.name}`);
        }
        
        productDocs.set(item.product.id, pDoc);
      }

      // 2. Validate phase: check stock
      for (const item of items) {
        const pDoc = productDocs.get(item.product.id);
        const data = pDoc.data();
        
        const sizeStock = data.sizeStock || {};
        const availableQty = sizeStock[item.selectedSize];
        
        if (availableQty === undefined) {
          // If sizeStock is tracked but the size doesn't exist, we assume infinite for now,
          // or we could throw. But since the client checked, let's assume it's un-tracked infinite stock if undefined.
        } else if (availableQty < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name} (Size EU ${item.selectedSize}). Only ${availableQty} left.`);
        }
      }

      // 3. Write phase: decrement stock
      for (const item of items) {
        const pRef = adminDb.collection("products").doc(item.product.id);
        const pDoc = productDocs.get(item.product.id);
        const data = pDoc.data();
        
        const updates: Record<string, unknown> = {};
        
        if (data.sizeStock && data.sizeStock[item.selectedSize] !== undefined) {
          // Decrement the specific size
          updates[`sizeStock.${item.selectedSize}`] = FieldValue.increment(-item.quantity);
        }
        
        if (typeof data.stock === 'number') {
          // Decrement global stock if it's tracked
          updates.stock = FieldValue.increment(-item.quantity);
        }
        
        if (Object.keys(updates).length > 0) {
          transaction.update(pRef, updates);
        }
      }

      // 4. Create the order document
      transaction.set(orderRef, {
        idempotencyKey,
        customer,
        items,
        total,
        paymentMethod,
        paymentScreenshotUrl: paymentScreenshotUrl || null,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ success: true, orderId: orderRef.id }, { status: 200 });

  } catch (error: unknown) {
    console.error("Checkout transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process order" },
      { status: 400 }
    );
  }
}
