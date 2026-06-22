"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { MagneticButton } from "./MagneticButton";
import { Product } from "@/lib/types";

const SHOE_1 = "/assets/shoe-1.jpg";
const SHOE_2 = "/assets/shoe-2.jpg";
const SHOE_3 = "/assets/shoe-3.jpg";
const SHOE_4 = "/assets/shoe-4.jpg";
const SHOE_5 = "/assets/shoe-5.jpg";
const SHOE_HERO = "/assets/shoe-hero.jpg";

const heroChips = [
  { label: "Free Shipping", angle: -35 },
  { label: "New Drop", angle: 30 },
  { label: "PK Made", angle: 110 },
];

/* -------------------- HERO -------------------- */
export function LandingHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  // Smooth 360° scroll-linked rotation of the shoe
  const shoeRotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <section ref={heroRef} className="relative min-h-screen pt-32 pb-20 px-6">
      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue/30 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-pink-200/40 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue animate-pulse" />
            New season styles
          </motion.span>

          <h1 className="mt-6 font-display text-[clamp(3.5rem,9vw,8rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-navy">
            {["Step", "Different."].map((word, i) => (
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

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-8 max-w-md text-lg text-navy/70"
          >
            Premium men's and women's footwear, shipped quickly across Pakistan — while stocks last.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-10 flex items-center gap-4"
          >
            <Link href="/#products" onClick={(e) => {
              const elem = document.getElementById("products");
              if (elem) {
                e.preventDefault();
                elem.scrollIntoView({ behavior: "smooth" });
              }
            }}>
              <MagneticButton className="group inline-flex items-center gap-3 rounded-full bg-navy px-8 py-4 text-base font-semibold text-white shadow-[0_20px_50px_-15px_rgba(11,26,51,0.6)]">
                Shop Now
                <motion.span className="inline-flex" initial={{ x: 0 }} whileHover={{ x: 4 }}>
                  <ArrowRight className="h-5 w-5" />
                </motion.span>
              </MagneticButton>
            </Link>
            <a href="#drop" className="text-sm font-semibold text-navy/70 underline-offset-4 hover:underline">
              See the drop →
            </a>
          </motion.div>
        </div>

        {/* Spotlight shoe — centered inside the ring, rotates with scroll */}
        <div className="relative mx-auto aspect-square w-full max-w-[520px]">
          {/* rotating dashed ring (ambient) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border-2 border-dashed border-navy/20"
          />
          {/* halo */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-10 rounded-full bg-gradient-to-br from-blue/40 via-white/30 to-pink-200/40 blur-2xl"
          />
          {/* spotlight disc */}
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-white to-[#EAF4FB] shadow-[inset_0_-30px_60px_rgba(11,26,51,0.08),0_40px_80px_-30px_rgba(11,26,51,0.45)]" />

          {/* shoe — perfectly centered, scroll-driven 360° rotation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ rotate: shoeRotate, willChange: "transform" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src={SHOE_HERO}
              alt="Featured shoe"
              width={1000}
              height={1000}
              className="h-[70%] w-[70%] object-contain drop-shadow-[0_30px_30px_rgba(11,26,51,0.35)]"
            />
          </motion.div>

          {/* orbiting chips */}
          {heroChips.map((c, i) => {
            const rad = (c.angle * Math.PI) / 180;
            const r = 46; // % of container
            const x = 50 + r * Math.cos(rad);
            const y = 50 + r * Math.sin(rad);
            return (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-navy shadow-[0_15px_30px_-10px_rgba(11,26,51,0.3)] ring-1 ring-navy/5"
              >
                {c.label}
              </motion.div>
            );
          })}
        </div>
      </div>
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

/* -------------------- SHARED HOOKS -------------------- */
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setM(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return m;
}

/* -------------------- HORIZONTAL SHOWCASE -------------------- */
export function HorizontalShowcase({ products }: { products: Product[] }) {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-72%"]);

  // Preserve Firebase wiring
  const showcaseProducts = products?.slice(0, 5) || [];
  const mockShowcase = [
    { img: SHOE_1, name: "Samba Pink", price: 3500, tag: "Court", id: "mock1" },
    { img: SHOE_2, name: "Air Navy", price: 5200, tag: "Lifestyle", id: "mock2" },
    { img: SHOE_3, name: "Campus Gum", price: 4100, tag: "Retro", id: "mock3" },
    { img: SHOE_4, name: "Velocity Red", price: 6800, tag: "Runner", id: "mock4" },
    { img: SHOE_5, name: "Onyx Leather", price: 7500, tag: "Premium", id: "mock5" },
  ];
  const itemsToRender = showcaseProducts.length > 0 ? showcaseProducts : mockShowcase;

  // Mobile Native Scroll-Snap
  if (isMobile) {
    return (
      <section id="drop" className="bg-white py-20">
        <div className="px-6">
          <h3 className="mb-8 font-display text-4xl font-extrabold text-navy">
            Drop. <span className="text-blue">06</span>
          </h3>
        </div>
        <div
          className="flex gap-5 overflow-x-auto pb-6 pl-6 pr-6 snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
        >
          {itemsToRender.map((s: any) => {
            const imageSrc = s.images?.length ? s.images[0] : (s.img || SHOE_1);
            const isRealProduct = !!s.createdAt;
            const linkHref = isRealProduct ? `/product/${s.id}` : '#';
            return (
              <Link href={linkHref} key={s.id} className="group relative h-[60vh] w-[78vw] shrink-0 snap-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#EAF4FB] to-white shadow-[0_25px_50px_-20px_rgba(11,26,51,0.3)] block">
                <img src={imageSrc} alt={s.name} loading="lazy" width={800} height={800} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/60 to-transparent text-white">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue">{s.tag || s.category || "Style"}</span>
                  <div className="mt-1 flex items-end justify-between">
                    <h4 className="font-display text-xl font-bold">{s.name}</h4>
                    <span className="font-semibold text-sm">Rs. {s.price?.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  // Desktop Scroll-Linked Animation
  return (
    <section id="drop" ref={ref} className="relative h-[400vh] bg-white">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="pl-6 md:pl-16">
          <h3 className="mb-10 font-display text-4xl md:text-6xl font-extrabold text-navy">
            Drop. <span className="text-blue">06</span>
          </h3>
        </div>
        <motion.div style={{ x, willChange: "transform" }} className="flex gap-8 pl-6 pr-[20vw]">
          {itemsToRender.map((s: any) => {
            const imageSrc = s.images?.length ? s.images[0] : (s.img || SHOE_1);
            const isRealProduct = !!s.createdAt;
            const linkHref = isRealProduct ? `/product/${s.id}` : '#';
            return (
              <Link href={linkHref} key={s.id} className="group relative h-[60vh] w-[80vw] max-w-[480px] shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-[#EAF4FB] to-white shadow-[0_30px_60px_-25px_rgba(11,26,51,0.3)] block">
                <img src={imageSrc} alt={s.name} loading="lazy" width={800} height={800} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue">{s.tag || s.category || "Style"}</span>
                  <div className="mt-1 flex items-end justify-between">
                    <h4 className="font-display text-2xl font-bold">{s.name}</h4>
                    <span className="font-semibold">Rs. {s.price?.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------- CATEGORY PARALLAX -------------------- */
export function CategoryParallax() {
  const cats = [
    { name: "Casual", img: SHOE_3, color: "from-amber-100 to-white", link: "/?category=Casual" },
    { name: "Formal", img: SHOE_2, color: "from-sky-100 to-white", link: "/?category=Formal" },
    { name: "Runners", img: SHOE_4, color: "from-red-100 to-white", link: "/?category=Runners" },
  ];
  return (
    <section className="px-6 py-32">
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
  const isMobile = useIsMobile();
  const ref = useRef<HTMLAnchorElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <Link href={link} passHref legacyBehavior>
      <motion.a
        ref={ref}
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
        whileHover={isMobile ? undefined : { y: -8 }}
        className={`group relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br ${color} shadow-[0_25px_60px_-25px_rgba(11,26,51,0.35)] block`}
      >
        <motion.img
          style={isMobile ? undefined : { y, willChange: "transform" }}
          src={img} alt={name} loading="lazy" width={800} height={800}
          className={`absolute inset-0 w-full object-cover ${isMobile ? "h-full" : "h-[120%]"}`}
        />
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
          className="mt-10"
        >
          <Link href="/#products" onClick={(e) => {
            const elem = document.getElementById("products");
            if (elem) {
              e.preventDefault();
              elem.scrollIntoView({ behavior: "smooth" });
            }
          }}>
            <MagneticButton className="inline-flex items-center gap-3 rounded-full bg-blue px-10 py-5 text-lg font-bold text-navy hover:brightness-110 transition-all">
              Browse Collection <ArrowRight className="h-5 w-5" />
            </MagneticButton>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
