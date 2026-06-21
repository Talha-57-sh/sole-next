import type { Metadata } from "next";
import { Sora, Manrope } from "next/font/google";
import "./globals.css";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import SearchOverlay from "@/components/layout/SearchOverlay";
import { SmoothScroll } from "@/components/storefront/landing/SmoothScroll";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "SOLE — Premium Footwear Pakistan",
  description: "SOLE — Premium footwear for men and women. Shop the latest sneakers, heels, sandals and more. Fast delivery across Pakistan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${sora.variable} ${manrope.variable} ${manrope.className} bg-background text-text antialiased`}>
        <SmoothScroll />
        <Nav />
        <CartDrawer />
        <SearchOverlay />
        <main className="min-h-screen pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
