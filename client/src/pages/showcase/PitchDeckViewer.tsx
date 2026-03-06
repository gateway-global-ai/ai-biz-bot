/**
 * Pitch Deck Viewer — Deep research / market-fit presentations.
 * Fetches deck by slug from GET /api/pitch-decks/:slug and renders investor-demo style sections.
 */
import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { Menu, X, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

export type PitchDeckSlide = {
  sectionId: string;
  label: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  highlight?: string;
  /** Optional background image URL for this section (e.g. /pitch-decks/the-joint/reception.png) */
  backgroundImage?: string;
};

export type PitchDeckContent = {
  slides: PitchDeckSlide[];
  /** Optional hero section background image URL */
  heroBackgroundImage?: string;
};

export type PitchDeck = {
  id: string;
  slug: string;
  title: string;
  businessName: string;
  category: string;
  industry: string;
  content: PitchDeckContent;
  createdAt: string;
  updatedAt: string;
};

const scrollToSection = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function PitchDeckViewer() {
  const [, params] = useRoute("/pitch-decks/:slug");
  const slug = params?.slug ?? "";
  const [deck, setDeck] = useState<PitchDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("No deck specified");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/pitch-decks/${encodeURIComponent(slug)}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Pitch deck not found" : "Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setDeck(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load deck");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6">
        <motion.div
          className="max-w-md rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-8 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-slate-300 mb-4">{error ?? "Pitch deck not found."}</p>
          <Link href="/investor-demo">
            <a className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
              <ArrowLeft size={18} /> Back to Investor Demo
            </a>
          </Link>
        </motion.div>
      </div>
    );
  }

  const slides = deck.content?.slides ?? [];
  const navItems = slides.filter((s) => s.sectionId).map((s) => ({ id: s.sectionId, label: s.label }));

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#0B1120]/95 border-b border-[#3B82F6]/10 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/investor-demo">
            <a className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
              <ArrowLeft size={20} /> <span className="font-medium">{deck.businessName}</span>
            </a>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={scrollToSection(id)}
                className="text-sm text-slate-400 hover:text-indigo-400 transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-[#3B82F6]/10 bg-[#0B1120]/98 backdrop-blur-xl px-6 py-4 flex flex-col gap-2">
            {navItems.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => {
                  scrollToSection(id)({} as React.MouseEvent);
                  setMenuOpen(false);
                }}
                className="text-slate-400 hover:text-indigo-400 py-2"
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main className="pb-24">
        {/* Hero from deck meta */}
        <section className="relative min-h-[70vh] flex flex-col justify-center px-6 pt-28 pb-16 border-b border-[#3B82F6]/10 overflow-hidden">
          {deck.content?.heroBackgroundImage && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${deck.content.heroBackgroundImage})` }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-[#0B1120]/75" aria-hidden />
            </>
          )}
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.span
              className="inline-block mb-3 text-xs font-bold tracking-widest text-indigo-400 uppercase"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {deck.category} · {deck.industry}
            </motion.span>
            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4 text-white"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {deck.title}
            </motion.h1>
            <motion.p
              className="text-xl text-slate-400"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {deck.businessName}
            </motion.p>
          </div>
        </section>

        {/* Slides from content */}
        {slides.map((slide, idx) => (
          <section
            key={slide.sectionId || idx}
            id={slide.sectionId || undefined}
            className="relative py-24 border-b border-[#3B82F6]/10 overflow-hidden"
          >
            {slide.backgroundImage && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${slide.backgroundImage})` }}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-[#0B1120]/80" aria-hidden />
              </>
            )}
            {!slide.backgroundImage && <div className="absolute inset-0 bg-[#0B1120]/80" aria-hidden />}
            <div className="container mx-auto px-6 relative z-10">
              <div className="max-w-3xl mx-auto mb-12 text-center">
                <span className="inline-block mb-3 text-xs font-bold tracking-widest text-indigo-400 uppercase">
                  {slide.label}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">{slide.title}</h2>
                {slide.subtitle && <p className="text-slate-400">{slide.subtitle}</p>}
              </div>
              {(slide.bullets?.length ?? 0) > 0 && (
                <motion.ul
                  className="max-w-2xl mx-auto space-y-4"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                >
                  {slide.bullets!.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl text-slate-300"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 text-sm font-bold">
                        {i + 1}
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
              {slide.highlight && (
                <motion.div
                  className="mt-8 max-w-2xl mx-auto p-6 rounded-sui bg-indigo-500/10 border border-indigo-500/30 text-center"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <p className="text-indigo-200 font-medium">{slide.highlight}</p>
                </motion.div>
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
