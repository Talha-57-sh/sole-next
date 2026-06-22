import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { orderId, email } = await req.json();

    if (!orderId || !email) {
      return NextResponse.json({ error: "Order ID and Email are required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const orderDoc = await adminDb.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = orderDoc.data();
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify email matches
    if (data.customer?.email !== email) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Safely extract only what's needed
    const safeData = {
      status: data.status,
      items: data.items?.map((item: { product: { name: string }, quantity: number, selectedSize: string }) => ({
        name: item.product.name,
        quantity: item.quantity,
        size: item.selectedSize,
      })),
      total: data.total,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt),
    };

    return NextResponse.json({ order: safeData }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Failed to fetch order details." }, { status: 500 });
  }
}
