
import React, { useState } from 'react';
import { 
  Phone, 
  Shield, 
  Search, 
  Clock, 
  History, 
  Activity, 
  Download, 
  PhoneIncoming, 
  PhoneOutgoing,
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Signal,
  Terminal,
  Mic,
  Volume2,
  Lock,
  Unlock,
  CheckCircle2,
  Layout,
  Globe,
  MessageSquare,
  AlertCircle,
  Play,
  Square,
  ShieldCheck,
  Mail,
  User,
  Timer
} from 'lucide-react';
import { AgentConfig, TelephonyConfig, CallLog, TwilioConfig } from '../types';

interface TelephonyPanelProps {
  agent: AgentConfig;
  onUpdate: (updates: Partial<AgentConfig>) => void;
  onBack: () => void;
}

type TelephonyView = 'provisioning' | 'settings' | 'firewall' | 'diagnostics' | 'history';

export const TelephonyPanel: React.FC<TelephonyPanelProps> = ({ agent, onUpdate, onBack }) => {
  const [activeView, setActiveView] = useState<TelephonyView>('provisioning');
  const [activeSearch, setActiveSearch] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newAllowedNumber, setNewAllowedNumber] = useState('');
  const [testConsoleLogs, setTestConsoleLogs] = useState<string[]>([]);
  
  // Diagnostics State
  const [outboundNumber, setOutboundNumber] = useState('');
  const [isTailing, setIsTailing] = useState(false);

  // Fallback if config is missing (e.g. legacy saved session)
  const config = agent.telephony || {
    phoneNumber: null,
    allowedNumbers: [],
    callHistory: [],
    firewallEnabled: true,
    maxCallDuration: 60,
    timeout: 30
  };

  const updateConfig = (updates: Partial<TelephonyConfig>) => {
    onUpdate({ telephony: { ...config, ...updates } });
  };

  const updateTwilioConfig = (updates: Partial<TwilioConfig>) => {
    onUpdate({ 
      telephony: { 
        ...config, 
        twilio: { ...(config.twilio || {}), ...updates } as TwilioConfig
      } 
    });
  };

  const handleSearch = () => {
    if (!activeSearch) return;
    setIsSearching(true);
    // Simulate API search
    setTimeout(() => {
      const mockNumbers = Array.from({ length: 4 }).map(() => 
        `+1 (${activeSearch}) ${Math.floor(Math.random() * 899 + 100)}-${Math.floor(Math.random() * 8999 + 1000)}`
      );
      setAvailableNumbers(mockNumbers);
      setIsSearching(false);
    }, 1000);
  };

  const handleProvision = (number: string) => {
    updateConfig({ phoneNumber: number });
    setAvailableNumbers([]);
    setActiveSearch('');
    addLog(`System provisioned new trunk: ${number}`);
  };

  const handleAddAllowed = () => {
    if (newAllowedNumber) {
      updateConfig({ allowedNumbers: [...config.allowedNumbers, newAllowedNumber] });
      setNewAllowedNumber('');
      addLog(`Allow List updated: Added ${newAllowedNumber}`);
    }
  };

  const handleRemoveAllowed = (num: string) => {
    updateConfig({ allowedNumbers: config.allowedNumbers.filter(n => n !== num) });
    addLog(`Allow List updated: Removed ${num}`);
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestConsoleLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const toggleTailing = () => {
    if (isTailing) {
        setIsTailing(false);
        addLog('System log tailing stopped.');
    } else {
        setIsTailing(true);
        addLog('Connecting to event stream...');
        setTimeout(() => {
            addLog('Connection established. Watching for webhook events on /v1/voice/status...');
        }, 800);
    }
  };

  const simulateCall = (direction: 'inbound' | 'outbound', targetNumber?: string) => {
    const testNumber = targetNumber || '+1 (555) 000-0000';
    // If firewall is enabled, block if NOT in allowed numbers.
    // If firewall is disabled, allow all.
    const isBlocked = direction === 'inbound' && config.firewallEnabled && !config.allowedNumbers.includes(testNumber);
    
    if (direction === 'inbound' && !isTailing) {
        setIsTailing(true);
        addLog('Auto-starting log tailing for simulation...');
    }

    addLog(`Initiating ${direction.toUpperCase()} sequence: ${testNumber}...`);
    
    setTimeout(() => {
      if (isBlocked) {
        addLog(`SECURITY ALERT: Inbound connection from ${testNumber} rejected by Firewall rule.`);
        const log: CallLog = {
          id: `call-${Date.now()}`,
          direction,
          number: testNumber,
          duration: 0,
          timestamp: Date.now(),
          status: 'blocked'
        };
        updateConfig({ callHistory: [log, ...config.callHistory] });
      } else {
        addLog(`SIP/2.0 100 Trying`);
        setTimeout(() => {
            addLog(`SIP/2.0 180 Ringing`);
            setTimeout(() => {
                addLog(`SIP/2.0 200 OK`);
                addLog(`Session established: ${testNumber}`);
                
                setTimeout(() => {
                    addLog(`Call completed successfully. Duration: ${Math.floor(Math.random() * 120 + 10)}s`);
                    const log: CallLog = {
                        id: `call-${Date.now()}`,
                        direction,
                        number: testNumber,
                        duration: Math.floor(Math.random() * 120 + 10),
                        timestamp: Date.now(),
                        status: 'completed',
                        recordingUrl: 'mock-recording.mp3'
                    };
                    updateConfig({ callHistory: [log, ...config.callHistory] });
                }, 1500);
            }, 1000);
        }, 800);
      }
    }, 500);
  };

  const tabs: { id: TelephonyView; label: string; icon: any }[] = [
    { id: 'provisioning', label: 'Provisioning', icon: Download },
    { id: 'settings', label: 'Configuration', icon: Settings },
    { id: 'firewall', label: 'Firewall', icon: Shield },
    { id: 'diagnostics', label: 'Diagnostics', icon: Terminal },
    { id: 'history', label: 'Call History', icon: History },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto h-full overflow-y-auto p-6 bg-slate-950">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 rounded-full hover:bg-blue-900/30 transition-colors border border-transparent hover:border-blue-500/50 group"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
              Telephony Control Panel
            </h2>
            <p className="text-sm text-blue-400/60 font-mono mt-1 flex items-center gap-2">
              <Signal className="w-3 h-3" />
              TRUNK: {config.phoneNumber || 'UNPROVISIONED'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 shadow-[0_0_15px_rgba(0,0,0,0.3)] transition-all ${
             config.phoneNumber 
             ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
             : 'bg-slate-900 border-slate-800'
           }`}>
              <div className={`w-2 h-2 rounded-full ${config.phoneNumber ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></div>
              <span className={`text-xs font-bold tracking-wider ${config.phoneNumber ? 'text-blue-100' : 'text-slate-500'}`}>
                {config.phoneNumber ? 'GATEWAY ONLINE' : 'OFFLINE'}
              </span>
           </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-slate-800 backdrop-blur-sm overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
              activeView === tab.id
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeView === tab.id ? 'text-white' : 'text-slate-500'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        
        {/* VIEW: PROVISIONING */}
        {activeView === 'provisioning' && (
          <div className="bg-slate-900/40 p-8 rounded-2xl border-t-4 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.1)] animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
                  <Download className="w-6 h-6 text-blue-400" /> Number Provisioning
                </h3>
                <p className="text-slate-400 text-sm max-w-xl">
                  Acquire and configure SIP trunking numbers. Provisioned numbers instantly link to the agent's voice modality.
                </p>
              </div>
              <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
                Region: Global (US-East)
              </div>
            </div>
            
            {!config.phoneNumber ? (
              <div className="max-w-2xl mx-auto space-y-6 py-8">
                <div className="flex gap-4">
                   <div className="relative flex-1 group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm group-focus-within:text-blue-400 transition-colors">US +1</span>
                      <input 
                        type="text" 
                        placeholder="Area Code (e.g. 415)"
                        value={activeSearch}
                        onChange={(e) => setActiveSearch(e.target.value.replace(/\D/g,'').slice(0,3))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-16 pr-4 py-4 text-white text-lg outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>
                   <button 
                    onClick={handleSearch}
                    disabled={activeSearch.length < 3 || isSearching}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                   >
                     {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                     Search
                   </button>
                </div>

                {availableNumbers.length > 0 && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 animate-in fade-in slide-in-from-top-4">
                      {availableNumbers.map(num => (
                        <div key={num} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all group cursor-default">
                           <span className="font-mono text-white text-lg">{num}</span>
                           <button 
                             onClick={() => handleProvision(num)}
                             className="text-xs bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
                           >
                             Select
                           </button>
                        </div>
                      ))}
                   </div>
                )}
                
                {availableNumbers.length === 0 && !isSearching && (
                   <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl opacity-50">
                      <Search className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                      <p className="text-slate-500 font-bold">Search available numbers</p>
                   </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/30 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-inner shadow-blue-500/10 gap-6">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-400 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                       <Signal className="w-8 h-8" />
                    </div>
                    <div>
                       <p className="text-sm text-blue-400 font-bold uppercase mb-1 tracking-widest">Active Trunk Line</p>
                       <p className="text-4xl font-mono text-white tracking-wider drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{config.phoneNumber}</p>
                       <div className="flex gap-4 mt-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Max: {config.maxCallDuration}m</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Activity className="w-3 h-3" /> Timeout: {config.timeout}s</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button 
                      onClick={() => updateConfig({ phoneNumber: null })}
                      className="p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 transition-colors h-full flex flex-col items-center justify-center gap-1"
                      title="Release Number"
                    >
                       <Trash2 className="w-5 h-5" />
                       <span className="text-[10px] font-bold">RELEASE</span>
                    </button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: SETTINGS (TWILIO CONFIG) */}
        {activeView === 'settings' && (
          <div className="bg-slate-900/40 p-8 rounded-2xl border-t-4 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.1)] animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
                      <Settings className="w-6 h-6 text-blue-400" /> Twilio Trunk Configuration
                   </h3>
                   <p className="text-slate-400 text-sm max-w-xl">
                      Manage webhooks and signaling for SIP/VoIP integration. Syncs directly with your Twilio Programmable Voice & SMS settings.
                   </p>
                </div>
                <div className="bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20 text-xs font-mono text-blue-400 flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Live Sync Active
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Section 1: Identity */}
                <div className="space-y-4">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Identity & Credentials</h4>
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-xs text-slate-400">Friendly Name</label>
                         <input 
                           type="text" 
                           value={config.twilio?.friendlyName || ''}
                           onChange={(e) => updateTwilioConfig({ friendlyName: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-xs text-slate-400">Phone Number</label>
                           <input 
                             type="text" 
                             value={config.phoneNumber || 'Not Provisioned'}
                             readOnly
                             className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-500 font-mono"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs text-slate-400">Phone SID</label>
                           <input 
                             type="text" 
                             value={config.twilio?.phoneSid || ''}
                             readOnly
                             className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-500 font-mono"
                           />
                        </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs text-slate-400">Messaging Service SID</label>
                         <input 
                           type="text" 
                           value={config.twilio?.messagingServiceSid || ''}
                           onChange={(e) => updateTwilioConfig({ messagingServiceSid: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                         />
                      </div>
                   </div>
                </div>

                {/* Section 2: Voice & Fax */}
                <div className="space-y-4">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Voice Configuration</h4>
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-xs text-blue-400 font-bold flex items-center gap-1"><PhoneIncoming className="w-3 h-3" /> Voice Webhook URL</label>
                         <input 
                           type="text" 
                           value={config.twilio?.voiceUrl || ''}
                           onChange={(e) => updateTwilioConfig({ voiceUrl: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs text-slate-400">Voice Fallback URL</label>
                         <input 
                           type="text" 
                           value={config.twilio?.voiceFallbackUrl || ''}
                           onChange={(e) => updateTwilioConfig({ voiceFallbackUrl: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs text-slate-400">Status Callback URL</label>
                         <input 
                           type="text" 
                           value={config.twilio?.statusCallbackUrl || ''}
                           onChange={(e) => updateTwilioConfig({ statusCallbackUrl: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                         />
                      </div>
                   </div>
                </div>

                {/* Section 3: Messaging */}
                <div className="space-y-4">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Messaging Configuration</h4>
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-xs text-purple-400 font-bold flex items-center gap-1"><MessageSquare className="w-3 h-3" /> SMS Webhook URL</label>
                         <input 
                           type="text" 
                           value={config.twilio?.smsUrl || ''}
                           onChange={(e) => updateTwilioConfig({ smsUrl: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs text-slate-400">SMS Fallback URL</label>
                         <input 
                           type="text" 
                           value={config.twilio?.smsFallbackUrl || ''}
                           onChange={(e) => updateTwilioConfig({ smsFallbackUrl: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                         />
                      </div>
                   </div>
                </div>

                {/* Section 4: Debugging */}
                <div className="space-y-4">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Debugging & Errors</h4>
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-xs text-red-400 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Error Log Webhook</label>
                         <input 
                           type="text" 
                           value={config.twilio?.errorUrl || ''}
                           onChange={(e) => updateTwilioConfig({ errorUrl: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                         />
                      </div>
                   </div>
                </div>

             </div>
          </div>
        )}

        {/* VIEW: FIREWALL */}
        {activeView === 'firewall' && (
          <div className="bg-slate-900/40 p-8 rounded-2xl border-t-4 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.1)] animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
                      <Shield className="w-6 h-6 text-blue-400" /> Firewall Security
                   </h3>
                   <p className="text-slate-400 text-sm max-w-xl">
                      Manage inbound call filtering. When enabled, only numbers in the Allowed List can reach the agent.
                   </p>
                </div>
                <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${config.firewallEnabled ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                   <div className={`w-2 h-2 rounded-full ${config.firewallEnabled ? 'bg-blue-400 animate-pulse' : 'bg-red-500'}`}></div>
                   <span className="text-xs font-bold uppercase">{config.firewallEnabled ? 'Active' : 'Disabled'}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Rules & Verification (New) */}
                <div className="space-y-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                       Traffic Rules & Ownership
                    </h4>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-xs text-slate-400 font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Max Duration (min)</label>
                              <input 
                                type="number"
                                value={config.maxCallDuration}
                                onChange={(e) => updateConfig({ maxCallDuration: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs text-slate-400 font-bold flex items-center gap-1"><Timer className="w-3 h-3" /> Timeout (sec)</label>
                              <input 
                                type="number"
                                value={config.timeout}
                                onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-bold flex items-center gap-2">
                               <ShieldCheck className="w-3 h-3 text-green-400" /> Verified Owner Phone
                            </label>
                            <input 
                              type="tel"
                              value={config.ownerPhone || ''}
                              onChange={(e) => updateConfig({ ownerPhone: e.target.value })}
                              placeholder="+1 (555) 000-0000"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-bold flex items-center gap-2">
                               <Mail className="w-3 h-3 text-blue-400" /> Verified Owner Email
                            </label>
                            <input 
                              type="email"
                              value={config.ownerEmail || ''}
                              onChange={(e) => updateConfig({ ownerEmail: e.target.value })}
                              placeholder="admin@gateway-global.ai"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                       <p className="text-[10px] text-blue-300 leading-relaxed">
                          <span className="font-bold">Protocol Rule:</span> Verified owners bypass standard firewall filters when calling from the registered number.
                       </p>
                    </div>
                </div>

                {/* Right Column: Existing Firewall Logic */}
                <div className="space-y-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                       Access Control
                    </h4>

                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-blue-500/30 transition-all">
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${config.firewallEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                             {config.firewallEnabled ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                          </div>
                          <div>
                             <h4 className="text-base font-bold text-white">Inbound Protection</h4>
                             <p className="text-xs text-slate-400 mt-1">
                                {config.firewallEnabled ? "Blocking all unknown callers automatically." : "Accepting all inbound traffic (High Risk)."}
                             </p>
                          </div>
                       </div>
                       <button 
                         onClick={() => updateConfig({ firewallEnabled: !config.firewallEnabled })}
                         className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                            config.firewallEnabled ? 'bg-blue-600' : 'bg-slate-700'
                         }`}
                       >
                          <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
                             config.firewallEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`} />
                       </button>
                    </div>

                    <div className="bg-slate-950/30 rounded-xl border border-slate-800/50 p-4">
                       <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Allowed Callers
                       </h4>

                       <div className="flex gap-2 mb-4">
                          <input 
                            type="text" 
                            placeholder="Add Number..."
                            value={newAllowedNumber}
                            onChange={(e) => setNewAllowedNumber(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                          />
                          <button 
                            onClick={handleAddAllowed}
                            disabled={!newAllowedNumber}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                          >
                             <Plus className="w-4 h-4" />
                          </button>
                       </div>

                       <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {config.allowedNumbers.map(num => (
                             <div key={num} className="flex justify-between items-center p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-green-500/30 transition-all group">
                                <span className="text-xs font-mono text-slate-300 group-hover:text-green-300">{num}</span>
                                <button onClick={() => handleRemoveAllowed(num)} className="p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400 transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                             </div>
                          ))}
                          {config.allowedNumbers.length === 0 && (
                             <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-xl">
                                <Shield className="w-6 h-6 mx-auto text-slate-700 mb-2" />
                                <p className="text-xs text-slate-500">Allow List is empty.</p>
                             </div>
                          )}
                       </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* VIEW: DIAGNOSTICS */}
        {activeView === 'diagnostics' && (
          <div className="bg-slate-900/40 p-8 rounded-2xl border-t-4 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.1)] animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
                      <Terminal className="w-6 h-6 text-blue-400" /> Neural Diagnostic Console
                   </h3>
                   <p className="text-slate-400 text-sm">
                      Real-time traffic analysis and simulation tools.
                   </p>
                </div>
                <div className="flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isTailing ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        {isTailing ? 'Live Monitoring' : 'Offline'}
                    </div>
                </div>
             </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                 {/* Outbound Section */}
                 <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                     <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <PhoneOutgoing className="w-4 h-4 text-purple-400" /> Outbound Test
                     </h4>
                     <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-xs text-slate-500 font-bold uppercase">Destination Number</label>
                            <input 
                                type="tel"
                                value={outboundNumber}
                                onChange={(e) => setOutboundNumber(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                            />
                         </div>
                         <button 
                           onClick={() => simulateCall('outbound', outboundNumber)}
                           disabled={!config.phoneNumber || !outboundNumber}
                           className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white p-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                         >
                            <Activity className="w-4 h-4" /> Initiate Call
                         </button>
                     </div>
                 </div>

                 {/* Inbound/Log Section */}
                 <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                         <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-blue-400" /> System Logs
                         </h4>
                         <div className="flex gap-2">
                             {isTailing && (
                                 <button 
                                    onClick={() => simulateCall('inbound', 'Unknown')}
                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
                                 >
                                    Trigger Mock Signal
                                 </button>
                             )}
                             <button 
                                onClick={toggleTailing}
                                className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${isTailing ? 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20'}`}
                             >
                                {isTailing ? <><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Stop Tailing</> : <><div className="w-2 h-2 bg-green-500 rounded-full" /> Start Tailing</>}
                             </button>
                         </div>
                    </div>

                    <div className="flex-1 bg-black rounded-2xl p-4 overflow-hidden border border-slate-800 shadow-inner shadow-black/80 relative min-h-[200px] flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>
                        <div className="flex-1 overflow-y-auto font-mono text-xs custom-scrollbar space-y-1">
                             {testConsoleLogs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50">
                                   <Activity className="w-8 h-8 mb-2" />
                                   <span>Log buffer empty. Start tailing to view events.</span>
                                </div>
                             ) : (
                                testConsoleLogs.map((log, i) => (
                                   <div key={i} className="border-l-2 border-blue-900/50 pl-3 py-0.5 text-blue-400/90 break-all">
                                      <span className="opacity-50 mr-2 text-slate-500">{log.split(']')[0]}]</span>
                                      <span className="text-slate-300">{log.split(']')[1]}</span>
                                   </div>
                                ))
                             )}
                             {isTailing && (
                                <div className="animate-pulse text-blue-500 font-mono text-xs mt-2">_</div>
                             )}
                        </div>
                    </div>
                 </div>
              </div>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {activeView === 'history' && (
           <div className="bg-slate-900/40 p-8 rounded-2xl border-t-4 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.1)] animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
                      <History className="w-6 h-6 text-blue-400" /> Transmission History
                   </h3>
                   <p className="text-slate-400 text-sm">
                      Comprehensive log of all voice packet interactions.
                   </p>
                </div>
                <div className="flex gap-2">
                   <div className="text-right">
                      <div className="text-2xl font-bold text-white">{config.callHistory.length}</div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Total Events</div>
                   </div>
                </div>
              </div>
              
              <div className="overflow-hidden rounded-xl border border-slate-800">
                 <table className="w-full">
                    <thead className="bg-slate-900 text-xs font-bold text-slate-500 uppercase">
                       <tr>
                          <th className="p-4 text-left">Direction</th>
                          <th className="p-4 text-left">Origin / Destination</th>
                          <th className="p-4 text-right">Duration</th>
                          <th className="p-4 text-right">Time</th>
                          <th className="p-4 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                       {config.callHistory.map(log => (
                          <tr key={log.id} className="text-sm hover:bg-blue-600/5 transition-colors">
                             <td className="p-4">
                                {log.direction === 'inbound' ? (
                                   <div className="flex items-center gap-2 text-blue-400">
                                      <PhoneIncoming className="w-4 h-4" /> <span className="font-bold">Inbound</span>
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-2 text-purple-400">
                                      <PhoneOutgoing className="w-4 h-4" /> <span className="font-bold">Outbound</span>
                                   </div>
                                )}
                             </td>
                             <td className="p-4 font-mono text-sm text-slate-300">{log.number}</td>
                             <td className="p-4 text-right text-slate-400 font-mono">{log.duration}s</td>
                             <td className="p-4 text-right text-slate-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                             <td className="p-4 text-right">
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${
                                   log.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                   log.status === 'blocked' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                   'bg-slate-700 text-slate-400 border-slate-600'
                                }`}>
                                   {log.status}
                                </span>
                             </td>
                          </tr>
                       ))}
                       {config.callHistory.length === 0 && (
                          <tr>
                             <td colSpan={5} className="p-12 text-center">
                                <History className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                                <p className="text-sm text-slate-500">No transmissions recorded yet.</p>
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};
