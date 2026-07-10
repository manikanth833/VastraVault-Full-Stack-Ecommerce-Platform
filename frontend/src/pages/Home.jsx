import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowRight, Sparkles, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchProducts, fetchCategories } from "../features/productSlice";
import ProductCard from "../components/ProductCard";
import { ProductCatalogSkeleton } from "../components/Skeletons";

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80",
    title: "Timeless Heritage In Every Thread",
    subtitle: "Exquisite Banarasi and Kanjeevaram handloom masterpieces, curated for elegant occasions and heirloom wardrobes.",
    cta: "Explore Silk Collection",
    link: "/catalog?category=silk-sarees",
  },
  {
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1600&q=80",
    title: "Lightweight Grace For Every Season",
    subtitle: "Hand-spun cotton and linen sarees with a refined drape, made to feel effortless and luxurious.",
    cta: "Shop Cotton and Linen",
    link: "/catalog?category=cotton-linen",
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Authentic handloom sourcing",
    description: "Directly sourced from certified artisan looms with Silk Mark verification.",
  },
  {
    icon: Truck,
    title: "Free global shipping",
    description: "Enjoy free insured shipping on all orders over Rs 2,000.",
  },
  {
    icon: RotateCcw,
    title: "Easy returns and exchanges",
    description: "Hassle-free 7-day returns with convenient pickup service.",
  },
];

export default function Home() {
  const dispatch = useDispatch();
  const { products, categories, loading } = useSelector((state) => state.products);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const bestSellers = products?.slice(0, 4) || [];
  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const navbarOffset = 96;
    const top = window.scrollY + target.getBoundingClientRect().top - navbarOffset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="space-y-24 pb-20">
      {/* Hero */}
      <section className="relative isolate min-h-[88vh] overflow-hidden bg-charcoal-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_34%),linear-gradient(135deg,rgba(16,16,16,0.92),rgba(16,16,16,0.5)_48%,rgba(16,16,16,0.84))] z-10" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <img
              src={HERO_SLIDES[currentSlide].image}
              alt="Ananya Sarees hero banner"
              className="h-full w-full object-cover object-top"
            />

            <div className="absolute inset-0 z-20 flex items-center">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_0.75fr]">
                  <div className="max-w-3xl space-y-7 text-left text-white">
                    <motion.span
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-300 backdrop-blur-sm"
                    >
                      <Sparkles className="h-4 w-4 fill-gold-300" />
                      Crafted by Indian artisans
                    </motion.span>

                    <motion.h1
                      initial={{ y: 28, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.28 }}
                      className="max-w-2xl font-serif text-4xl leading-[1.05] text-white sm:text-6xl lg:text-7xl"
                    >
                      {HERO_SLIDES[currentSlide].title}
                    </motion.h1>

                    <motion.p
                      initial={{ y: 22, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.42 }}
                      className="max-w-2xl text-base leading-8 text-neutral-200 sm:text-lg"
                    >
                      {HERO_SLIDES[currentSlide].subtitle}
                    </motion.p>

                    <motion.div
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.56 }}
                      className="flex flex-wrap items-center gap-4 pt-2"
                    >
                      <Link
                        to={HERO_SLIDES[currentSlide].link}
                        className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-charcoal-900 shadow-[0_18px_40px_rgba(212,175,55,0.22)] transition-all hover:bg-gold-400 hover:shadow-[0_18px_46px_rgba(212,175,55,0.28)]"
                      >
                        {HERO_SLIDES[currentSlide].cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/catalog"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                      >
                        Browse All
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.68 }}
                      className="flex flex-wrap gap-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-300"
                    >
                      <button
                        type="button"
                        onClick={() => scrollToSection("homepage-trust")}
                        className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-1.5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                      >
                        Silk Mark Certified
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToSection("homepage-heritage")}
                        className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-1.5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                      >
                        Handloom Heritage
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToSection("homepage-collections")}
                        className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-1.5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                      >
                        Curated Collections
                      </button>
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="hidden lg:block"
                  >
                    <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.18)] backdrop-blur-md">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-300">Editorial highlight</p>
                      <div className="mt-4 aspect-[4/5] overflow-hidden rounded-[22px] border border-white/10">
                        <img
                          src={HERO_SLIDES[currentSlide].image}
                          alt="Hero preview"
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                      <div className="mt-5 space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-300">This season</p>
                        <p className="font-serif text-2xl leading-tight">{HERO_SLIDES[currentSlide].title}</p>
                        <p className="text-sm leading-6 text-neutral-200">{HERO_SLIDES[currentSlide].subtitle}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center gap-3">
          {HERO_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === currentSlide ? "w-14 bg-gold-500" : "w-8 bg-white/35 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Value Props */}
      <section id="homepage-trust" className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">The Ananya promise</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-wide text-royal-red-900">
            Crafted for discerning wardrobes
          </h2>
          <p className="text-sm sm:text-base leading-7 text-neutral-600">
            Every piece is curated to feel elegant, breathable, and rooted in textile heritage.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-gold-50 p-3 text-gold-600">
                    <Icon className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-xl font-bold text-charcoal-900">{feature.title}</h4>
                    <p className="text-sm leading-6 text-neutral-500">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Collections */}
      <section id="homepage-collections" className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">Shop the edit</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-royal-red-900 font-bold tracking-wide">
            Shop By Fabric
          </h2>
          <p className="text-neutral-500 text-sm sm:text-base leading-7">
            Choose from our premium handwoven materials, each telling its own heritage story.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/catalog?category=${cat.slug}`}
              className="group relative h-[420px] overflow-hidden rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/82 via-black/25 to-transparent transition-opacity duration-300 group-hover:from-black/88" />
              <img
                src={cat.image_url}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 z-20 space-y-3 p-8 text-white">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-300 backdrop-blur-sm">
                  Category
                </span>
                <h3 className="font-serif text-2xl font-bold tracking-wide">{cat.name}</h3>
                <p className="max-w-sm text-sm leading-6 text-neutral-200 line-clamp-2">{cat.description}</p>
                <span className="inline-flex items-center gap-1 pt-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 transition-colors group-hover:text-gold-200">
                  View Collection <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section id="homepage-heritage" className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">Curated for you</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-royal-red-900 font-bold tracking-wide">
              Featured Sarees
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-neutral-500 hidden sm:block">
              Top curated picks based on design freshness and user feedback.
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-full border border-royal-red-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-royal-red-900 transition-colors hover:bg-royal-red-900 hover:text-white"
          >
            All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <ProductCatalogSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Brand Story */}
      <section className="relative overflow-hidden bg-royal-red-900 py-24 text-white">
        <div className="absolute top-0 right-0 h-full w-1/3 opacity-10 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),transparent_25%,rgba(0,0,0,0.18))]" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-500">The Threads of Ananya</span>
              <h2 className="font-serif text-4xl font-bold tracking-wide text-stroke-gold sm:text-5xl">
                Woven In Heritage, Worn in Grace
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 font-light text-neutral-200">
              For generations, the Indian saree has been more than attire; it is a canvas of cultural history, woven with mathematical precision and artistic devotion.
            </p>
            <p className="max-w-xl text-base leading-8 font-light text-neutral-200">
              Ananya was born out of a desire to revive dying looms and celebrate master artisans. We work closely with family-owned loom clusters in Varanasi, Kanchipuram, and Chanderi to preserve authentic silk, zari, and embroidery standards.
            </p>
            <div className="pt-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-full border border-gold-500 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-gold-300 transition-all hover:bg-gold-500 hover:text-charcoal-900"
              >
                Our Legacy Story <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-white/10 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80"
              alt="Indian loom weaving silk saree"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
