/**
 * Unified Login — phone → OTP → matched accounts
 *
 * One entry point for all users. After OTP verification the server
 * returns what it found for that phone number. The user picks where
 * to go only if there are multiple options. One match = instant redirect.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Shield, Building2, Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import AIOSMark from '@/components/public/AIOSMark';
import { BRAND } from '@/config/brand';

type Step = 'phone' | 'otp' | 'options';

interface AccountOption {
  type: 'admin' | 'customer';
  token: string;
  user: Record<string, any>;
  businesses?: Array<{ id: string; name: string; slug: string | null }>;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<AccountOption[]>([]);

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Enter a valid 10-digit phone number', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/unified-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setPhoneLast4(data.phoneLast4 || phone.replace(/\D/g, '').slice(-4));
      setStep('otp');
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      toast({ title: 'Enter the verification code', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/unified-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      const matched: AccountOption[] = data.options || [];

      if (matched.length === 0) {
        // No account — offer to create one
        toast({ title: 'No account found — redirecting to sign up' });
        setLocation('/buy');
        return;
      }

      if (matched.length === 1) {
        // Single match — activate immediately
        activateOption(matched[0]);
        return;
      }

      // Multiple matches — let user pick
      setOptions(matched);
      setStep('options');
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Activate a selected option ──────────────────────────────────────────────
  const activateOption = (option: AccountOption) => {
    if (option.type === 'admin') {
      localStorage.setItem('authToken', option.token);
      localStorage.setItem('gateway_auth_token', option.token);
      window.location.href = '/platform';
    } else {
      localStorage.setItem('gateway_customer_token', option.token);
      window.location.href = '/my-account';
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-base font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300 transition-all';

  const btnClass =
    'w-full py-3 px-6 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.25)] disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="min-h-screen bg-[#050a14] flex flex-col items-center justify-center px-4">

      {/* Header */}
      <div className="w-full max-w-sm mb-8 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} />
          Back
        </a>
        <AIOSMark />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8"
      >
        <AnimatePresence mode="wait">

          {/* ── Step 1: Phone ─────────────────────────────────────────────── */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-1">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center mb-2">
                  <Phone size={18} className="text-indigo-600" />
                </div>
                <h1 className="text-xl font-black text-slate-900">Log in</h1>
                <p className="text-sm text-slate-500">Enter your phone number to receive a verification code.</p>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  className={inputClass}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || phone.replace(/\D/g, '').length < 10}
                  className={btnClass}
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Send code'}
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                New to Gateway?{' '}
                <a href="/buy" className="text-indigo-600 font-semibold hover:underline">Get started →</a>
              </p>
            </motion.div>
          )}

          {/* ── Step 2: OTP ───────────────────────────────────────────────── */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-1">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mb-2">
                  <Shield size={18} className="text-emerald-600" />
                </div>
                <h1 className="text-xl font-black text-slate-900">Enter code</h1>
                <p className="text-sm text-slate-500">
                  We sent a code to the number ending in <span className="font-bold text-slate-700">···{phoneLast4}</span>.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  className={inputClass + ' tracking-widest text-center text-lg'}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 4}
                  className={btnClass}
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Verify'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); }}
                className="text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Wrong number?
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Pick option (only shown when 2 matches) ───────────── */}
          {step === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-black text-slate-900">Where to?</h1>
                <p className="text-sm text-slate-500">Your number is linked to multiple accounts.</p>
              </div>

              <div className="flex flex-col gap-3">
                {options.map(opt => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => activateOption(opt)}
                    className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-sm text-left transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      opt.type === 'admin'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {opt.type === 'admin' ? <Shield size={18} /> : <Building2 size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">
                        {opt.type === 'admin' ? 'Platform Admin' : 'My Business Account'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {opt.type === 'admin'
                          ? `${opt.user.name || 'Admin'} · ${opt.user.role}`
                          : opt.businesses && opt.businesses.length > 0
                            ? `${opt.businesses.length} business${opt.businesses.length > 1 ? 'es' : ''}`
                            : opt.user.email || opt.user.phone}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      <p className="mt-6 text-xs text-slate-600">
        Gateway Global AI · Sovereign AI OS
      </p>
    </div>
  );
}
