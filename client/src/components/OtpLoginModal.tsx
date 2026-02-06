import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Phone, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { LucideIcon } from 'lucide-react';

interface OtpLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: { token: string; user: any }) => void;
  sendOtpEndpoint: string;
  verifyOtpEndpoint: string;
  icon: LucideIcon;
  title: string;
  phonePrompt?: string;
  accentColor: 'blue' | 'emerald';
  subtitle?: string;
  testIdPrefix: string;
}

const accentMap = {
  blue: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    phoneIcon: 'text-blue-400',
    button: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    ring: 'ring-blue-500/40',
    slotActive: 'border-blue-500 ring-2 ring-blue-500/30',
    slotBorder: 'border-slate-600',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    phoneIcon: 'text-emerald-400',
    button: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    ring: 'ring-emerald-500/40',
    slotActive: 'border-emerald-500 ring-2 ring-emerald-500/30',
    slotBorder: 'border-slate-600',
  },
};

function formatPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function OtpLoginModal({
  open,
  onClose,
  onSuccess,
  sendOtpEndpoint,
  verifyOtpEndpoint,
  icon: Icon,
  title,
  phonePrompt = 'Enter your phone number to receive a verification code',
  accentColor,
  subtitle,
  testIdPrefix,
}: OtpLoginModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const colors = accentMap[accentColor];

  const reset = useCallback(() => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setMaskedPhone('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const sendOtpMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('POST', sendOtpEndpoint, { phone: phoneNumber });
      return response.json();
    },
    onSuccess: (data) => {
      setMaskedPhone(data.phone);
      setStep('otp');
      toast({ title: 'Code Sent', description: `Verification code sent to ***-***-${data.phone}` });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to send code', variant: 'destructive' });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ ph, code }: { ph: string; code: string }) => {
      const response = await apiRequest('POST', verifyOtpEndpoint, { phone: ph, code });
      return response.json();
    },
    onSuccess: (data) => {
      onSuccess(data);
      reset();
    },
    onError: (error: any) => {
      toast({ title: 'Verification Failed', description: error.message || 'Invalid or expired code', variant: 'destructive' });
    },
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast({ title: 'Invalid Phone', description: 'Please enter a valid 10-digit phone number', variant: 'destructive' });
      return;
    }
    sendOtpMutation.mutate(phone);
  };

  const handleOtpComplete = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      verifyOtpMutation.mutate({ ph: phone, code: value });
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: 'Invalid Code', description: 'Please enter the 6-digit verification code', variant: 'destructive' });
      return;
    }
    verifyOtpMutation.mutate({ ph: phone, code: otp });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={handleClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-md w-full max-w-sm p-6 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 text-slate-400"
          onClick={handleClose}
          data-testid={`button-close-${testIdPrefix}`}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center space-y-2">
          <div className={`mx-auto w-12 h-12 rounded-full ${colors.iconBg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.iconText}`} />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400">
            {step === 'phone'
              ? phonePrompt
              : `Enter the 6-digit code sent to ***-***-${maskedPhone}`}
          </p>
          {step === 'phone' && subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="relative">
              <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.phoneIcon}`} />
              <Input
                data-testid={`input-${testIdPrefix}-phone`}
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                disabled={sendOtpMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className={`w-full ${colors.button}`}
              disabled={sendOtpMutation.isPending}
              data-testid={`button-${testIdPrefix}-send-code`}
            >
              {sendOtpMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpComplete}
                disabled={verifyOtpMutation.isPending}
                data-testid={`input-${testIdPrefix}-otp`}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className={`bg-slate-800 ${colors.slotBorder} text-white h-12 w-12 text-lg`} />
                  <InputOTPSlot index={1} className={`bg-slate-800 ${colors.slotBorder} text-white h-12 w-12 text-lg`} />
                  <InputOTPSlot index={2} className={`bg-slate-800 ${colors.slotBorder} text-white h-12 w-12 text-lg`} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={3} className={`bg-slate-800 ${colors.slotBorder} text-white h-12 w-12 text-lg`} />
                  <InputOTPSlot index={4} className={`bg-slate-800 ${colors.slotBorder} text-white h-12 w-12 text-lg`} />
                  <InputOTPSlot index={5} className={`bg-slate-800 ${colors.slotBorder} text-white h-12 w-12 text-lg`} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="submit"
              className={`w-full ${colors.button}`}
              disabled={verifyOtpMutation.isPending}
              data-testid={`button-${testIdPrefix}-verify`}
            >
              {verifyOtpMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                'Verify & Sign In'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400"
              onClick={() => { setStep('phone'); setOtp(''); }}
              disabled={verifyOtpMutation.isPending}
              data-testid={`button-${testIdPrefix}-back`}
            >
              Use a different number
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
