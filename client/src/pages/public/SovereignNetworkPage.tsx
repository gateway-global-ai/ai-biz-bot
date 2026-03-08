/**
 * Sovereign Network — deep-dive page: shadow telecom, QR network, Legacy vs Sovereign architecture.
 * Linked from the landing summary section (below hero). Public route: /network.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, QrCode, Wifi, Server, Bot, Shield, Zap } from "lucide-react";

const MERMAID_DIAGRAM = `
flowchart TD
    subgraph legacy["Legacy Telephony (The Old Way)"]
        A1[Customer Phone] -->|"Dials 10 Digits"| B1[Cell Tower / Carrier]
        B1 -->|Routing| C1[PSTN / Telecom Grid]
        C1 -->|Carrier Fees| D1[SIP Trunk / Twilio]
        D1 -->|Audio Degradation| E1[Business PBX / Router]
        E1 -->|High Latency| F1["Robotic IVR Press 1..."]
    end

    subgraph sovereign["Clear Voice AI (The Sovereign Way)"]
        A2[Customer Phone Camera] -->|"Scans QR Code"| B2["Mobile Browser /biz/:slug"]
        B2 -->|Bypasses Telecom| C2[Direct WebSocket Connection]
        C2 -->|"16kHz Lossless Audio"| D2[Your Node.js Server / Router]
        D2 -->|"Sub-150ms Stream"| E2[Gemini Voice AI Swarm]
    end
`.trim();

export default function SovereignNetworkPage() {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [diagramError, setDiagramError] = useState<string | null>(null);

  useEffect(() => {
    const el = diagramRef.current;
    if (!el) return;

    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });
        if (cancelled) return;
        const id = "sovereign-network-diagram";
        const { svg } = await mermaid.render(id, MERMAID_DIAGRAM);
        if (cancelled) return;
        el.innerHTML = svg;
      } catch (err: any) {
        if (!cancelled) setDiagramError(err?.message || "Failed to render diagram");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/business">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Intro — bedrock / unicorn */}
        <section>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            The Architecture: What We Actually Built
          </h1>
          <p className="text-slate-300 leading-relaxed text-lg">
            When you strip away the UI and the branding, you haven&apos;t just built an AI wrapper.{" "}
            <strong className="text-white">You have built a shadow telecom network.</strong> You completely bypassed the legacy Public Switched Telephone Network (PSTN), the telecom carriers, and the SIP trunk providers (like Twilio and Plivo), and replaced them with the open web.
          </p>
        </section>

        {/* Diagram */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">
            Legacy Telecom vs. Sovereign OS
          </h2>
          <Card className="bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-sui p-6 overflow-x-auto">
            {diagramError ? (
              <p className="text-amber-400 text-sm">{diagramError}</p>
            ) : (
              <div ref={diagramRef} className="mermaid-container flex justify-center min-h-[320px]" />
            )}
          </Card>
        </section>

        {/* Component breakdown */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">The Component Breakdown</h2>
          <p className="text-slate-400 mb-8">
            Here is how your custom pieces replace the billion-dollar telecom infrastructure:
          </p>
          <div className="space-y-6">
            <Card className="bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-sui p-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-sui bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">1. The QR Code is the New Phone Number</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    In the old world, a 10-digit phone number is just an address that tells the global telecom grid where to route an audio signal. Your QR code does the exact same thing, but better. It acts as a physical address that instantly routes the user&apos;s browser to your specific siteConfigId (via the URL slug). No dialing, no typos, no area codes.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-sui p-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-sui bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">2. WebSockets are the New SIP Trunks</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    A SIP (Session Initiation Protocol) trunk is just a digital pipe that carries voice data over the internet, heavily controlled by telecom gateways that charge per minute. You replaced this with standard, open-web WebSockets running a 16kHz audio stream. It is a direct, unfiltered pipe from the customer&apos;s laptop or smartphone microphone straight into your server.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-sui p-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-sui bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3. Your Node.js Server is the New PBX</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    A PBX (Private Branch Exchange) is the expensive hardware or software a business uses to route calls (&quot;Press 1 for Sales, 2 for Support&quot;). Your Express server and routing logic <em>is</em> the PBX. It catches the WebSocket connection, checks the URL slug to see which business was scanned, and instantly routes the audio to that specific business&apos;s AI Concierge.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-sui p-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-sui bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">4. Gemini is the New Receptionist</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Instead of hitting a frustrating IVR tree or sitting on hold listening to elevator music, the audio bytes are piped directly into the AI. Because there are no telecom gateways slowing down the data, the AI can respond with near-zero latency, mimicking real human conversation.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Economic moat */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">The Economic Moat</h2>
          <p className="text-slate-400 mb-6">
            By building this, you completely eliminate the &quot;Telecom Tax.&quot;
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Zero 10DLC Compliance:</strong>{" "}
                <span className="text-slate-400">You don&apos;t have to register your voice agents with AT&T or Verizon to avoid being blocked as spam.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Zero Per-Minute Carrier Fees:</strong>{" "}
                <span className="text-slate-400">You aren&apos;t paying Twilio $0.015 per minute just to hold the line open. You only pay for the raw compute (Gemini API tokens).</span>
              </div>
            </li>
            <li className="flex gap-3">
              <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Infinite Scalability:</strong>{" "}
                <span className="text-slate-400">A traditional business phone line can only handle one call at a time unless they pay for more &quot;lines.&quot; Your QR code can be scanned by 5,000 customers simultaneously, and your server will instantly spin up 5,000 individual WebSocket streams to 5,000 AI agents.</span>
              </div>
            </li>
          </ul>
          <p className="text-slate-400 mt-8 italic">
            You didn&apos;t just build a software feature. You built a pirate radio station that completely circumvents the establishment grid.
          </p>
        </section>

        {/* Footer CTA */}
        <section className="pt-8 border-t border-white/10">
          <Link href="/business">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-sui font-semibold">
              Join the network
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
}
