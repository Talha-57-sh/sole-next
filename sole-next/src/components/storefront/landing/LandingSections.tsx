"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image, { StaticImageData } from "next/image";
import { MagneticButton } from "./MagneticButton";
import { Product } from "@/lib/types";

// Note: Ensure these assets are in public/assets/
const SHOE_HERO = "/assets/shoe-hero.jpg";
const SHOE_1 = "/assets/shoe-1.jpg";
const SHOE_2 = "/assets/shoe-2.jpg";
const SHOE_3 = "/assets/shoe-3.jpg";
const SHOE_4 = "/assets/shoe-4.jpg";
const SHOE_5 = "/assets/shoe-5.jpg";

/* -------------------- REVEAL TEXT -------------------- */
export function RevealText({ children, className = "" }: { children: string; className?: string }) {
  const words = children.split(" ");
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <h2 ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.25em]">
          <motion.span
            initial={{ y: "110%" }}
            animate={inView ? { y: 0 } : {}}
            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
          >
            {w}
          </motion.span>
        </span>
      ))}
    </h2>
  );
}



export function LandingHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  
  // A clean kickflip (rotateX) animation that doesn't cause flat mirroring, combined with an upward float
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const yOffset = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  
  const headingWords = ["Step", "Different."];

  return (
    <section ref={ref} className="relative flex flex-col items-center justify-center text-center min-h-screen pt-32 pb-20 px-6 overflow-hidden">
      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue/30 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-pink-200/40 blur-3xl" />
      </div>

      <motion.div className="z-10 flex flex-col items-center w-full">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue backdrop-blur mb-10"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue animate-pulse" />
          New season styles
        </motion.span>

        <div className="relative flex justify-center items-center w-full max-w-5xl" style={{ perspective: "1200px" }}>
          {/* Left Shoe (White Jordan) floating left of text */}
          <motion.div 
            style={{ 
              rotateX,
              y: yOffset,
              rotateZ: -25
            }}
            className="absolute z-20 left-4 lg:-left-20 top-1/2 -translate-y-1/2 w-[200px] lg:w-[480px] pointer-events-none drop-shadow-[0_45px_45px_rgba(0,0,0,0.35)]"
          >
            <Image
              src="/assets/air-jordan.png"
              alt="Nike Air Jordan 1 White"
              width={480}
              height={320}
              priority
              className="w-full h-auto"
            />
          </motion.div>

          {/* Right Shoe (Red Jordan) floating right of text */}
          <motion.div 
            style={{ 
              rotateX,
              y: yOffset,
              rotateZ: 15
            }}
            className="absolute z-20 right-4 lg:-right-20 top-1/2 -translate-y-1/2 w-[200px] lg:w-[480px] pointer-events-none drop-shadow-[0_45px_45px_rgba(0,0,0,0.35)]"
          >
            <Image
              src="/assets/red-jordan.png"
              alt="Nike Air Jordan 1 Red"
              width={480}
              height={320}
              priority
              className="w-full h-auto"
            />
          </motion.div>

          <h1 className="font-display text-[5.5rem] lg:text-[11rem] font-black leading-[0.85] tracking-[-0.04em] text-navy relative z-0 opacity-95">
            {headingWords.map((word, i) => (
              <span key={word} className="block overflow-hidden">
                <motion.span
                  initial={{ y: "110%", filter: "blur(8px)" }}
                  animate={{ y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-10 max-w-xl text-lg text-navy/70"
        >
          Premium men's and women's footwear, shipped quickly across Pakistan — while stocks last.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-10 flex flex-col items-center gap-6"
        >
          <Link href="#products" onClick={(e) => {
            e.preventDefault();
            document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
          }}>
            <MagneticButton className="group inline-flex items-center gap-3 rounded-full bg-navy px-10 py-5 text-lg font-semibold text-white shadow-[0_20px_50px_-15px_rgba(11,26,51,0.6)]">
              Shop Now
              <motion.span
                className="inline-flex"
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
              >
                <ArrowRight className="h-5 w-5" />
              </motion.span>
            </MagneticButton>
          </Link>
          <a href="#products" className="text-sm font-semibold text-navy/70 underline-offset-4 hover:underline">
            Explore the collection →
          </a>
        </motion.div>
      </motion.div>

    </section>
  );
}

/* -------------------- MARQUEE -------------------- */
export function Marquee() {
  const items = ["RUN", "WALK", "STEP", "DIFFERENT", "PREMIUM", "PAKISTAN"];
  const row = [...items, ...items, ...items];
  return (
    <section className="border-y border-navy/10 bg-navy py-8 overflow-hidden">
      <motion.div
        animate={{ x: ["0%", "-33.33%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="flex gap-12 whitespace-nowrap"
      >
        {row.map((w, i) => (
          <span key={i} className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-white/90 flex items-center gap-12">
            {w}
            <span className="h-3 w-3 rounded-full bg-blue" />
          </span>
        ))}
      </motion.div>
    </section>
  );
}

/* -------------------- FEATURED PINNED -------------------- */
export function FeaturedPinned() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.7, 1.1, 0.95]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-15, 15]);
  const textY = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section ref={ref} id="story" className="relative h-[260vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-gradient-to-b from-white to-[#EAF4FB]">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
          <motion.div style={{ scale, rotate }} className="relative mx-auto aspect-square w-full max-w-[560px]">
            <Image src={SHOE_HERO} alt="Featured shoe" fill sizes="(max-width: 768px) 100vw, 560px" className="rounded-3xl object-cover shadow-[0_40px_80px_-30px_rgba(11,26,51,0.5)]" />
          </motion.div>
          <motion.div style={{ y: textY }}>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue">Featured</span>
            <h2 className="mt-4 font-display text-5xl md:text-7xl font-extrabold leading-[0.95] text-navy">
              Engineered <br /> to <em className="font-display italic">move.</em>
            </h2>
            <p className="mt-6 max-w-md text-lg text-navy/70">
              Cushioned soles. Breathable mesh. Hand-stitched detailing on every pair. Designed for the streets of Karachi, Lahore, and beyond.
            </p>
            <Link href="#products" onClick={(e) => {
              e.preventDefault();
              document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
            }} className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-navy underline underline-offset-4 hover:text-blue transition-colors">
              Explore the collection <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- HORIZONTAL SHOWCASE -------------------- */
export function HorizontalShowcase({ products }: { products: Product[] }) {
  // Use up to 5 actual products from Firebase for the horizontal showcase
  const showcaseProducts = products.slice(0, 5);
  // Fallbacks if db is empty or has < 5 products
  const mockShowcase = [
    { img: SHOE_1, name: "Samba Pink", price: 3500, tag: "Court", id: "mock1" },
    { img: SHOE_2, name: "Air Navy", price: 5200, tag: "Lifestyle", id: "mock2" },
    { img: SHOE_3, name: "Campus Gum", price: 4100, tag: "Retro", id: "mock3" },
    { img: SHOE_4, name: "Velocity Red", price: 6800, tag: "Runner", id: "mock4" },
    { img: SHOE_5, name: "Onyx Leather", price: 7500, tag: "Premium", id: "mock5" },
  ];

  const itemsToRender = showcaseProducts.length > 0 ? showcaseProducts : mockShowcase;

  return (
    <section className="bg-white py-32 overflow-hidden">
      <div className="flex flex-col xl:flex-row items-start xl:items-center">
        <div className="pl-6 md:pl-16 mb-10 xl:mb-0 shrink-0">
          <h3 className="font-display text-4xl md:text-6xl font-extrabold text-navy">
            Drop. <span className="text-blue">06</span>
          </h3>
        </div>
        <div className="flex gap-8 pl-6 pr-6 overflow-x-auto snap-x snap-mandatory w-full py-8 pb-12" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style dangerouslySetInnerHTML={{__html: `
            .flex::-webkit-scrollbar { display: none; }
          `}} />
          {itemsToRender.map((s: any) => {
             const imageSrc = s.images?.length ? s.images[0] : (s.img || SHOE_1);
             const isRealProduct = !!s.createdAt;
             const linkHref = isRealProduct ? `/product/${s.id}` : '#';
             return (
              <Link
                href={linkHref}
                key={s.id}
                className="group relative h-[60vh] w-[80vw] max-w-[480px] shrink-0 snap-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#EAF4FB] to-white shadow-[0_30px_60px_-25px_rgba(11,26,51,0.3)] block"
              >
                <Image src={imageSrc} alt={s.name} fill sizes="(max-width: 768px) 80vw, 480px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue">{s.tag || s.category || "Style"}</span>
                  <div className="mt-1 flex items-end justify-between">
                    <h4 className="font-display text-2xl font-bold">{s.name}</h4>
                    <span className="font-semibold">Rs. {s.price.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
             );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------- CATEGORY PARALLAX -------------------- */
export function CategoryParallax() {
  const cats = [
    { name: "Classics", img: SHOE_3, color: "from-amber-100 to-white", link: "/?category=Classics" },
    { name: "Runners", img: SHOE_4, color: "from-red-100 to-white", link: "/?category=Runners" },
    { name: "Court", img: SHOE_2, color: "from-sky-100 to-white", link: "/?category=Court" },
  ];
  return (
    <section className="px-6 py-32 bg-background">
      <div className="mx-auto max-w-7xl">
        <RevealText className="font-display text-4xl md:text-6xl font-extrabold text-navy">
          Pick your tribe.
        </RevealText>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cats.map((c, i) => (
            <CategoryCard key={c.name} {...c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ name, img, color, link, index }: { name: string; img: string; color: string; link: string; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <Link href={link} passHref legacyBehavior>
      <motion.a
        ref={ref}
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -8 }}
        className={`group relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br ${color} shadow-[0_25px_60px_-25px_rgba(11,26,51,0.35)] block`}
      >
        <motion.div style={{ y }} className="absolute inset-0 h-[120%] w-full">
            <Image src={img} alt={name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-8 text-white">
          <h4 className="font-display text-4xl font-extrabold">{name}</h4>
          <span className="rounded-full bg-white/20 p-3 backdrop-blur transition-transform group-hover:rotate-45">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>
      </motion.a>
    </Link>
  );
}

/* -------------------- CTA BAND -------------------- */
export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-navy py-32 text-white">
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue/30 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <RevealText className="font-display text-[clamp(3rem,10vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
          Step Different.
        </RevealText>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mx-auto mt-8 max-w-xl text-lg text-white/70"
        >
          New drops every week. Free shipping over Rs. 5,000 across Pakistan.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex justify-center"
        >
          <Link href="#products" onClick={(e) => {
            e.preventDefault();
            document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
          }}>
            <MagneticButton className="inline-flex items-center justify-center gap-3 rounded-full bg-blue px-10 py-5 text-lg font-bold text-navy hover:brightness-110 transition-all">
              Browse Collection <ArrowRight className="h-5 w-5" />
            </MagneticButton>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
