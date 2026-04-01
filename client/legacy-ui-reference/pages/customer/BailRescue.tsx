/**
 * BailRescue.tsx
 * Public page: /rescue/:token
 * The outside indemnitor lands here after receiving the SMS deep-link from the AI.
 * No login required — the token is the sole authentication artifact.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import BailRescuePanel from '@/components/voice/tools/BailRescuePanel';
import type { BailRescueSessionPublic } from '@/types/bailRescue';

type PageState = 'loading' | 'ready' | 'error' | 'paid';

export default function BailRescue() {
  const params = useParams<{ token: string }>();
  const token  = params.token ?? '';

  const [state, setState]     = useState<PageState>('loading');
  const [session, setSession] = useState<BailRescueSessionPublic | null>(null);
  const [errorMsg, setError]  = useState('');

  // Check for payment success return from Stripe
  const urlParams   = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const paymentQs   = urlParams.get('payment');

  useEffect(() => {
    if (!token) {
      setError('Invalid rescue link.');
      setState('error');
      return;
    }

    if (paymentQs === 'success') {
      setState('paid');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/bail-rescue/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Rescue link is invalid or expired.');
        setSession(data.session);
        setState(data.session.paymentStatus === 'paid' ? 'paid' : 'ready');
      } catch (err: any) {
        setError(err.message);
        setState('error');
      }
    })();
  }, [token, paymentQs]);

  return (
    <div className="min-h-screen bg-[#0F172A] px-4 py-10 flex flex-col items-center">
      {/* Sovereign header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/25">
          <ShieldAlert className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <p className="text-white font-bold text-lg tracking-tight">Bail Bond Rescue</p>
          <p className="text-slate-500 text-xs">Powered by Sovereign AI</p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {state === 'loading' && (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-16"
          >
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-slate-400 text-sm">Loading rescue details…</p>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div key="error"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-md w-full text-center space-y-4"
          >
            <div className="p-4 rounded-[24px] bg-rose-500/8 border border-rose-500/20 backdrop-blur-xl">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h2 className="text-white font-bold text-lg mb-2">Link Unavailable</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{errorMsg}</p>
            </div>
            <p className="text-slate-500 text-xs">
              This link may have expired (24-hour limit). Please contact the bail bondsman directly.
            </p>
          </motion.div>
        )}

        {state === 'paid' && (
          <motion.div key="paid"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="max-w-md w-full text-center space-y-4"
          >
            <div className="p-6 rounded-[24px] sovereign-glass backdrop-blur-xl space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 w-fit mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-white font-bold text-xl">Payment Confirmed</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                The bond premium has been received. {session?.ownerName ?? 'Your bondsman'} will begin processing the release immediately.
              </p>
              {session?.agencyContact && (
                <a
                  href={`tel:${session.agencyContact}`}
                  className="inline-flex items-center gap-2 py-3 px-5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20"
                >
                  Confirm with {session.ownerName}
                </a>
              )}
            </div>
          </motion.div>
        )}

        {state === 'ready' && session && (
          <motion.div key="ready"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-lg"
          >
            <BailRescuePanel session={session} token={token} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
