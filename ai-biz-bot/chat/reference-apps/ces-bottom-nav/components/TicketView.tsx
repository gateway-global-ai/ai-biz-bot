
import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { RegistrationType } from '../types';
import { 
  QrCode, 
  ShieldCheck, 
  Zap, 
  UserCheck, 
  Upload, 
  PenTool, 
  CreditCard, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Store,
  Users,
  Building2,
  BadgeInfo,
  ArrowLeft,
  Lock
} from 'lucide-react';

type Step = 'registration' | 'upload_id' | 'sign' | 'payment' | 'view';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'registration', label: 'Details', icon: <UserCheck className="w-5 h-5" /> },
  { key: 'upload_id', label: 'Identity', icon: <Upload className="w-5 h-5" /> },
  { key: 'sign', label: 'Confirm', icon: <PenTool className="w-5 h-5" /> },
  { key: 'payment', label: 'Secure', icon: <CreditCard className="w-5 h-5" /> },
  { key: 'view', label: 'Badge', icon: <CheckCircle2 className="w-5 h-5" /> },
];

interface TicketViewProps {
  onAdminAccess?: () => void;
}

export const TicketView: React.FC<TicketViewProps> = ({ onAdminAccess }) => {
  const [classification, setClassification] = useState<RegistrationType | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('registration');
  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  const nextStep = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx].key);
  };

  const prevStep = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx].key);
  };

  const reset = () => {
    setClassification(null);
    setCurrentStep('registration');
  };

  if (!classification) {
    return (
      <div className="flex flex-col gap-10 px-8 pb-40 animate-in fade-in duration-700">
        <div className="text-center space-y-3 mb-4">
          <h2 className="text-gray-400 text-lg font-bold">Registration Portal</h2>
          <p className="text-gray-500 text-sm uppercase tracking-widest">Identify your role for credentials</p>
        </div>

        <div className="grid gap-6">
          {/* Attendee Card */}
          <button 
            onClick={() => setClassification('attendee')}
            className="group relative"
          >
            <GlassCard className="!p-8 border-white/10 hover:border-blue-500/50 hover:bg-blue-600/5 transition-all duration-500 text-left flex items-center gap-6 overflow-hidden group-active:scale-95 shadow-2xl">
              <div className="w-20 h-20 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/30 group-hover:scale-110 transition-transform">
                <Users size={40} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">Professional Attendee</h2>
                <p className="text-sm text-gray-400 leading-relaxed">Industry leaders, press, and trade delegates.</p>
              </div>
              <ChevronRight className="text-white/20 group-hover:text-blue-400 transition-colors" size={24} />
            </GlassCard>
          </button>

          {/* Vendor Card */}
          <button 
            onClick={() => setClassification('vendor')}
            className="group relative"
          >
            <GlassCard className="!p-8 border-white/10 hover:border-purple-500/50 hover:bg-purple-600/5 transition-all duration-500 text-left flex items-center gap-6 overflow-hidden group-active:scale-95 shadow-2xl">
              <div className="w-20 h-20 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <Store size={40} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">Exhibitor Vendor</h2>
                <p className="text-sm text-gray-400 leading-relaxed">Brands and innovators showcasing on the floor.</p>
              </div>
              <ChevronRight className="text-white/20 group-hover:text-purple-400 transition-colors" size={24} />
            </GlassCard>
          </button>

          {/* Admin / Organizer Card */}
          <button 
            onClick={onAdminAccess}
            className="group relative"
          >
            <GlassCard className="!p-8 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] border-dashed hover:border-white/20 transition-all duration-500 text-left flex items-center gap-6 overflow-hidden group-active:scale-95 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 shrink-0 border border-white/10 group-hover:text-white transition-all">
                <ShieldCheck size={32} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white/40 group-hover:text-white transition-colors mb-1">Administrative Node</h2>
                <p className="text-xs text-gray-600 leading-relaxed">Organizer and staff infrastructure access.</p>
              </div>
              <Lock className="text-white/10 group-hover:text-white/30 transition-colors" size={18} />
            </GlassCard>
          </button>
        </div>
        
        <div className="mt-8 p-8 glass-panel rounded-3xl border-dashed border-white/10 text-center">
          <p className="text-xs text-gray-600 font-black uppercase tracking-[0.3em] mb-6">Cryptographic Infrastructure Secured</p>
          <div className="flex justify-center gap-12 opacity-20">
            <ShieldCheck size={32} />
            <Zap size={32} />
            <Building2 size={32} />
          </div>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'registration':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white/90">{classification === 'vendor' ? 'Business Identity' : 'Personal Details'}</h3>
              <p className="text-gray-400 text-base font-medium">Please provide accurate verification data.</p>
            </div>
            <div className="grid gap-5">
              <InputField label="Contact Full Name" placeholder="Alex Rivera" />
              <InputField label="Email Address" placeholder="alex@techcorp.com" type="email" />
              {classification === 'vendor' ? (
                <>
                  <InputField label="Official Business Name" placeholder="Innovation Labs Inc." />
                  <InputField label="Exhibitor Category" placeholder="Consumer Electronics / Robotics" />
                  <InputField label="Tax ID / EIN" placeholder="00-0000000" />
                </>
              ) : (
                <>
                  <InputField label="Current Organization" placeholder="TechCorp Innovations" />
                  <InputField label="Seniority Level" placeholder="Executive / Director" />
                </>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-blue-400 font-black ml-1">Physical Address</label>
                <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-base focus:outline-none focus:border-blue-500 min-h-[100px] resize-none transition-all shadow-inner" placeholder="123 Silicon Way..." />
              </div>
            </div>
          </div>
        );
      case 'upload_id':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <h3 className="text-2xl font-bold text-white/90">Identity Validation</h3>
            <p className="text-gray-400 text-base font-medium">Verify your {classification} status via secure document scan.</p>
            <div className="border-2 border-dashed border-white/10 rounded-[3rem] p-20 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer group shadow-inner">
              <div className="w-24 h-24 rounded-full bg-blue-600/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Upload className="w-12 h-12 text-blue-400" />
              </div>
              <span className="text-xl font-bold">Upload Secure Document</span>
              <span className="text-sm text-gray-500 mt-2">Passport or Government ID (.jpg, .pdf)</span>
            </div>
          </div>
        );
      case 'sign':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <h3 className="text-2xl font-bold text-white/90">Confirmation Signature</h3>
            <p className="text-gray-400 text-base font-medium">Electronically sign to acknowledge CES terms.</p>
            <div className="glass-panel border-white/10 rounded-[3rem] h-72 relative overflow-hidden flex items-center justify-center shadow-inner">
              <div className="absolute bottom-16 left-16 right-16 border-b-2 border-white/10" />
              <span className="text-gray-700 font-bold uppercase tracking-[0.3em] text-xs opacity-50">AUTHORIZED SIGNATURE</span>
              <PenTool className="absolute top-10 right-10 w-8 h-8 text-white/5" />
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <h3 className="text-2xl font-bold text-white/90">Transaction Secure</h3>
            <p className="text-gray-400 text-base font-medium">Registration fee: <span className="text-white font-black tracking-tighter">${classification === 'vendor' ? '599.00' : '299.00'}</span></p>
            <div className="space-y-5">
              <PaymentCard icon={<BadgeInfo size={28}/>} label="Digital Wallet Link" selected />
              <PaymentCard icon={<CreditCard size={28}/>} label="Business Credit Line" />
            </div>
          </div>
        );
      case 'view':
        return (
          <div className="animate-in zoom-in-95 duration-700">
            <GlassCard className={`relative overflow-hidden ${classification === 'vendor' ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40' : 'bg-gradient-to-br from-blue-900/40 to-indigo-900/40'} !p-0 shadow-[0_20px_80px_rgba(0,0,0,0.6)] border-white/10`}>
              <div className="p-12 pb-16 flex flex-col items-center border-b border-dashed border-white/10">
                <div className="bg-white p-8 rounded-[3rem] shadow-2xl mb-10 transform hover:rotate-3 transition-transform">
                  <QrCode className="w-56 h-56 text-black" />
                </div>
                <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">{classification === 'vendor' ? 'CES EXHIBITOR' : 'CRYSTAL ATTENDEE'}</h2>
                <p className="text-white/40 text-[10px] mt-2 font-black uppercase tracking-[0.4em]">AUTHENTICATED IDENTITY</p>
              </div>

              <div className="p-10 bg-black/80 grid grid-cols-2 gap-10 backdrop-blur-3xl">
                <div className="space-y-1">
                  <div className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">SERIAL</div>
                  <div className="font-mono text-2xl text-white font-bold">X7-882190</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">ACCESS</div>
                  <div className={`font-mono text-2xl font-bold ${classification === 'vendor' ? 'text-purple-400' : 'text-blue-400'}`}>
                    LEVEL {classification === 'vendor' ? 'GOLD' : 'PRO'}
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-12 -translate-y-full animate-[shimmer_6s_infinite]" />
            </GlassCard>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-10 px-8 pb-40">
      {/* Step Progress indicators */}
      <div className="flex justify-between items-center px-4 mb-4">
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.key}>
            <div 
              className={`flex flex-col items-center gap-3 transition-all duration-500 ${
                idx <= stepIndex ? 'text-blue-400 scale-110' : 'text-gray-700'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${
                idx <= stepIndex ? 'border-blue-500 bg-blue-600/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/5 bg-white/5'
              }`}>
                {s.icon}
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-1.5 flex-1 mx-4 rounded-full overflow-hidden bg-white/5`}>
                <div className={`h-full bg-blue-600 transition-all duration-700 ${
                  idx < stepIndex ? 'w-full' : 'w-0'
                }`} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Main Content */}
      <div className="min-h-[500px]">
        {renderStepContent()}
      </div>

      {/* Navigation Controls */}
      <div className="flex gap-6 mt-auto">
        {stepIndex > 0 && currentStep !== 'view' && (
          <button 
            onClick={prevStep}
            className="flex-1 bg-white/5 border border-white/10 py-6 rounded-[2.5rem] flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-bold uppercase tracking-widest text-white/60"
          >
            <ChevronLeft size={20} />
            Reverse
          </button>
        )}
        {currentStep !== 'view' && (
          <button 
            onClick={nextStep}
            className="flex-[2] bg-blue-600 py-6 rounded-[2.5rem] flex items-center justify-center gap-4 font-black shadow-2xl shadow-blue-600/30 active:scale-95 transition-all text-sm uppercase tracking-[0.3em] text-white"
          >
            {stepIndex === STEPS.length - 2 ? 'Authorize & Finalize' : 'Confirm & Proceed'}
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {currentStep === 'view' && (
        <button 
          onClick={reset}
          className="bg-white/5 border border-white/10 py-6 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center justify-center gap-4 hover:text-white transition-colors active:scale-95 shadow-xl"
        >
          Reset Session Nodes
        </button>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateY(-100%) rotate(12deg); }
          100% { transform: translateY(200%) rotate(12deg); }
        }
      `}</style>
    </div>
  );
};

const PaymentCard: React.FC<{ icon: React.ReactNode; label: string; selected?: boolean }> = ({ icon, label, selected }) => (
  <div className={`p-8 rounded-[2rem] border-2 flex items-center justify-between transition-all duration-300 cursor-pointer shadow-xl ${
    selected ? 'bg-blue-600/20 border-blue-500 shadow-blue-600/10' : 'bg-white/5 border-white/5 opacity-50 grayscale hover:opacity-100'
  }`}>
    <div className="flex items-center gap-6">
      <div className={`${selected ? 'text-blue-400' : 'text-gray-500'}`}>{icon}</div>
      <span className="text-xl font-bold text-white tracking-tight">{label}</span>
    </div>
    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'border-blue-500' : 'border-gray-800'}`}>
       {selected && <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]" />}
    </div>
  </div>
);

const InputField: React.FC<{ label: string; placeholder: string; type?: string }> = ({ label, placeholder, type = 'text' }) => (
  <div className="flex flex-col gap-3">
    <label className="text-[10px] uppercase tracking-widest text-blue-400 font-black ml-1">{label}</label>
    <input 
      type={type}
      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 text-lg focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700 font-semibold shadow-inner"
      placeholder={placeholder}
    />
  </div>
);
