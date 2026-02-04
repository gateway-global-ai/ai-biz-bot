import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Signal,
  Terminal,
  Globe,
  MessageSquare,
  AlertCircle,
  Play,
  Square,
  ShieldCheck,
  Timer,
  CheckCircle2,
  XCircle,
  PhoneMissed,
  Ban,
  Loader2,
  User,
  X,
  Key,
  Check,
  Webhook
} from 'lucide-react';
import { Label } from '@/components/ui/label';

type TelephonyView = 'provisioning' | 'settings' | 'firewall' | 'diagnostics' | 'history';

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

interface TelephonyConfig {
  id: string;
  // Twilio credentials (authToken never returned to client)
  accountSid: string | null;
  hasAuthToken: boolean; // Server indicates if token is set without revealing it
  isSubAccount: boolean;
  parentAccountSid: string | null;
  // Phone info
  phoneNumber: string | null;
  phoneSid: string | null;
  friendlyName: string | null;
  messagingServiceSid: string | null;
  // Webhooks
  voiceUrl: string | null;
  voiceFallbackUrl: string | null;
  statusCallbackUrl: string | null;
  smsUrl: string | null;
  smsFallbackUrl: string | null;
  errorUrl: string | null;
  // Firewall
  firewallEnabled: boolean;
  allowedNumbers: string[];
  maxCallDuration: number;
  timeout: number;
  callerIdName: string | null;
  // Owner
  ownerPhone: string | null;
  ownerEmail: string | null;
}

interface CallLogEntry {
  sid: string;
  from: string;
  to: string;
  status: string;
  direction: string;
  duration: string;
  startTime: string;
}

export default function TelephonyPanel() {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<TelephonyView>('provisioning');
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [newAllowedNumber, setNewAllowedNumber] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isTailing, setIsTailing] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  
  // Local form state for settings (prevents mutation on every keystroke)
  const [localFriendlyName, setLocalFriendlyName] = useState('');
  const [localVoiceUrl, setLocalVoiceUrl] = useState('');
  const [localVoiceFallbackUrl, setLocalVoiceFallbackUrl] = useState('');
  const [localStatusCallbackUrl, setLocalStatusCallbackUrl] = useState('');
  const [localSmsUrl, setLocalSmsUrl] = useState('');
  const [localSmsFallbackUrl, setLocalSmsFallbackUrl] = useState('');
  const [localOwnerPhone, setLocalOwnerPhone] = useState('');
  const [localOwnerEmail, setLocalOwnerEmail] = useState('');
  const [localMaxCallDuration, setLocalMaxCallDuration] = useState('60');
  const [localTimeout, setLocalTimeout] = useState('30');
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  
  // Add Existing Number form state
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [existingAccountSid, setExistingAccountSid] = useState('');
  const [existingAuthToken, setExistingAuthToken] = useState('');
  const [existingPhoneNumber, setExistingPhoneNumber] = useState('');
  const [existingPhoneSid, setExistingPhoneSid] = useState('');
  const [existingIsSubAccount, setExistingIsSubAccount] = useState(false);
  const [existingParentAccountSid, setExistingParentAccountSid] = useState('');
  const [existingFriendlyName, setExistingFriendlyName] = useState('');

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useQuery<TelephonyConfig>({
    queryKey: ['/api/telephony/config'],
  });

  const { data: callLogs, isLoading: callLogsLoading, refetch: refetchCallLogs } = useQuery<CallLogEntry[]>({
    queryKey: ['/api/telephony/calls'],
    enabled: activeView === 'history',
  });

  const searchNumbersMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/telephony/numbers/search?areaCode=${code}`);
      if (!res.ok) throw new Error('Failed to search numbers');
      return res.json();
    },
    onSuccess: (data) => {
      setAvailableNumbers(data);
      addLog(`Found ${data.length} available numbers in area code ${areaCode}`);
    },
    onError: (error: any) => {
      toast({ title: 'Search Failed', description: error.message, variant: 'destructive' });
      addLog(`ERROR: Search failed - ${error.message}`);
    }
  });

  const provisionMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const baseUrl = window.location.origin;
      return apiRequest('POST', '/api/telephony/numbers/provision', {
        phoneNumber,
        voiceUrl: `${baseUrl}/webhook/voice/kimi`,
        smsUrl: `${baseUrl}/webhook/sms`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      setAvailableNumbers([]);
      setAreaCode('');
      toast({ title: 'Success', description: 'Phone number provisioned successfully!' });
      addLog('Number provisioned and webhooks configured');
    },
    onError: (error: any) => {
      toast({ title: 'Provision Failed', description: error.message, variant: 'destructive' });
      addLog(`ERROR: Provision failed - ${error.message}`);
    }
  });

  const releaseMutation = useMutation({
    mutationFn: async (phoneSid: string) => {
      return apiRequest('POST', '/api/telephony/numbers/release', { phoneSid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      toast({ title: 'Released', description: 'Phone number has been released' });
      addLog('Phone number released');
    },
    onError: (error: any) => {
      toast({ title: 'Release Failed', description: error.message, variant: 'destructive' });
    }
  });

  const addExistingNumberMutation = useMutation({
    mutationFn: async (data: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
      phoneSid: string;
      friendlyName: string;
      isSubAccount: boolean;
      parentAccountSid: string | null;
    }) => {
      return apiRequest('POST', '/api/telephony/numbers/existing', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      setShowAddExisting(false);
      setExistingAccountSid('');
      setExistingAuthToken('');
      setExistingPhoneNumber('');
      setExistingPhoneSid('');
      setExistingFriendlyName('');
      setExistingIsSubAccount(false);
      setExistingParentAccountSid('');
      toast({ title: 'Success', description: response?.message || 'Number configured successfully!' });
      addLog('Existing phone number configured');
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      addLog(`ERROR: ${error.message}`);
    }
  });

  const handleAddExistingNumber = () => {
    if (!existingPhoneNumber) {
      toast({ title: 'Required', description: 'Phone number is required', variant: 'destructive' });
      return;
    }
    addExistingNumberMutation.mutate({
      accountSid: existingAccountSid,
      authToken: existingAuthToken,
      phoneNumber: existingPhoneNumber,
      phoneSid: existingPhoneSid,
      friendlyName: existingFriendlyName || 'AI Agent Trunk',
      isSubAccount: existingIsSubAccount,
      parentAccountSid: existingIsSubAccount ? existingParentAccountSid : null,
    });
  };
  
  const resetExistingForm = () => {
    setShowAddExisting(false);
    setExistingAccountSid('');
    setExistingAuthToken('');
    setExistingPhoneNumber('');
    setExistingPhoneSid('');
    setExistingFriendlyName('');
    setExistingIsSubAccount(false);
    setExistingParentAccountSid('');
  };

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<TelephonyConfig>) => {
      if (!config?.id) throw new Error('No config found');
      return apiRequest('PATCH', `/api/telephony/config/${config.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      toast({ title: 'Saved', description: 'Configuration updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  });

  const updateWebhooksMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', '/api/telephony/webhooks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      toast({ title: 'Saved', description: 'Webhooks updated successfully' });
      addLog('Webhook configuration synced with Twilio');
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  });

  const updateFirewallMutation = useMutation({
    mutationFn: async (data: { firewallEnabled?: boolean; allowedNumbers?: string[]; ownerPhone?: string; ownerEmail?: string }) => {
      return apiRequest('PATCH', '/api/telephony/firewall', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      addLog('Firewall settings updated');
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  });

  const handleSearch = () => {
    if (areaCode.length >= 3) {
      addLog(`Searching for numbers in area code ${areaCode}...`);
      searchNumbersMutation.mutate(areaCode);
    }
  };

  const handleProvision = (number: string) => {
    addLog(`Provisioning number ${number}...`);
    provisionMutation.mutate(number);
  };

  const handleAddAllowed = () => {
    if (newAllowedNumber && config) {
      const updated = [...(config.allowedNumbers || []), newAllowedNumber];
      updateFirewallMutation.mutate({ allowedNumbers: updated });
      setNewAllowedNumber('');
      addLog(`Added ${newAllowedNumber} to allowed list`);
    }
  };

  const handleRemoveAllowed = (num: string) => {
    if (config) {
      const updated = (config.allowedNumbers || []).filter(n => n !== num);
      updateFirewallMutation.mutate({ allowedNumbers: updated });
      addLog(`Removed ${num} from allowed list`);
    }
  };

  const toggleTailing = () => {
    if (isTailing) {
      setIsTailing(false);
      addLog('Event tailing stopped');
    } else {
      setIsTailing(true);
      addLog('Connecting to event stream...');
      setTimeout(() => addLog('Connected. Watching for webhook events...'), 800);
    }
  };

  // Test outbound call mutation - makes a real call via Twilio
  const testOutboundMutation = useMutation({
    mutationFn: async ({ to, message }: { to: string; message?: string }) => {
      const res = await apiRequest('POST', '/api/telephony/test/outbound', { to, message });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        addLog(`Outbound call initiated: ${data.callSid}`);
        addLog(data.message);
        toast({ title: 'Call Initiated', description: data.message });
        queryClient.invalidateQueries({ queryKey: ['/api/telephony/calls'] });
      } else {
        addLog(`ERROR: ${data.error || 'Unknown error'}`);
      }
    },
    onError: (error: any) => {
      addLog(`ERROR: ${error.message}`);
      toast({ title: 'Call Failed', description: error.message, variant: 'destructive' });
    }
  });

  // Test inbound call mutation - simulates an inbound call
  const testInboundMutation = useMutation({
    mutationFn: async ({ from }: { from: string }) => {
      const res = await apiRequest('POST', '/api/telephony/test/inbound', { from });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.blocked) {
        addLog(`BLOCKED: ${data.message}`);
        toast({ title: 'Call Blocked', description: data.message, variant: 'destructive' });
      } else if (data.success) {
        addLog(`Inbound call simulated: ${data.callSid}`);
        addLog(data.message);
        toast({ title: 'Inbound Test Complete', description: data.message });
        queryClient.invalidateQueries({ queryKey: ['/api/telephony/calls'] });
      } else {
        addLog(`ERROR: ${data.error || 'Unknown error'}`);
      }
    },
    onError: (error: any) => {
      addLog(`ERROR: ${error.message}`);
      toast({ title: 'Test Failed', description: error.message, variant: 'destructive' });
    }
  });

  // Webhook simulation mutation
  const simulateWebhookMutation = useMutation({
    mutationFn: async (data: { type: string; from: string; body?: string; callStatus?: string }) => {
      const res = await apiRequest('POST', '/api/telephony/simulate-webhook', data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        addLog(`Webhook simulation → ${data.webhookUrl}`);
        addLog(`Type: ${data.type} | Status: ${data.status}`);
        addLog(`Signature: ${data.signature}`);
        if (data.response) {
          addLog(`Response: ${data.response.substring(0, 200)}...`);
        }
        toast({ title: 'Webhook Sent', description: `${data.type} webhook delivered to twilio.gatewayglobal.ai` });
      } else {
        addLog(`Webhook failed: Status ${data.status}`);
        addLog(`Response: ${data.response}`);
        toast({ title: 'Webhook Failed', description: `Status ${data.status}`, variant: 'destructive' });
      }
    },
    onError: (error: any) => {
      addLog(`ERROR: ${error.message}`);
      toast({ title: 'Webhook Failed', description: error.message, variant: 'destructive' });
    }
  });

  const handleTestCall = (direction: 'inbound' | 'outbound') => {
    const number = testNumber.trim();
    if (!number) {
      toast({ title: 'Phone Required', description: 'Please enter a phone number', variant: 'destructive' });
      return;
    }
    
    addLog(`Testing ${direction} call: ${number}`);
    
    if (direction === 'outbound') {
      testOutboundMutation.mutate({ to: number });
    } else {
      testInboundMutation.mutate({ from: number });
    }
  };

  // Initialize local state from config
  useEffect(() => {
    if (config) {
      setLocalFriendlyName(config.friendlyName || '');
      setLocalVoiceUrl(config.voiceUrl || '');
      setLocalVoiceFallbackUrl(config.voiceFallbackUrl || '');
      setLocalStatusCallbackUrl(config.statusCallbackUrl || '');
      setLocalSmsUrl(config.smsUrl || '');
      setLocalSmsFallbackUrl(config.smsFallbackUrl || '');
      setLocalOwnerPhone(config.ownerPhone || '');
      setLocalOwnerEmail(config.ownerEmail || '');
      setLocalMaxCallDuration(String(config.maxCallDuration || 60));
      setLocalTimeout(String(config.timeout || 30));
      setSettingsInitialized(true);
    }
  }, [config?.id]); // Only re-init when config id changes (new config loaded)

  // Save settings handler
  const saveSettings = async () => {
    if (!config?.id) return;
    
    // Save config to database
    updateConfigMutation.mutate({
      friendlyName: localFriendlyName || null,
      voiceUrl: localVoiceUrl || null,
      voiceFallbackUrl: localVoiceFallbackUrl || null,
      statusCallbackUrl: localStatusCallbackUrl || null,
      smsUrl: localSmsUrl || null,
      smsFallbackUrl: localSmsFallbackUrl || null,
      maxCallDuration: parseInt(localMaxCallDuration) || 60,
      timeout: parseInt(localTimeout) || 30,
    });
    
    // Also sync webhooks to Twilio if phone is provisioned
    if (config.phoneSid) {
      updateWebhooksMutation.mutate({
        phoneSid: config.phoneSid,
        voiceUrl: localVoiceUrl || '',
        voiceFallbackUrl: localVoiceFallbackUrl || '',
        statusCallback: localStatusCallbackUrl || '',
        smsUrl: localSmsUrl || '',
        smsFallbackUrl: localSmsFallbackUrl || '',
      });
    }
  };

  // Save firewall settings handler
  const saveFirewallSettings = () => {
    updateFirewallMutation.mutate({
      ownerPhone: localOwnerPhone || undefined,
      ownerEmail: localOwnerEmail || undefined,
    });
  };

  const tabs: { id: TelephonyView; label: string; icon: any }[] = [
    { id: 'provisioning', label: 'Provisioning', icon: Download },
    { id: 'settings', label: 'Configuration', icon: Settings },
    { id: 'firewall', label: 'Firewall', icon: Shield },
    { id: 'diagnostics', label: 'Diagnostics', icon: Terminal },
    { id: 'history', label: 'Call History', icon: History },
  ];

  if (configLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-title">
                Telephony Control Panel
              </h1>
              <p className="text-sm text-muted-foreground font-mono flex items-center gap-2 mt-1">
                <Signal className="w-3 h-3" />
                TRUNK: {config?.phoneNumber || 'UNPROVISIONED'}
              </p>
            </div>
          </div>
          
          <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 transition-all ${
            config?.phoneNumber 
              ? 'bg-chart-3/10 border-chart-3/30' 
              : 'bg-muted border-border'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              config?.phoneNumber ? 'bg-chart-3 animate-pulse' : 'bg-muted-foreground/50'
            }`} />
            <span className={`text-xs font-bold tracking-wider ${
              config?.phoneNumber ? 'text-chart-3' : 'text-muted-foreground'
            }`} data-testid="status-gateway">
              {config?.phoneNumber ? 'GATEWAY ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 p-1.5 bg-card rounded-xl border border-card-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              data-testid={`button-tab-${tab.id}`}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeView === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          
          {/* PROVISIONING VIEW */}
          {activeView === 'provisioning' && (
            <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    Number Provisioning
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xl">
                    Search and provision phone numbers from Twilio. Numbers are instantly configured with voice and SMS webhooks.
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Region: US
                </Badge>
              </div>
              
              {!config?.phoneNumber ? (
                <div className="max-w-2xl mx-auto space-y-6 py-6">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                        +1
                      </span>
                      <Input 
                        type="text" 
                        placeholder="Area Code (e.g. 415)"
                        value={areaCode}
                        onChange={(e) => setAreaCode(e.target.value.replace(/\D/g,'').slice(0,3))}
                        className="pl-12 h-12 text-lg font-mono"
                        data-testid="input-area-code"
                      />
                    </div>
                    <Button 
                      onClick={handleSearch}
                      disabled={areaCode.length < 3 || searchNumbersMutation.isPending}
                      className="h-12 px-6"
                      data-testid="button-search-numbers"
                    >
                      {searchNumbersMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                      <span className="ml-2 hidden sm:inline">Search</span>
                    </Button>
                  </div>

                  {availableNumbers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                      {availableNumbers.map(num => (
                        <div 
                          key={num.phoneNumber} 
                          className="flex justify-between items-center p-4 bg-accent/50 rounded-xl border border-border hover:border-primary/50 hover:bg-accent transition-all"
                        >
                          <div>
                            <span className="font-mono text-foreground text-lg block">{num.phoneNumber}</span>
                            <span className="text-xs text-muted-foreground">
                              {num.locality}, {num.region}
                            </span>
                          </div>
                          <Button 
                            size="sm"
                            variant="secondary"
                            onClick={() => handleProvision(num.phoneNumber)}
                            disabled={provisionMutation.isPending}
                            data-testid={`button-provision-${num.phoneNumber}`}
                          >
                            {provisionMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : 'Select'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {availableNumbers.length === 0 && !searchNumbersMutation.isPending && (
                    <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                      <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground font-medium">Search for available numbers</p>
                      <p className="text-muted-foreground/70 text-sm mt-1">Enter a 3-digit US area code above</p>
                    </div>
                  )}
                  
                  {/* Divider */}
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-muted-foreground text-sm">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  {/* Add Existing Number */}
                  {!showAddExisting ? (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddExisting(true)}
                      className="w-full gap-2"
                      data-testid="button-add-existing"
                    >
                      <Plus className="w-4 h-4" />
                      Add Existing Number
                    </Button>
                  ) : (
                    <div className="border border-border rounded-xl p-6 bg-accent/30 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Key className="w-4 h-4 text-primary" />
                          Add Existing Twilio Number
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={resetExistingForm}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        Enter your Twilio credentials and phone number details. This is for numbers you already own.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="existingAccountSid">Account SID</Label>
                          <Input
                            id="existingAccountSid"
                            value={existingAccountSid}
                            onChange={(e) => setExistingAccountSid(e.target.value)}
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="font-mono text-sm"
                            data-testid="input-existing-account-sid"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="existingAuthToken">Auth Token</Label>
                          <Input
                            id="existingAuthToken"
                            type="password"
                            value={existingAuthToken}
                            onChange={(e) => setExistingAuthToken(e.target.value)}
                            placeholder="Your auth token"
                            className="font-mono text-sm"
                            data-testid="input-existing-auth-token"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="existingPhoneNumber">Phone Number *</Label>
                          <Input
                            id="existingPhoneNumber"
                            value={existingPhoneNumber}
                            onChange={(e) => setExistingPhoneNumber(e.target.value)}
                            placeholder="+1234567890"
                            className="font-mono"
                            data-testid="input-existing-phone-number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="existingPhoneSid">Phone SID</Label>
                          <Input
                            id="existingPhoneSid"
                            value={existingPhoneSid}
                            onChange={(e) => setExistingPhoneSid(e.target.value)}
                            placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="font-mono text-sm"
                            data-testid="input-existing-phone-sid"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="existingFriendlyName">Friendly Name</Label>
                        <Input
                          id="existingFriendlyName"
                          value={existingFriendlyName}
                          onChange={(e) => setExistingFriendlyName(e.target.value)}
                          placeholder="My AI Agent"
                          data-testid="input-existing-friendly-name"
                        />
                      </div>
                      
                      {/* Sub-Account Toggle */}
                      <div className="border border-border rounded-lg p-4 bg-background/50">
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            id="existingIsSubAccount"
                            checked={existingIsSubAccount}
                            onChange={(e) => setExistingIsSubAccount(e.target.checked)}
                            className="w-4 h-4 rounded border-border"
                            data-testid="checkbox-is-subaccount"
                          />
                          <Label htmlFor="existingIsSubAccount" className="cursor-pointer">
                            This is a Sub-Account
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Check this if the credentials belong to a Twilio sub-account (created from a parent account).
                        </p>
                        
                        {existingIsSubAccount && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label htmlFor="existingParentAccountSid">Parent Account SID</Label>
                            <Input
                              id="existingParentAccountSid"
                              value={existingParentAccountSid}
                              onChange={(e) => setExistingParentAccountSid(e.target.value)}
                              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              className="font-mono text-sm"
                              data-testid="input-parent-account-sid"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="secondary" 
                          onClick={resetExistingForm}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddExistingNumber}
                          disabled={!existingPhoneNumber || addExistingNumberMutation.isPending}
                          className="flex-1 gap-2"
                          data-testid="button-save-existing"
                        >
                          {addExistingNumberMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Save Number
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 p-6 md:p-8 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                          <Signal className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-primary font-semibold uppercase mb-1 tracking-wider">
                            Active Trunk Line
                          </p>
                          <p className="text-3xl md:text-4xl font-mono text-foreground tracking-wider" data-testid="text-phone-number">
                            {config.phoneNumber}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Max: {config.maxCallDuration}m
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Timer className="w-3 h-3" /> Timeout: {config.timeout}s
                            </span>
                            {config.accountSid && (
                              <Badge variant="secondary" className="text-xs">
                                <Key className="w-3 h-3 mr-1" />
                                Custom Credentials
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="destructive"
                        onClick={() => config.phoneSid && releaseMutation.mutate(config.phoneSid)}
                        disabled={releaseMutation.isPending || !config.phoneSid}
                        className="gap-2"
                        data-testid="button-release-number"
                      >
                        {releaseMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Release Number
                      </Button>
                    </div>
                  </div>
                  
                  {/* Credentials Info */}
                  {config.accountSid && (
                    <div className="bg-accent/30 border border-border p-4 rounded-xl">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Key className="w-4 h-4 text-primary" />
                        Twilio Credentials
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Account SID:</span>
                          <span className="ml-2 font-mono text-foreground">{config.accountSid}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Auth Token:</span>
                          <span className="ml-2 font-mono text-foreground">
                            {config.hasAuthToken ? '••••••••••••••••' : 'Not set'}
                          </span>
                        </div>
                        {config.phoneSid && (
                          <div>
                            <span className="text-muted-foreground">Phone SID:</span>
                            <span className="ml-2 font-mono text-foreground">{config.phoneSid}</span>
                          </div>
                        )}
                        {config.isSubAccount && (
                          <>
                            <div>
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">Sub-Account</Badge>
                            </div>
                            {config.parentAccountSid && (
                              <div className="md:col-span-2">
                                <span className="text-muted-foreground">Parent Account:</span>
                                <span className="ml-2 font-mono text-foreground">{config.parentAccountSid}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* SETTINGS VIEW */}
          {activeView === 'settings' && (
            <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Twilio Configuration
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xl">
                    Configure webhooks and settings for voice and SMS handling. Changes sync directly with Twilio.
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  <Activity className="w-3 h-3 mr-1 text-chart-3" />
                  Live Sync
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Identity Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                    Identity & Credentials
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Friendly Name / Caller ID</label>
                      <Input 
                        value={localFriendlyName}
                        onChange={(e) => setLocalFriendlyName(e.target.value)}
                        placeholder="AI Agent Trunk"
                        data-testid="input-friendly-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Phone Number</label>
                        <Input 
                          value={config?.phoneNumber || 'Not Provisioned'}
                          readOnly
                          className="bg-muted font-mono text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Phone SID</label>
                        <Input 
                          value={config?.phoneSid || 'N/A'}
                          readOnly
                          className="bg-muted font-mono text-muted-foreground text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voice Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                    Voice Configuration
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-primary font-medium flex items-center gap-1">
                        <PhoneIncoming className="w-3 h-3" /> Voice Webhook URL
                      </label>
                      <Input 
                        value={localVoiceUrl}
                        onChange={(e) => setLocalVoiceUrl(e.target.value)}
                        placeholder="https://your-domain.com/api/webhooks/voice"
                        className="font-mono text-sm"
                        data-testid="input-voice-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Voice Fallback URL</label>
                      <Input 
                        value={localVoiceFallbackUrl}
                        onChange={(e) => setLocalVoiceFallbackUrl(e.target.value)}
                        className="font-mono text-sm"
                        data-testid="input-voice-fallback-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Status Callback URL</label>
                      <Input 
                        value={localStatusCallbackUrl}
                        onChange={(e) => setLocalStatusCallbackUrl(e.target.value)}
                        className="font-mono text-sm"
                        data-testid="input-status-callback-url"
                      />
                    </div>
                  </div>
                </div>

                {/* Messaging Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                    Messaging Configuration
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-chart-2 font-medium flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> SMS Webhook URL
                      </label>
                      <Input 
                        value={localSmsUrl}
                        onChange={(e) => setLocalSmsUrl(e.target.value)}
                        placeholder="https://your-domain.com/api/webhooks/sms"
                        className="font-mono text-sm"
                        data-testid="input-sms-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">SMS Fallback URL</label>
                      <Input 
                        value={localSmsFallbackUrl}
                        onChange={(e) => setLocalSmsFallbackUrl(e.target.value)}
                        className="font-mono text-sm"
                        data-testid="input-sms-fallback-url"
                      />
                    </div>
                  </div>
                </div>

                {/* Error & Timing Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                    Debugging & Timing
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Max Call Duration (min)</label>
                        <Input 
                          type="number"
                          value={localMaxCallDuration}
                          onChange={(e) => setLocalMaxCallDuration(e.target.value)}
                          data-testid="input-max-duration"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Ring Timeout (sec)</label>
                        <Input 
                          type="number"
                          value={localTimeout}
                          onChange={(e) => setLocalTimeout(e.target.value)}
                          data-testid="input-timeout"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-border flex justify-end">
                <Button 
                  onClick={saveSettings}
                  disabled={updateConfigMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-settings"
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Save Configuration
                </Button>
              </div>

            </Card>
          )}

          {/* FIREWALL VIEW */}
          {activeView === 'firewall' && (
            <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Inbound Firewall
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xl">
                    Control which numbers can reach your agent. When enabled, only numbers in the allow list can connect.
                  </p>
                </div>
              </div>

              {/* Firewall Toggle */}
              <div className={`p-6 rounded-xl border-2 mb-8 transition-all ${
                config?.firewallEnabled 
                  ? 'bg-chart-3/5 border-chart-3/30' 
                  : 'bg-destructive/5 border-destructive/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      config?.firewallEnabled ? 'bg-chart-3/20' : 'bg-destructive/20'
                    }`}>
                      {config?.firewallEnabled ? (
                        <ShieldCheck className="w-6 h-6 text-chart-3" />
                      ) : (
                        <Ban className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${
                        config?.firewallEnabled ? 'text-chart-3' : 'text-destructive'
                      }`}>
                        {config?.firewallEnabled ? 'Firewall Active' : 'Firewall Disabled'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {config?.firewallEnabled 
                          ? 'Only allowed numbers can make inbound calls' 
                          : 'All inbound calls are accepted'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config?.firewallEnabled || false}
                    onCheckedChange={(checked) => updateFirewallMutation.mutate({ firewallEnabled: checked })}
                    data-testid="switch-firewall"
                  />
                </div>
              </div>

              {/* Owner Verification Section */}
              <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 mb-8">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Owner Verification
                </h4>
                <p className="text-muted-foreground text-sm mb-4">
                  Primary contact for system alerts and ownership verification.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Owner Phone Number</label>
                    <Input 
                      value={localOwnerPhone}
                      onChange={(e) => setLocalOwnerPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="font-mono"
                      data-testid="input-owner-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Owner Email</label>
                    <Input 
                      value={localOwnerEmail}
                      onChange={(e) => setLocalOwnerEmail(e.target.value)}
                      placeholder="owner@example.com"
                      data-testid="input-owner-email"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={saveFirewallSettings}
                    disabled={updateFirewallMutation.isPending}
                    size="sm"
                    className="gap-2"
                    data-testid="button-save-owner"
                  >
                    {updateFirewallMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Save Owner Info
                  </Button>
                </div>
              </div>

              {/* Allowed Numbers */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Allowed Numbers ({config?.allowedNumbers?.length || 0})
                </h4>
                
                <div className="flex gap-3">
                  <Input 
                    value={newAllowedNumber}
                    onChange={(e) => setNewAllowedNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="font-mono"
                    data-testid="input-allowed-number"
                  />
                  <Button onClick={handleAddAllowed} disabled={!newAllowedNumber} data-testid="button-add-allowed">
                    <Plus className="w-4 h-4" />
                    <span className="ml-2 hidden sm:inline">Add</span>
                  </Button>
                </div>

                {(config?.allowedNumbers?.length || 0) > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {config?.allowedNumbers?.map((num, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{num}</span>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleRemoveAllowed(num)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          data-testid={`button-remove-${num}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <User className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-muted-foreground">No numbers in allow list</p>
                    <p className="text-muted-foreground/70 text-sm mt-1">
                      {config?.firewallEnabled 
                        ? 'Add numbers to allow inbound calls' 
                        : 'All calls are currently allowed'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* DIAGNOSTICS VIEW */}
          {activeView === 'diagnostics' && (
            <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    Diagnostics Console
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xl">
                    Test call flows and monitor real-time events from your telephony system.
                  </p>
                </div>
                <Button
                  onClick={toggleTailing}
                  variant={isTailing ? "destructive" : "secondary"}
                  className="gap-2"
                  data-testid="button-tail-events"
                >
                  {isTailing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isTailing ? 'Stop Tailing' : 'Start Tailing'}
                </Button>
              </div>

              {/* Test Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-accent/50 rounded-xl border border-border space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <PhoneIncoming className="w-4 h-4 text-chart-3" />
                    Test Inbound Call
                  </h4>
                  <Input 
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="font-mono"
                    data-testid="input-test-number"
                  />
                  <Button 
                    onClick={() => handleTestCall('inbound')} 
                    variant="secondary" 
                    className="w-full"
                    disabled={testInboundMutation.isPending}
                    data-testid="button-test-inbound"
                  >
                    {testInboundMutation.isPending ? 'Testing...' : 'Test Inbound'}
                  </Button>
                </div>
                <div className="p-4 bg-accent/50 rounded-xl border border-border space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <PhoneOutgoing className="w-4 h-4 text-primary" />
                    Test Outbound Call
                  </h4>
                  <Input 
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="font-mono"
                    data-testid="input-test-outbound-number"
                  />
                  <Button 
                    onClick={() => handleTestCall('outbound')} 
                    variant="secondary" 
                    className="w-full"
                    disabled={testOutboundMutation.isPending}
                    data-testid="button-test-outbound"
                  >
                    {testOutboundMutation.isPending ? 'Calling...' : 'Make Test Call'}
                  </Button>
                </div>
              </div>
              
              {/* Webhook Simulation */}
              <div className="mb-6">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Webhook className="w-4 h-4 text-purple-500" />
                  Webhook Simulator
                  <Badge variant="outline" className="text-xs ml-2">twilio.gatewayglobal.ai</Badge>
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Test webhooks with proper X-Twilio-Signature - no Twilio credits used
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    onClick={() => simulateWebhookMutation.mutate({ type: 'sms', from: testNumber || '+15550001234', body: 'Hello from webhook simulator!' })}
                    variant="outline" 
                    className="gap-2"
                    disabled={simulateWebhookMutation.isPending}
                    data-testid="button-simulate-sms"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Simulate SMS
                  </Button>
                  <Button 
                    onClick={() => simulateWebhookMutation.mutate({ type: 'voice', from: testNumber || '+15550001234' })}
                    variant="outline" 
                    className="gap-2"
                    disabled={simulateWebhookMutation.isPending}
                    data-testid="button-simulate-voice"
                  >
                    <Phone className="w-4 h-4" />
                    Simulate Voice
                  </Button>
                  <Button 
                    onClick={() => simulateWebhookMutation.mutate({ type: 'status', from: testNumber || '+15550001234', callStatus: 'completed' })}
                    variant="outline" 
                    className="gap-2"
                    disabled={simulateWebhookMutation.isPending}
                    data-testid="button-simulate-status"
                  >
                    <Activity className="w-4 h-4" />
                    Simulate Status
                  </Button>
                </div>
              </div>

              {/* Console Output */}
              <div className="bg-[#0d1117] rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-[#161b22] border-b border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">Event Log</span>
                  <div className="flex items-center gap-2">
                    {isTailing && (
                      <span className="flex items-center gap-1 text-xs text-chart-3">
                        <div className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
                        Live
                      </span>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setConsoleLogs([])}
                      className="h-6 text-xs"
                      data-testid="button-clear-logs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64">
                  <div className="p-4 font-mono text-xs space-y-1">
                    {consoleLogs.length === 0 ? (
                      <p className="text-muted-foreground/50">Waiting for events...</p>
                    ) : (
                      consoleLogs.map((log, i) => (
                        <p 
                          key={i} 
                          className={`${
                            log.includes('ERROR') || log.includes('BLOCKED') 
                              ? 'text-destructive' 
                              : log.includes('200 OK') || log.includes('completed')
                              ? 'text-chart-3'
                              : 'text-foreground/80'
                          }`}
                        >
                          {log}
                        </p>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </Card>
          )}

          {/* HISTORY VIEW */}
          {activeView === 'history' && (
            <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Call History
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xl">
                    View recent calls and messages processed by your telephony system.
                  </p>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => refetchCallLogs()}
                  className="gap-2"
                  data-testid="button-refresh-history"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>

              {callLogsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (callLogs?.length || 0) > 0 ? (
                <div className="space-y-2">
                  {callLogs?.map((call, i) => (
                    <div 
                      key={call.sid || i}
                      className="flex items-center justify-between p-4 bg-accent/30 rounded-xl border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          call.direction === 'inbound' 
                            ? 'bg-chart-3/20' 
                            : 'bg-primary/20'
                        }`}>
                          {call.direction === 'inbound' ? (
                            <PhoneIncoming className={`w-4 h-4 ${
                              call.status === 'completed' ? 'text-chart-3' : 'text-destructive'
                            }`} />
                          ) : (
                            <PhoneOutgoing className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-mono text-sm">
                            {call.direction === 'inbound' ? call.from : call.to}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {call.startTime ? new Date(call.startTime).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={
                          call.status === 'completed' ? 'default' :
                          call.status === 'no-answer' ? 'secondary' : 'destructive'
                        }>
                          {call.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {call.status === 'no-answer' && <PhoneMissed className="w-3 h-3 mr-1" />}
                          {call.status === 'busy' && <XCircle className="w-3 h-3 mr-1" />}
                          {call.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground font-mono">
                          {call.duration}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                  <History className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No call history yet</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">
                    Calls will appear here once your number is active
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
