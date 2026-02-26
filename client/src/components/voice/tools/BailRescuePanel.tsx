/**
 * BailRescuePanel.tsx
 * The "Outside Payer" Sovereign UI — Jason Standard
 * Displayed when an outside indemnitor clicks the rescue deep-link from the SMS.
 * Shows inmate status, bond details, and a Stripe checkout CTA.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, CheckCircle, Clock, MapPin, PhoneCall,
  CreditCard, Loader2, AlertTriangle, ExternalLink, Scale,
} from 'lucide-react';
import type { BailRescueSessionPublic } from '@/types/bailRescue';

const STATUS_CONFIG = {
  confirmed:            { color: 'rose',    icon: ShieldAlert,   label: 'In Custody — Confirmed' },
  pending_verification: { color: 'amber',   icon: Clock,         label: 'Custody Pending Verification' },
  not_found:            { color: 'slate',   icon: AlertTriangle, label: 'Not Found in System' },
} as const;

interface BailRescuePanelProps {
  session: BailRescueSessionPublic;
  token: string;
}

export default function BailRescuePanel({ session, token }: BailRescuePanelProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError]     = useState('');

  const statusCfg = STATUS_CONFIG[session.custodyStatus] ?? STATUS_CONFIG.pending_verification;
  const StatusIcon = statusCfg.icon;
  const c = statusCfg.color;

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const res = await fetch(`/api/bail-rescue/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Payment failed to start.');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-lg mx-auto space-y-4"
    >
      {/* Status Header Card */}
      <div className={`
        relative rounded-[24px] overflow-hidden backdrop-blur-xl border shadow-2xl p-6
        ${c === 'rose'  ? 'bg-slate-900/85 border-rose-500/30'   : ''}
        ${c === 'amber' ? 'bg-slate-900/80 border-amber-500/25'  : ''}
        ${c === 'slate' ? 'bg-slate-900/70 border-slate-500/20'  : ''}
      `}>
        {/* Ambient glow */}
        <div className={`
          absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none
          ${c === 'rose'  ? 'bg-rose-600 animate-pulse' : ''}
          ${c === 'amber' ? 'bg-amber-500 animate-pulse' : ''}
          ${c === 'slate' ? 'bg-slate-600' : ''}
        `} />

        <div className="relative flex items-start gap-4">
          <div className={`
            p-3 rounded-2xl border shrink-0
            ${c === 'rose'  ? 'bg-rose-500/15 border-rose-500/25'   : ''}
            ${c === 'amber' ? 'bg-amber-500/15 border-amber-500/25' : ''}
            ${c === 'slate' ? 'bg-slate-500/15 border-slate-500/25' : ''}
          `}>
            <StatusIcon className={`w-6 h-6 ${
              c === 'rose'  ? 'text-rose-400'  :
              c === 'amber' ? 'text-amber-400' : 'text-slate-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
              c === 'rose'  ? 'text-rose-400'  :
              c === 'amber' ? 'text-amber-400' : 'text-slate-400'
            }`}>{statusCfg.label}</p>
            <h1 className="text-white text-2xl font-bold tracking-tight">
              {session.inmateFirstName} {session.inmateLastName}
            </h1>
            <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 text-sm">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {session.facilityName}
            </div>
          </div>
        </div>
      </div>

      {/* Bond Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="sovereign-glass rounded-[24px] p-6 space-y-4"
      >
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-400" />
          Bond & Premium Details
        </h2>

        <div className="space-y-2">
          {session.bondAmount !== null && (
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-400 text-sm">Total Bond Set</span>
              <span className="text-white font-mono font-bold">
                ${session.bondAmount.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-400 text-sm">Your Cost (12% Premium)</span>
            <span className="text-indigo-300 font-mono font-bold text-lg">
              {session.premiumDisplay ?? 'TBD — Agent Will Confirm'}
            </span>
          </div>
          <div className="py-1">
            <p className="text-slate-500 text-xs leading-relaxed flex items-start gap-1.5">
              <Scale className="w-3 h-3 shrink-0 mt-0.5 text-indigo-500" />
              Louisiana law (R.S. §22:1443) sets the bail bond premium at exactly 12% of the total bond — this fee is non-refundable and non-negotiable by state law.
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="sovereign-glass rounded-[24px] p-6 space-y-4"
      >
        <div className="space-y-2">
          <h2 className="text-white font-bold text-base">Get Them Out Now</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {session.businessName} handles the paperwork immediately after payment.
            {session.ownerName} is on call 24/7.
          </p>
        </div>

        <AnimatePresence>
          {checkoutError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {checkoutError}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all duration-200"
        >
          {checkoutLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Preparing Secure Payment…</>
          ) : (
            <><CreditCard className="w-5 h-5" />Pay Premium &amp; Release</>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-slate-600 text-xs">or</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <a
          href={`tel:${session.agencyContact}`}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-slate-200 border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200"
        >
          <PhoneCall className="w-4 h-4 text-indigo-400" />
          Call {session.ownerName} Directly
        </a>
      </motion.div>

      {/* Trust Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-slate-600 text-xs px-4 leading-relaxed"
      >
        Secured checkout powered by Stripe. {session.businessName} is a licensed bail bond producer in Louisiana.
      </motion.p>
    </motion.div>
  );
}
