/**
 * ClaimSite — the business owner's claim experience.
 *
 * Flow:
 *   1. Token validation → show site preview + $49.99 CTA
 *   2. "Claim This Website" → OTP verification (SMS to assigned phone)
 *   3. OTP confirmed → Stripe Checkout ($49.99 activation)
 *   4. Payment success → poll /api/claim/:token/success → redirect to /my-account
 *
 * Route: /claim/:token
 */
import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle2, AlertTriangle, Globe, Sparkles,
  Phone, ArrowRight, Shield, Zap, Star, MessageSquare,
  CreditCard, RefreshCw, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import gatewayLogo from "@assets/gatewaylogo_header_left_1770354860467.png";

type Step = "loading" | "preview" | "verify_phone" | "otp" | "checkout" | "polling" | "success" | "error" | "already_claimed";

interface SiteData {
  id: string;
  name: string;
  placeId: string | null;
  heroImageUrl: string | null;
  domain: string | null;
  assignedPhone: string | null;
}

const FEATURES = [
  { icon: <MessageSquare className="w-4 h-4" />, label: "AI Chat Concierge",  desc: "24/7 customer conversations" },
  { icon: <Phone className="w-4 h-4" />,         label: "Voice AI Agent",     desc: "Answers calls automatically" },
  { icon: <Globe className="w-4 h-4" />,          label: "Custom Website",    desc: "Built for your business" },
  { icon: <Star className="w-4 h-4" />,            label: "Review Management", desc: "Showcase your 5-star ratings" },
];

export default function ClaimSite() {
  const [, params] = useRoute("/claim/:token");
  const token = params?.token ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep]         = useState<Step>("loading");
  const [site, setSite]         = useState<SiteData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [otp, setOtp]           = useState("");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // ── Step 1: validate token on mount ────────────────────────────────────────
  useEffect(() => {
    if (!token) { setStep("error"); setErrorMsg("No claim token provided."); return; }

    fetch(`/api/claim/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.claimed) { setStep("already_claimed"); return; }
        if (data.expired || !data.valid) {
          setStep("error");
          setErrorMsg(data.error || "This claim link is invalid or has expired.");
          return;
        }
        setSite(data.site);
        setStep("preview");
      })
      .catch(() => { setStep("error"); setErrorMsg("Network error — please try again."); });
  }, [token]);

  // ── Step 2: send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/claim/${token}/send-otp`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setStep("otp");
      toast({ title: "Code sent!", description: `SMS sent to ${data.phone}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }, [token, toast]);

  // ── Step 3: verify OTP + get Stripe URL ─────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    if (otp.length < 6) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/claim/${token}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp, name: name || undefined, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setOtp("");
    } finally {
      setBusy(false);
    }
  }, [token, otp, name, email, toast]);

  // ── Step 4: poll for activation after returning from Stripe success URL ──────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id") && step !== "polling" && step !== "success") {
      setStep("polling");
    }
  }, [step]);

  useEffect(() => {
    if (step !== "polling") return;
    if (pollCount > 20) { setStep("success"); return; }

    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/claim/${token}/success`);
        const data = await res.json();
        if (data.claimed) { setStep("success"); return; }
      } catch { /* keep polling */ }
      setPollCount((c) => c + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [step, pollCount, token]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const heroGradient = site?.heroImageUrl
    ? `url(${site.heroImageUrl})`
    : "linear-gradient(135deg, #0F172A 0%, #1e1b4b 50%, #0F172A 100%)";

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-sui bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Link Expired</h1>
        <p className="text-slate-400 max-w-sm">{errorMsg}</p>
        <p className="text-sm text-slate-600">Contact the person who sent you this link for a new one.</p>
      </div>
    );
  }

  if (step === "already_claimed") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-sui bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Already Activated</h1>
        <p className="text-slate-400 max-w-sm">This website has already been claimed and activated.</p>
        <Button onClick={() => setLocation("/my-account")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px]">
          Go to My Account
        </Button>
      </div>
    );
  }

  if (step === "polling") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-5 text-center px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center"
        >
          <Zap className="w-6 h-6 text-indigo-400" />
        </motion.div>
        <h1 className="text-xl font-bold text-white">Activating your website…</h1>
        <p className="text-slate-400 text-sm">Confirming payment. This takes just a moment.</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 text-center px-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          className="w-20 h-20 rounded-sui bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto animate-sovereign-pulse"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            🎉 Website Activated!
          </h1>
          <p className="text-slate-300 text-sm max-w-xs mx-auto">
            <strong className="text-white">{site?.name ?? "Your website"}</strong> is now live with AI voice, chat, and your business profile.
          </p>
        </div>
        <div className="space-y-2 w-full max-w-xs">
          <Button onClick={() => setLocation("/my-account")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px] h-11 font-semibold shadow-lg shadow-indigo-500/20">
            Manage My Website
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-slate-600">Check your phone for a welcome SMS with your login link.</p>
        </div>
      </motion.div>
    );
  }

  // ── Main claim page ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="sovereign-bar px-6 py-3 flex items-center justify-between">
        <img src={gatewayLogo} alt="Gateway Global AI" className="h-8 w-auto opacity-90" />
        <span className="badge-insight">Exclusive Invite</span>
      </nav>

      {/* Hero banner */}
      <div
        className="relative h-48 sm:h-64 w-full overflow-hidden"
        style={{ background: heroGradient, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
        <div className="absolute bottom-6 left-6 right-6">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg"
          >
            {site?.name}
          </motion.h1>
          {site?.domain && (
            <p className="text-slate-400 text-sm mt-1">{site.domain}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-6 space-y-5">

        {/* What you get */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-sui bg-slate-900/60 backdrop-blur-xl border border-indigo-500/15 p-5 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="font-bold text-white text-sm">Your AI-Powered Website Includes</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f) => (
              <div key={f.label}
                className="flex items-start gap-2 p-3 rounded-[14px] bg-slate-800/40 border border-slate-700/30">
                <span className="text-indigo-400 mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-white">{f.label}</p>
                  <p className="text-[10px] text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pricing CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-sui bg-indigo-950/60 backdrop-blur-xl border border-indigo-500/25 p-5 shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Activation Price</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-bold text-white">$49.99</span>
                <span className="text-slate-400 text-sm">one-time</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Then</p>
              <p className="text-sm font-semibold text-slate-300">$0/mo free tier</p>
              <p className="text-[10px] text-slate-600">Upgrade anytime</p>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {["Lifetime free tier included", "500 AI voice minutes included", "No subscription required to start", "Upgrade plans available anytime"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          {/* CTA — changes based on step */}
          <AnimatePresence mode="wait">
            {step === "preview" && (
              <motion.div key="preview-cta"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  onClick={() => setStep("verify_phone")}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px] font-bold text-sm shadow-lg shadow-indigo-500/25"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Claim This Website — $49.99
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-[10px] text-center text-slate-600 mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Secured by Stripe · No card stored until checkout
                </p>
              </motion.div>
            )}

            {step === "verify_phone" && (
              <motion.div key="verify-phone"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="rounded-[14px] bg-slate-800/40 border border-slate-700/30 p-3">
                  <p className="text-xs text-slate-400 mb-2">
                    We'll send a verification code to the phone number on this invite
                    {site?.assignedPhone ? ` (${site.assignedPhone})` : ""}.
                  </p>
                  {/* Optional name/email capture before OTP */}
                  <div className="space-y-2 mb-3">
                    <Input
                      placeholder="Your name (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 bg-slate-900/60 border-slate-700 text-white text-sm rounded-[10px]"
                    />
                    <Input
                      placeholder="Email for receipt (optional)"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 bg-slate-900/60 border-slate-700 text-white text-sm rounded-[10px]"
                    />
                  </div>
                  <Button
                    onClick={handleSendOtp}
                    disabled={busy}
                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[10px] text-sm font-semibold"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                      <Phone className="w-3.5 h-3.5 mr-2" />Send Verification Code
                    </>}
                  </Button>
                </div>
                <button onClick={() => setStep("preview")} className="text-xs text-slate-600 hover:text-slate-400 w-full text-center transition-colors">
                  ← Back
                </button>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div key="otp-step"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <p className="text-xs text-slate-400 text-center">
                  Enter the 6-digit code sent to your phone
                </p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="bg-slate-800/60 border-slate-700 text-white" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={busy || otp.length < 6}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[10px] font-semibold text-sm shadow-lg shadow-indigo-500/20"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                  {busy ? "Verifying…" : "Verify & Proceed to Payment"}
                </Button>
                <button
                  onClick={handleSendOtp}
                  disabled={busy}
                  className="w-full text-xs text-slate-600 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />Resend code
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-1"
        >
          <p className="text-xs text-slate-600">Trusted by businesses across North America</p>
          <div className="flex items-center justify-center gap-3">
            {["30-sec build", "AI voice + chat", "Free to start"].map((badge) => (
              <span key={badge} className="data-chip">{badge}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
