/**
 * Digital Franchise recruitment landing page.
 * Pitch: "Business in a Box" — the AI is the product, support, and salesperson.
 * Angle: "The heavy lifting is over. Own a piece of the AI Telephony network."
 */

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Mic, Shield, Zap, ChevronRight, Radio, MessageSquare } from "lucide-react";

const CTA_URL = "/billing"; // or dedicated /franchise-checkout when available
const CTA_LABEL = "Start Your AI Fleet — $49/mo";

/** Profit calculator rows */
const FLEET_ROWS = [
  { clients: 10, monthlyMinutes: "5,000", profit: "$250" },
  { clients: 50, monthlyMinutes: "25,000", profit: "$1,250" },
  { clients: 200, monthlyMinutes: "100,000", profit: "$5,000" },
] as const;

export default function ResellerRecruitment() {
  const [miniNavOpen, setMiniNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/">
            <span className="font-bold text-lg text-white hover:text-cyan-400 transition-colors cursor-pointer">
              Gateway Global
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/kimi-audio">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <Mic className="w-4 h-4 mr-2" />
                Voice AI
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* 1. Hero — "Zuckerberg" Hook */}
        <section className="container mx-auto px-4 py-16 md:py-24 text-center max-w-4xl">
          <p className="text-cyan-400 font-medium tracking-wide uppercase text-sm mb-4">
            Digital Franchise — Business in a Box
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Own the Voice of Every Small Business in Your City.
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            We've spent millions building the world's first AI Business Partner. You just deploy it.
            Every time our AI answers a phone call or saves a customer, you get paid.{" "}
            <span className="text-cyan-400 font-semibold">$.10 a minute, 24/7, while you sleep.</span>
          </p>
          <Link href={CTA_URL}>
            <Button
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-lg px-8 py-6 rounded-xl shadow-lg shadow-cyan-500/25"
            >
              {CTA_LABEL}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </section>

        {/* 2. Features — "Elon Efficiency" Flywheel */}
        <section className="container mx-auto px-4 py-16 md:py-20 border-t border-white/5">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            The Flywheel We Built for You
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                The Self-Healing Network (404 Recovery)
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Never lose a lead. Our built-in <strong className="text-slate-300">Gateway Navigator</strong> intercepts
                every dead link and error page on your clients' sites, turning potential bounces into high-value sales
                conversations. It doesn't just fix errors; it closes deals.
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                <Radio className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">The Clear Voice Advantage</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                No robotic lag. No "press 1 for sales." Our proprietary <strong className="text-slate-300">Clear Voice</strong> technology
                (powered by Gemini) provides real-time, human-grade voice intelligence on the web and on the phone. Your
                clients get a 1st Class receptionist for 1/10th the cost of a human.
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Automated Energy Billing</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We've built the "Toll Gate" for you. Your customers buy <strong className="text-slate-300">Partner Energy</strong> in bulk.
                Our system tracks every second of usage across voice, SMS, and chat. Our Automated Billing Engine tracks
                usage to the second, rounding up for your profit. You never have to send an invoice; the system collects
                the Partner Energy fees for you. You sit back and watch the commission hit your dashboard in real-time.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Profit Calculator — "Dopamine" Math */}
        <section className="container mx-auto px-4 py-16 md:py-20 border-t border-white/5">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Scale Your Fleet</h2>
          <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto">
            See how fast your net profit grows as you add clients. $.10/min margin, 24/7.
          </p>
          <div className="overflow-x-auto max-w-2xl mx-auto">
            <table className="w-full border border-slate-700 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-800/80">
                  <th className="text-left py-4 px-4 font-semibold text-slate-200">Your Fleet</th>
                  <th className="text-left py-4 px-4 font-semibold text-slate-200">Monthly Voice Minutes</th>
                  <th className="text-left py-4 px-4 font-semibold text-cyan-400">Your Net Profit (Est)</th>
                </tr>
              </thead>
              <tbody>
                {FLEET_ROWS.map((row) => (
                  <tr key={row.clients} className="border-t border-slate-700 hover:bg-slate-800/50">
                    <td className="py-4 px-4 font-medium text-white">{row.clients} Clients</td>
                    <td className="py-4 px-4 text-slate-300">{row.monthlyMinutes} mins</td>
                    <td className="py-4 px-4 font-bold text-cyan-400">{row.profit} / mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-sm text-center mt-4">
            * Based on a standard $.05 markup over wholesale infrastructure costs.
          </p>
        </section>

        {/* 4. Social Proof — "UNLOCKED" (background loop feel) */}
        <section className="container mx-auto px-4 py-16 md:py-20 border-t border-white/5 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-[0.07]">
            <span
              className="font-mono text-[8rem] md:text-[12rem] font-bold text-cyan-400 select-none"
              style={{
                animation: "unlocked-glow 3s ease-in-out infinite",
              }}
            >
              UNLOCKED
            </span>
          </div>
          <style>{`
            @keyframes unlocked-glow {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.02); }
            }
          `}</style>
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <div className="inline-block px-6 py-3 rounded-full border border-cyan-500/40 bg-cyan-500/10 mb-6">
              <span className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">UNLOCKED</span>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed">
              This is the moment your client realizes their business just leveled up. When they see the Navigator
              unlock their dashboard, they aren't just a customer anymore—they are a partner for life.
            </p>
          </div>
        </section>

        {/* 5. Closing — "Flywheel" */}
        <section className="container mx-auto px-4 py-16 md:py-24 border-t border-white/5 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Stop Trading Time for Money. Start Trading AI Energy.
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
            The world is moving to Voice AI. You can either build the infrastructure (which cost us millions) or you can
            own the access points. Join the Gateway Global network today.
          </p>
          <Link href={CTA_URL}>
            <Button
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-8 py-6 rounded-xl"
            >
              {CTA_LABEL}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </section>
      </main>

      {/* Mini-Navigator widget (corner) */}
      <div className="fixed bottom-6 right-6 z-30">
        {miniNavOpen ? (
          <div className="bg-slate-900 border border-slate-600 rounded-2xl shadow-2xl p-4 w-80">
            <p className="text-slate-300 text-sm mb-4">
              Hey, I'm the Gateway Navigator. I'm the one who will be answering your clients' phones. Want to see how
              much commission I can generate for you today?
            </p>
            <div className="flex gap-2">
              <Link href="/kimi-audio">
                <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950">
                  Try Voice Demo
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => setMiniNavOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMiniNavOpen(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-3 rounded-xl shadow-lg transition-transform hover:scale-105"
            aria-label="Open Gateway Navigator"
          >
            <MessageSquare className="w-5 h-5" />
            Ask the Navigator
          </button>
        )}
      </div>
    </div>
  );
}
