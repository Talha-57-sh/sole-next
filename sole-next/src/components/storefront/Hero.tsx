"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// Placeholder images for Polaroids since they were hardcoded logic in JS
const polaroids = [
  { id: 1, src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400&h=400", pos: -2, label: "New Arrival" },
  { id: 2, src: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&q=80&w=400&h=400", pos: -1, label: "Air Force" },
  { id: 3, src: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&q=80&w=400&h=400", pos: 0, label: "Classics" },
  { id: 4, src: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=400&h=400", pos: 1, label: "Limited" },
  { id: 5, src: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400&h=400", pos: 2, label: "Summer" },
];

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-background pt-10" id="home-hero">
      {/* Decos */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row items-center gap-12 lg:gap-20 relative z-10">
        
        {/* Text content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 text-center md:text-left pt-12 md:pt-0"
        >
          <h1 className="font-sans font-bold text-6xl md:text-8xl tracking-tighter text-navy mb-4 leading-none">
            Step<br />Different.
          </h1>
          <p className="text-lg md:text-xl font-medium text-blue mb-2">
            New season styles — <span className="text-accent underline decoration-accent/30 underline-offset-4">while stocks last</span>
          </p>
          <p className="text-muted text-base md:text-lg mb-8 max-w-md mx-auto md:mx-0">
            Premium men&apos;s and women&apos;s footwear, shipped quickly across Pakistan.
          </p>
          <button 
            onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-navy text-white px-8 py-4 rounded-full font-medium tracking-wide hover:bg-navy/90 hover:scale-105 transition-all shadow-lg shadow-navy/20 flex items-center gap-2 mx-auto md:mx-0"
          >
            Shop Now <span>→</span>
          </button>
        </motion.div>

        {/* Gallery */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex-1 w-full h-[400px] relative hidden md:flex items-center justify-center"
        >
          <div className="relative w-full h-full flex items-center justify-center perspective-[1000px]">
            {polaroids.map((p) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, x: 50 * p.pos, rotate: p.pos * 10 }}
                animate={{ opacity: 1, x: p.pos * 40, rotate: p.pos * 5, y: Math.abs(p.pos) * 15 }}
                transition={{ duration: 0.8, delay: 0.4 + p.id * 0.1 }}
                className="absolute w-[200px] h-[240px] bg-white p-3 pb-10 rounded shadow-xl border border-border"
                style={{ zIndex: 10 - Math.abs(p.pos) }}
              >
                <div className="relative w-full h-full bg-panel overflow-hidden rounded-sm">
                  <Image src={p.src} alt={p.label} fill className="object-cover" sizes="200px" />
                </div>
                <span className="absolute bottom-3 left-0 w-full text-center text-xs font-medium text-muted uppercase tracking-widest font-sans">
                  {p.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
