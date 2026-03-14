import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Calendar, Smartphone, Bot, ShieldCheck, FileText, HelpCircle } from 'lucide-react';

interface KioskOnboardingProps {
  onSubmit: (value: string) => void;
  onTriggerSpeech?: (text: string) => void;
  onContextUpdate?: (context: string) => void;
  siteConfigId?: string;
}

export const KioskOnboarding: React.FC<KioskOnboardingProps> = ({ onSubmit, onTriggerSpeech, onContextUpdate, siteConfigId }) => {
  const [step, setStep] = useState<'WELCOME' | 'IDENTIFY' | 'VERIFY' | 'INTAKE' | 'VERIFIED' | 'ACTIONS'>('WELCOME');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (siteConfigId) {
      setLoading(true);
      fetch(`/api/site-configs/${siteConfigId}`)
        .then(res => res.json())
        .then(data => {
          setConfig(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load site config:", err);
          setLoading(false);
        });
    }
  }, [siteConfigId]);

  // Notify AI of state changes so it knows what's on screen
  useEffect(() => {
    if (!onContextUpdate) return;

    let contextDescription = "";
    switch (step) {
      case 'WELCOME':
        contextDescription = "User is on the Kiosk Welcome screen. Options: Create Account, Login, Need Assistance.";
        break;
      case 'IDENTIFY':
        contextDescription = "User is on the Identification screen. Asking for phone number.";
        break;
      case 'VERIFY':
        contextDescription = `User is on the Verification screen. Waiting for OTP code sent to ${phoneNumber}.`;
        break;
      case 'INTAKE':
        contextDescription = "User is on the Intake screen. Asking for additional information based on policy.";
        break;
      case 'VERIFIED':
        contextDescription = "User is successfully verified.";
        break;
      case 'ACTIONS':
        contextDescription = "User is on the Actions menu. Options: Check In, Reschedule, Need Assistance.";
        break;
    }
    onContextUpdate(`[System UI Update: ${contextDescription}]`);
  }, [step, onContextUpdate, phoneNumber]);

  const handlePhoneSubmit = async () => {
    if (!phoneNumber) return;
    // In a real app, we'd call the API here. For the UI demo, we simulate success.
    
    // Check verification policy
    const verificationLevel = config?.agentConfig?.verificationPolicy?.level || 'standard';
    
    if (verificationLevel === 'strict') {
       onTriggerSpeech?.(`I've sent a verification code to ${phoneNumber}. Since this is a strict verification facility, I'll also need you to scan your ID after this.`);
    } else {
       onTriggerSpeech?.(`I've sent a verification code to ${phoneNumber}. Please enter it to continue.`);
    }
    
    setStep('VERIFY');
  };

  const handleOtpSubmit = async () => {
    if (!otpCode) return;
    
    // Check intake policy
    const intakePolicy = config?.agentConfig?.intakePolicy || {};
    const needsIntake = intakePolicy.insurance || intakePolicy.attorney || intakePolicy.referral;

    if (needsIntake) {
        onTriggerSpeech?.("Code verified. I just need a few more details to complete your check-in.");
        setStep('INTAKE');
    } else {
        onTriggerSpeech?.("That code is correct. Welcome back. I've pulled up your account.");
        setStep('VERIFIED');
    }
  };

  const handleIntakeSubmit = () => {
      onTriggerSpeech?.("Thank you for providing that information. Your check-in is complete.");
      setStep('VERIFIED');
  };

  const handleAction = (action: string) => {
    onTriggerSpeech?.(`Okay, let's ${action.toLowerCase().replace('_', ' ')}.`);
    onSubmit(action); // Complete the tool interaction
  };

  const steps = {
    WELCOME: (
      <div className="flex flex-col gap-3 w-full">
        <button onClick={() => { setStep('IDENTIFY'); onTriggerSpeech?.("Please enter your phone number to log in."); }} className="bg-white border border-slate-200 p-4 text-left font-bold text-slate-800 uppercase tracking-wide hover:border-[#1a2b4b] hover:bg-slate-50 transition-colors rounded-xl shadow-sm">
          CREATE ACCOUNT
        </button>
        <button onClick={() => { setStep('IDENTIFY'); onTriggerSpeech?.("Welcome back. What's your phone number?"); }} className="bg-white border border-slate-200 p-4 text-left font-bold text-slate-800 uppercase tracking-wide hover:border-[#1a2b4b] hover:bg-slate-50 transition-colors rounded-xl shadow-sm">
          LOGIN
        </button>
        <button onClick={() => { handleAction('ASSISTANCE'); }} className="bg-white border border-slate-200 p-4 text-left font-bold text-slate-800 uppercase tracking-wide hover:border-[#1a2b4b] hover:bg-slate-50 transition-colors rounded-xl shadow-sm">
          NEED ASSISTANCE
        </button>
      </div>
    ),
    IDENTIFY: (
      <div className="flex flex-col gap-4 w-full text-center">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Customer Verification</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">What is your cell phone number?</label>
          <input 
            type="tel" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="border-b-2 border-slate-200 text-center text-xl font-bold text-slate-800 py-2 focus:outline-none focus:border-[#1a2b4b] bg-transparent"
            placeholder="(555) 555-5555"
            autoFocus
          />
        </div>
        <button onClick={handlePhoneSubmit} className="bg-[#1a2b4b] text-white font-bold py-3 rounded-xl uppercase tracking-widest shadow-md hover:bg-[#2a3b5b] transition-colors w-full">
          Continue
        </button>
      </div>
    ),
    VERIFY: (
      <div className="flex flex-col gap-4 w-full text-center">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Enter Passcode</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Code sent to <span className="text-slate-800">{phoneNumber}</span>
          </p>
          <input 
            type="text" 
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            className="border-b-2 border-slate-200 text-center text-xl font-bold text-slate-800 py-2 focus:outline-none focus:border-[#1a2b4b] tracking-[0.5em] bg-transparent"
            placeholder="0000"
            autoFocus
          />
        </div>
        <button onClick={handleOtpSubmit} className="bg-[#1a2b4b] text-white font-bold py-3 rounded-xl uppercase tracking-widest shadow-md hover:bg-[#2a3b5b] transition-colors w-full">
          Verify
        </button>
      </div>
    ),
    INTAKE: (
      <div className="flex flex-col gap-4 w-full text-center">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Additional Information</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 text-left">
            {config?.agentConfig?.intakePolicy?.insurance && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <FileText className="text-slate-400" />
                    <div className="text-sm font-medium">Insurance Card Upload</div>
                    <button className="ml-auto text-xs bg-slate-100 px-2 py-1 rounded">Upload</button>
                </div>
            )}
            {config?.agentConfig?.intakePolicy?.attorney && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <ShieldCheck className="text-slate-400" />
                    <div className="text-sm font-medium">Attorney Information</div>
                    <button className="ml-auto text-xs bg-slate-100 px-2 py-1 rounded">Add</button>
                </div>
            )}
            {config?.agentConfig?.intakePolicy?.referral && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <HelpCircle className="text-slate-400" />
                    <div className="text-sm font-medium">Referral Source</div>
                    <button className="ml-auto text-xs bg-slate-100 px-2 py-1 rounded">Select</button>
                </div>
            )}
        </div>
        <button onClick={handleIntakeSubmit} className="bg-[#1a2b4b] text-white font-bold py-3 rounded-xl uppercase tracking-widest shadow-md hover:bg-[#2a3b5b] transition-colors w-full">
          Complete Check-In
        </button>
      </div>
    ),
    VERIFIED: (
      <div className="flex flex-col gap-4 w-full text-center">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Verified</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2 items-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-1">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Joe Smith</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Since 2012</p>
        </div>
        <button onClick={() => setStep('ACTIONS')} className="bg-white border-2 border-slate-200 text-slate-800 font-bold py-3 rounded-xl uppercase tracking-widest shadow-sm hover:border-[#1a2b4b] transition-colors w-full">
          Continue
        </button>
      </div>
    ),
    ACTIONS: (
      <div className="flex flex-col gap-3 w-full">
        <button onClick={() => handleAction('CHECK_IN')} className="bg-white border border-slate-200 p-4 text-left font-bold text-slate-800 uppercase tracking-wide hover:border-[#1a2b4b] hover:bg-slate-50 transition-colors rounded-xl shadow-sm flex items-center gap-3">
          <CheckCircle2 className="text-[#1a2b4b]" size={20} />
          CHECK IN
        </button>
        <button onClick={() => handleAction('RESCHEDULE')} className="bg-white border border-slate-200 p-4 text-left font-bold text-slate-800 uppercase tracking-wide hover:border-[#1a2b4b] hover:bg-slate-50 transition-colors rounded-xl shadow-sm flex items-center gap-3">
          <Calendar className="text-[#1a2b4b]" size={20} />
          RESCHEDULE
        </button>
        <button onClick={() => handleAction('ASSISTANCE')} className="bg-white border border-slate-200 p-4 text-left font-bold text-slate-800 uppercase tracking-wide hover:border-[#1a2b4b] hover:bg-slate-50 transition-colors rounded-xl shadow-sm flex items-center gap-3">
          <Bot className="text-[#1a2b4b]" size={20} />
          NEED ASSISTANCE
        </button>
      </div>
    )
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {loading ? (
              <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2b4b]"></div>
              </div>
          ) : steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
