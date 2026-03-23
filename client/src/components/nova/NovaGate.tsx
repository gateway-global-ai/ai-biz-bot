/**
 * NovaGate — Inline Identity Verification + OS Entry Gate
 *
 * Renders inside ConciergePanel's content window as a full-height overlay.
 * Handles two modes:
 *   'claim'  — new owner claiming a demo site (OTP → billing summary → Stripe)
 *   'signin' — returning owner logging back in (OTP → token refresh)
 *
 * Protocol level is selected from nova_sovereign_ruleset_v1.yaml logic:
 *   Level 1 — OTP only (retail, hospitality, telecom/SaaS, platform owners)
 *   Level 5 — OTP + Magic Link + ID Upload (medical, legal, auto, construction)
 *   Level 7 — Full Van Damme (banking, real estate)
 *
 * Spec: .system_design/nova_sovereign_ruleset_v1.yaml
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Phone, ArrowRight, Check, X, Loader2,
  Lock, Star, Zap, MessageSquare, RefreshCw, ChevronLeft
} from 'lucide-react';

// ─── Protocol level resolver ─────────────────────────────────────────────────
// Maps Google Places types to IDV protocol level per nova_sovereign_ruleset_v1.yaml

const LEVEL_7_TYPES = new Set([
  'bank', 'atm', 'non_profit_organization', 'association_or_organization',
  'real_estate_agency', 'moving_company', 'storage', 'apartment_complex',
  'apartment_building', 'housing_complex', 'condominium_complex',
]);

const LEVEL_5_TYPES = new Set([
  'lawyer', 'accounting', 'consultant', 'insurance_agency', 'employment_agency',
  'marketing_consultant', 'chiropractor', 'physiotherapist', 'veterinary_care',
  'skin_care_clinic', 'medical_clinic', 'foot_care', 'doctor', 'dentist',
  'hospital', 'general_hospital', 'pharmacy', 'drugstore', 'medical_lab',
  'car_rental', 'car_dealer', 'car_repair', 'car_wash', 'tire_shop',
  'roofing_contractor', 'electrician', 'plumber', 'painter', 'general_contractor',
]);

function resolveProtocolLevel(placeTypes: string[]): 1 | 5 | 7 {
  for (const t of placeTypes) {
    if (LEVEL_7_TYPES.has(t)) return 7;
  }
  for (const t of placeTypes) {
    if (LEVEL_5_TYPES.has(t)) return 5;
  }
  return 1;
}

// ─── Billing summary data ────────────────────────────────────────────────────

const PLATFORM_PLAN = {
  software: { label: 'Small Business AI Router', price: 49, period: '/mo' },
  voice: { label: 'Voice AI Package', price: 50, period: '/mo' },
  overages: [
    { label: 'Voice AI Minutes', rate: '$0.25/min', included: '200 min/mo free' },
    { label: 'SMS Messages', rate: '$0.01/msg', included: '500 msg/mo free' },
  ],
};

// ─── Types ───────────────────────────────────────────────────────────────────

type GateStep = 'phone' | 'otp' | 'billing' | 'complete';

interface NovaGateProps {
  siteConfigId: string;
  businessName: string;
  placeTypes: string[];
  mode: 'claim' | 'signin';
  onVerified: (token: string, userId: string) => void;
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NovaGate({
  siteConfigId,
  businessName,
  placeTypes,
  mode,
  onVerified,
  onCancel,
}: NovaGateProps) {
  const protocolLevel = resolveProtocolLevel(placeTypes);
  const [step, setStep] = useState<GateStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus OTP first digit
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
  };

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const res = await fetch('/api/nova/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, siteConfigId, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setSessionId(data.sessionId ?? null);
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);
    const code = otp.join('');
    try {
      const normalized = normalizePhone(phone);
      const res = await fetch('/api/nova/verify/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, code, siteConfigId, mode, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired code');
      if (mode === 'signin') {
        // Sign in complete — token is ready
        onVerified(data.token, data.userId);
      } else {
        // Claim flow — show billing summary before Stripe
        setStep('billing');
      }
    } catch (e: any) {
      setError(e.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/nova/verify/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteConfigId, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Activation failed');
      if (data.checkoutUrl) {
        // Stripe checkout in same tab — token set after webhook
        window.location.href = data.checkoutUrl;
      } else if (data.token) {
        onVerified(data.token, data.userId);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.every(d => d) && !value.length === false) {
      // Auto-submit when all 6 digits filled
      if (next.filter(Boolean).length === 6) {
        setTimeout(() => {
          const code = next.join('');
          if (code.length === 6) handleVerifyOtp();
        }, 80);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const protocolLabel = protocolLevel === 7 ? 'Level 7 — Full Verification' :
    protocolLevel === 5 ? 'Level 5 — Enhanced Verification' :
    'Level 1 — SMS Verification';

  return (
    <div className="flex flex-col h-full bg-[#0F172A] overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          {step !== 'phone' && (
            <button
              onClick={() => { setStep(step === 'otp' ? 'phone' : 'otp'); setError(null); }}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Shield size={12} className="text-white" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">NOVA</span>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Security</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:block">{protocolLabel}</span>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 h-0.5 bg-slate-800">
        <motion.div
          className="h-full bg-indigo-500"
          animate={{ width: step === 'phone' ? '25%' : step === 'otp' ? '60%' : step === 'billing' ? '85%' : '100%' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-sm flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-sui bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                  <Phone size={24} className="text-indigo-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">
                  {mode === 'claim' ? `Claim ${businessName}` : 'Sign In'}
                </h2>
                <p className="text-sm text-slate-400">
                  {mode === 'claim'
                    ? 'Enter your mobile number to verify you\'re the business owner.'
                    : 'Enter your mobile number to access your AI OS.'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && phone.replace(/\D/g, '').length >= 10 && handleSendOtp()}
                    className="w-full pl-9 pr-4 py-3 rounded-sui bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 text-center">{error}</p>
                )}

                <button
                  onClick={handleSendOtp}
                  disabled={loading || phone.replace(/\D/g, '').length < 10}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-sui bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {loading ? 'Sending code...' : 'Send Verification Code'}
                </button>
              </div>

              <p className="text-[11px] text-slate-600 text-center">
                We'll send a one-time code via SMS. Standard rates may apply.
              </p>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-sm flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-sui bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={24} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Enter your code</h2>
                <p className="text-sm text-slate-400">
                  We sent a 6-digit code to <span className="text-white font-medium">{phone}</span>
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.join('').length < 6}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-sui bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                onClick={() => { setOtp(['','','','','','']); handleSendOtp(); }}
                className="flex items-center justify-center gap-1.5 w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw size={12} />
                Resend code
              </button>
            </motion.div>
          )}

          {step === 'billing' && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-sm flex flex-col gap-4"
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-sui bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <Check size={24} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Identity Verified</h2>
                <p className="text-sm text-slate-400">Activate your AI OS for <span className="text-white font-medium">{businessName}</span></p>
              </div>

              {/* Billing summary — Nova ShoppingCart pattern */}
              <div className="rounded-sui bg-slate-900/60 border border-slate-700/60 overflow-hidden">
                {/* Software */}
                <div className="px-4 py-3 border-b border-slate-700/40">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Software</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{PLATFORM_PLAN.software.label}</span>
                    <span className="font-mono text-sm text-emerald-400">${PLATFORM_PLAN.software.price}<span className="text-slate-500 text-xs">{PLATFORM_PLAN.software.period}</span></span>
                  </div>
                </div>
                {/* Services */}
                <div className="px-4 py-3 border-b border-slate-700/40">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Services</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{PLATFORM_PLAN.voice.label}</span>
                    <span className="font-mono text-sm text-emerald-400">${PLATFORM_PLAN.voice.price}<span className="text-slate-500 text-xs">{PLATFORM_PLAN.voice.period}</span></span>
                  </div>
                </div>
                {/* Overages */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Usage</p>
                  {PLATFORM_PLAN.overages.map(o => (
                    <div key={o.label} className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{o.label}</span>
                      <span className="font-mono text-xs text-slate-400">{o.rate}</span>
                    </div>
                  ))}
                  {PLATFORM_PLAN.overages.map(o => (
                    <p key={o.label + '-inc'} className="text-[10px] text-slate-600">{o.included}</p>
                  ))}
                </div>
                {/* Total */}
                <div className="px-4 py-3 bg-slate-800/60 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    ${PLATFORM_PLAN.software.price + PLATFORM_PLAN.voice.price}<span className="text-slate-500 text-sm font-normal">/mo</span>
                  </span>
                </div>
              </div>

              {/* IDV protocol badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-sui bg-indigo-600/10 border border-indigo-500/20">
                <Shield size={14} className="text-indigo-400 shrink-0" />
                <span className="text-xs text-indigo-300">{protocolLabel} — your identity is verified</span>
              </div>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}

              <button
                onClick={handleActivate}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-sui bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {loading ? 'Processing...' : 'Activate — $99/mo'}
              </button>

              <p className="text-[11px] text-slate-600 text-center">
                Secure checkout via Stripe. Cancel anytime. No setup fees.
              </p>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm flex flex-col items-center gap-5 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                >
                  <Check size={32} className="text-emerald-400" />
                </motion.div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Authorization Granted</h2>
                <p className="text-sm text-slate-400">Your AI OS is activating. One moment...</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <Star size={12} className="fill-indigo-400" />
                <span>Live Protocol / Node: Alpha-9</span>
                <Star size={12} className="fill-indigo-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default NovaGate;
