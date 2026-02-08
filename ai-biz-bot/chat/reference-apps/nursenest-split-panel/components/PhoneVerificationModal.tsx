
import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { sendSmsVerification } from '../services/twilio';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (phoneNumber: string) => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({ isOpen, onClose, onVerify }) => {
  const [step, setStep] = useState<'input' | 'verify' | 'success'>('input');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    
    setIsProcessing(true);
    setErrorMsg('');
    
    // Generate a random 6-digit code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newCode);

    // Call Twilio Service
    const sent = await sendSmsVerification(phone, newCode);
    
    setIsProcessing(false);
    
    if (!sent) {
        // Since we are client-side, we might fail CORS. 
        // We log the code to console so the user can still proceed in this demo.
        console.log(`%c[DEMO] SMS could not be sent due to CORS/Auth. Use code: ${newCode}`, 'background: #222; color: #bada55; font-size: 14px');
        alert(`Demo Mode: SMS failed (CORS). Check browser console for code: ${newCode}`);
    }
    
    setStep('verify');
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    if (code !== generatedCode && code !== '000000') { // Backdoor for demo if needed
        setTimeout(() => {
            setIsProcessing(false);
            setErrorMsg("Invalid code. Please try again.");
        }, 1000);
        return;
    }

    // Success
    setTimeout(() => {
        setIsProcessing(false);
        setStep('success');
        setTimeout(() => {
            onVerify(phone);
            onClose();
            // Reset for next time
            setTimeout(() => {
                setStep('input');
                setPhone('');
                setCode('');
                setGeneratedCode('');
                setErrorMsg('');
            }, 500);
        }, 1500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600"/>
            {step === 'success' ? 'Verified' : 'Caller ID Verification'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
            {step === 'input' && (
                <form onSubmit={handleSendCode} className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Link your phone number to your NurseNest account. We'll send a text to verify it's you.
                    </p>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Mobile Number</label>
                        <div className="relative">
                            <Smartphone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="tel" 
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        disabled={isProcessing || phone.length < 10}
                        className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                        Send Verification Code
                    </button>
                </form>
            )}

            {step === 'verify' && (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Enter the 6-digit code we sent to <span className="font-semibold text-slate-800">{phone}</span>
                    </p>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Verification Code</label>
                        <input 
                            type="text" 
                            required
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="000000"
                            className="w-full px-4 py-2 text-center text-lg tracking-widest bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                    </div>
                    
                    {errorMsg && (
                        <p className="text-xs text-red-500 text-center font-medium animate-pulse">{errorMsg}</p>
                    )}

                    <button 
                        type="submit"
                        disabled={isProcessing || code.length < 6}
                        className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : "Verify & Link"}
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            setStep('input');
                            setGeneratedCode('');
                            setErrorMsg('');
                        }}
                        className="w-full py-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                        Change Number
                    </button>
                </form>
            )}

            {step === 'success' && (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 animate-in zoom-in">
                        <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Phone Linked!</h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Your Caller ID is now tied to this itinerary record. Calls to support will automatically pull up your details.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
