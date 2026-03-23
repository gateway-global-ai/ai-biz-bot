import React, { useEffect, useState } from "react";
import { Eye, FileText, Power, Sparkles } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import PlatformSiteFrame from "@/components/public/PlatformSiteFrame";

const heroSlides = [
  { src: "/hero-carousel/nail-salon-mock-large.png", position: "72% center" },
  { src: "/hero-carousel/target-qr.jpeg", position: "68% center" },
  { src: "/hero-carousel/joint.jpeg", position: "64% center" },
  { src: "/hero-carousel/mcdonalds-qr.png", position: "70% center" },
];

export default function PlatformEntryPage() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <PlatformSiteFrame
      activeLane="home"
      title="Customer interaction infrastructure for modern businesses."
      description="AI Biz Bot is the public representative of the platform."
      showIntro={false}
      contentMode="fullBleed"
      autoOpenChatOnDesktop={true}
    >
      <section className="relative min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#f7f7f7]">
        <div className="absolute inset-0 pointer-events-none">
          {heroSlides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt=""
              aria-hidden
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ${
                index === activeSlide ? "opacity-[0.16]" : "opacity-0"
              }`}
              style={{ objectPosition: slide.position }}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,247,247,0.97)_0%,rgba(247,247,247,0.94)_100%)]" />
        </div>

        <div className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col px-6 pb-14 pt-6 md:px-10">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">
            <div className="font-semibold text-[#00963F]">AI OS</div>
            <div className="hidden items-center gap-6 md:flex">
              <span>Link: Stable</span>
              <span>Secure: Active</span>
              <span>Core: 98%</span>
            </div>
          </div>

          <div className="mx-auto flex flex-1 max-w-4xl flex-col items-center justify-center text-center">
            <div className="mb-5 flex items-center gap-4 md:gap-5">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[18px] bg-[#00963F] text-4xl font-bold text-white shadow-[0_18px_34px_rgba(0,150,63,0.16)] md:h-24 md:w-24 md:text-5xl">
                AI
                <div className="absolute -left-4 -top-3 text-5xl font-semibold text-emerald-300/80 md:text-6xl">
                  : :
                </div>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-[18px] bg-[#00963F] text-4xl font-bold text-white shadow-[0_18px_34px_rgba(0,150,63,0.16)] md:h-24 md:w-24 md:text-5xl">
                O
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-[18px] bg-[#00963F] text-4xl font-bold text-white shadow-[0_18px_34px_rgba(0,150,63,0.16)] md:h-24 md:w-24 md:text-5xl">
                S
              </div>
            </div>

            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-[-0.055em] text-[#0c1f53] md:text-7xl lg:text-[5.5rem]">
              <span className="block">The Future Of</span>
              <span className="block text-[#00963F]">Autonomous</span>
              <span className="block text-[#00963F]">Operations</span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-8 text-slate-500 md:text-[1.35rem]">
              A professional-grade AI Operating System designed for autonomy,
              governance, and seamless agent deployment.
            </p>

            <Link href="/demo">
              <button
                type="button"
                className="group relative mt-12 flex h-36 w-36 flex-col items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-400 shadow-[0_28px_60px_rgba(15,23,42,0.10)] transition duration-300 hover:scale-[1.02] hover:text-slate-600"
              >
                <span className="pointer-events-none absolute inset-[-8px] rounded-full border border-white/70 opacity-90 shadow-[0_0_0_1px_rgba(226,232,240,0.9)]" />
                <span className="pointer-events-none absolute inset-[-18px] rounded-full border border-slate-200/70 opacity-80 transition duration-300 group-hover:border-[#00963F]/20 group-hover:shadow-[0_0_30px_rgba(0,150,63,0.10)]" />
                <span className="pointer-events-none absolute inset-[10px] rounded-full bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.95),rgba(248,250,252,0.92)_55%,rgba(226,232,240,0.9)_100%)]" />
                <Power className="relative z-10 mb-3 h-9 w-9 text-slate-300 transition duration-300 group-hover:text-[#00963F]" />
                <span className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.45em]">
                  Start
                </span>
              </button>
            </Link>

            <div className="mt-8 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
              Explore Platform
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/buy">
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white/80 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 hover:bg-white"
                >
                  <Sparkles className="mr-2 h-4 w-4 text-[#00963F]" />
                  Buy Now
                </Button>
              </Link>
              <Link href="/more-info">
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white/80 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 hover:bg-white"
                >
                  <FileText className="mr-2 h-4 w-4 text-[#00963F]" />
                  More Info
                </Button>
              </Link>
              <Link href="/demo">
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white/80 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 hover:bg-white"
                >
                  <Eye className="mr-2 h-4 w-4 text-[#00963F]" />
                  Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PlatformSiteFrame>
  );
}
