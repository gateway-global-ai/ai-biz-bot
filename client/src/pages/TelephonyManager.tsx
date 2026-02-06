import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone,
  Shield,
  Search,
  History,
  PhoneIncoming,
  PhoneOutgoing,
  Settings,
  Plus,
  RefreshCw,
  Globe,
  MessageSquare,
  CheckCircle2,
  XCircle,
  PhoneMissed,
  Ban,
  Loader2,
  X,
  Code,
  Eye,
  Webhook,
  Copy,
  Clock,
  Users,
  ShieldCheck,
  Timer,
  AlertCircle
} from 'lucide-react';
import { Label } from '@/components/ui/label';

type ViewMode = 'owner' | 'developer';
type OwnerTab = 'phone' | 'firewall' | 'history';
type DevTab = 'webhooks' | 'subaccounts' | 'config';

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
}

export default function TelephonyManager() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('owner');
  const [ownerTab, setOwnerTab] = useState<OwnerTab>('phone');
  const [devTab, setDevTab] = useState<DevTab>('webhooks');
  const [areaCode, setAreaCode] = useState('');
  const [searchResults, setSearchResults] = useState<AvailableNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newAllowedNumber, setNewAllowedNumber] = useState('');
  const [subAccountName, setSubAccountName] = useState('');

  const configQuery = useQuery({
    queryKey: ['/api/telephony/config'],
  });

  const callLogsQuery = useQuery({
    queryKey: ['/api/telephony/calls'],
    enabled: ownerTab === 'history',
  });

  const messageLogsQuery = useQuery({
    queryKey: ['/api/telephony/messages'],
    enabled: ownerTab === 'history',
  });

  const subAccountsQuery = useQuery({
    queryKey: ['/api/twilio/sub-accounts'],
    enabled: viewMode === 'developer' && devTab === 'subaccounts',
  });

  const config = configQuery.data as any;

  const searchNumbers = async () => {
    if (!areaCode || areaCode.length < 3) {
      toast({ title: 'Enter a 3-digit area code', variant: 'destructive' });
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/telephony/numbers/search?areaCode=${areaCode}`);
      const data = await res.json();
      if (res.ok) setSearchResults(data);
      else toast({ title: data.error || 'Search failed', variant: 'destructive' });
    } catch { toast({ title: 'Search failed', variant: 'destructive' }); }
    setIsSearching(false);
  };

  const provisionMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const baseUrl = window.location.origin;
      return apiRequest('/api/telephony/numbers/provision', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, voiceUrl: `${baseUrl}/webhook/voice`, smsUrl: `${baseUrl}/webhook/sms` }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: 'Phone number provisioned' });
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      setSearchResults([]);
      setAreaCode('');
    },
    onError: (err: any) => toast({ title: err.message || 'Failed to provision', variant: 'destructive' }),
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/telephony/config', {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: 'Settings updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
    },
    onError: (err: any) => toast({ title: err.message || 'Update failed', variant: 'destructive' }),
  });

  const applyWebhooksMutation = useMutation({
    mutationFn: async () => {
      if (!config?.phoneSid) throw new Error('No phone SID — provision a number first');
      return apiRequest('/api/telephony/webhooks', {
        method: 'PATCH',
        body: JSON.stringify({
          phoneSid: config.phoneSid,
          voiceUrl: config.voiceUrl || null,
          voiceFallbackUrl: config.voiceFallbackUrl || null,
          statusCallback: config.statusCallbackUrl || null,
          smsUrl: config.smsUrl || null,
          smsFallbackUrl: config.smsFallbackUrl || null,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => toast({ title: 'Webhooks applied to Twilio' }),
    onError: (err: any) => toast({ title: err.message || 'Failed to apply', variant: 'destructive' }),
  });

  const createSubAccountMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('/api/twilio/sub-accounts', {
        method: 'POST',
        body: JSON.stringify({ friendlyName: name }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: 'Sub-account created' });
      queryClient.invalidateQueries({ queryKey: ['/api/twilio/sub-accounts'] });
      setSubAccountName('');
    },
    onError: (err: any) => toast({ title: err.message || 'Failed to create', variant: 'destructive' }),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const callStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'no-answer': case 'missed': return <PhoneMissed className="w-4 h-4 text-amber-500" />;
      case 'busy': case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'blocked': return <Ban className="w-4 h-4 text-red-500" />;
      default: return <Phone className="w-4 h-4 text-slate-400" />;
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-telephony-title">Telephony</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your AI phone line and call settings</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'owner' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('owner')}
            data-testid="button-view-owner"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Owner
          </Button>
          <Button
            variant={viewMode === 'developer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('developer')}
            data-testid="button-view-developer"
          >
            <Code className="w-4 h-4 mr-1.5" />
            Developer
          </Button>
        </div>
      </div>

      {viewMode === 'owner' && (
        <>
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {([
              { key: 'phone', label: 'Phone', icon: Phone },
              { key: 'firewall', label: 'Firewall', icon: Shield },
              { key: 'history', label: 'History', icon: History },
            ] as const).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={ownerTab === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setOwnerTab(key)}
                data-testid={`button-tab-${key}`}
              >
                <Icon className="w-4 h-4 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>

          {ownerTab === 'phone' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Your AI Phone Number
                </h2>
                {config?.phoneNumber ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-2xl font-bold tracking-tight" data-testid="text-phone-number">{config.phoneNumber}</p>
                        <p className="text-sm text-muted-foreground">{config.friendlyName || 'AI Agent Trunk'}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                        Active
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Caller ID</p>
                        <p className="text-sm font-medium truncate">{config.callerIdName || 'Not set'}</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Max Call</p>
                        <p className="text-sm font-medium">{config.maxCallDuration || 60}s</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Timeout</p>
                        <p className="text-sm font-medium">{config.timeout || 30}s</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center">
                      <Phone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground font-medium">No phone number provisioned</p>
                      <p className="text-xs text-muted-foreground mt-1">Search for an available number to get started</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Area code (e.g. 702)"
                        value={areaCode}
                        onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        className="w-40"
                        data-testid="input-area-code"
                      />
                      <Button onClick={searchNumbers} disabled={isSearching} data-testid="button-search-numbers">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Search className="w-4 h-4 mr-1.5" />}
                        Search
                      </Button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {searchResults.map((num) => (
                          <div key={num.phoneNumber} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-mono font-medium text-sm">{num.phoneNumber}</p>
                              <p className="text-xs text-muted-foreground">{num.locality}, {num.region}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {num.capabilities.voice && <Badge variant="secondary" className="text-xs">Voice</Badge>}
                              {num.capabilities.sms && <Badge variant="secondary" className="text-xs">SMS</Badge>}
                              <Button
                                size="sm"
                                onClick={() => provisionMutation.mutate(num.phoneNumber)}
                                disabled={provisionMutation.isPending}
                                data-testid={`button-provision-${num.phoneNumber}`}
                              >
                                {provisionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                                Get
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {config?.phoneNumber && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Call Settings
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Caller ID Name</Label>
                        <Input
                          defaultValue={config.callerIdName || ''}
                          placeholder="Your Business Name"
                          onBlur={(e) => updateConfigMutation.mutate({ callerIdName: e.target.value })}
                          data-testid="input-caller-id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Friendly Name</Label>
                        <Input
                          defaultValue={config.friendlyName || ''}
                          placeholder="AI Agent Trunk"
                          onBlur={(e) => updateConfigMutation.mutate({ friendlyName: e.target.value })}
                          data-testid="input-friendly-name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Max Call Duration (seconds)</Label>
                        <Input
                          type="number"
                          defaultValue={config.maxCallDuration || 60}
                          onBlur={(e) => updateConfigMutation.mutate({ maxCallDuration: parseInt(e.target.value) || 60 })}
                          data-testid="input-max-duration"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Ring Timeout (seconds)</Label>
                        <Input
                          type="number"
                          defaultValue={config.timeout || 30}
                          onBlur={(e) => updateConfigMutation.mutate({ timeout: parseInt(e.target.value) || 30 })}
                          data-testid="input-timeout"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {ownerTab === 'firewall' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Firewall Controls
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-sm">Firewall Enabled</p>
                      <p className="text-xs text-muted-foreground">Only allowed numbers can call your AI line</p>
                    </div>
                  </div>
                  <Switch
                    checked={config?.firewallEnabled ?? true}
                    onCheckedChange={(checked) => updateConfigMutation.mutate({ firewallEnabled: checked })}
                    data-testid="switch-firewall"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Allowed Numbers
                  </h3>
                  <div className="space-y-2 mb-3">
                    {(config?.allowedNumbers || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No numbers in allowlist. {config?.firewallEnabled ? 'All calls will be blocked.' : 'Firewall is off — all calls are accepted.'}</p>
                    ) : (
                      (config.allowedNumbers as string[]).map((num: string, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg">
                          <span className="font-mono text-sm">{num}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (config.allowedNumbers as string[]).filter((_: string, idx: number) => idx !== i);
                              updateConfigMutation.mutate({ allowedNumbers: updated });
                            }}
                            data-testid={`button-remove-number-${i}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+1 (702) 555-1234"
                      value={newAllowedNumber}
                      onChange={(e) => setNewAllowedNumber(e.target.value)}
                      data-testid="input-allowed-number"
                    />
                    <Button
                      onClick={() => {
                        if (!newAllowedNumber.trim()) return;
                        const normalized = newAllowedNumber.replace(/[^\d+]/g, '');
                        const current = (config?.allowedNumbers || []) as string[];
                        updateConfigMutation.mutate({ allowedNumbers: [...current, normalized] });
                        setNewAllowedNumber('');
                      }}
                      data-testid="button-add-number"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {ownerTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Call &amp; Message History
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/telephony/calls'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/telephony/messages'] });
                  }}
                  data-testid="button-refresh-history"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Refresh
                </Button>
              </div>

              <Card className="p-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  Recent Calls
                </h3>
                {callLogsQuery.isLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : (callLogsQuery.data as any[])?.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(callLogsQuery.data as any[]).map((call: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        {call.direction === 'inbound' ? (
                          <PhoneIncoming className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <PhoneOutgoing className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{call.direction === 'inbound' ? call.from : call.to}</p>
                          <p className="text-xs text-muted-foreground">
                            {call.startTime ? new Date(call.startTime).toLocaleString() : 'Unknown time'}
                            {call.duration ? ` · ${call.duration}s` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {callStatusIcon(call.status)}
                          <span className="text-xs text-muted-foreground capitalize">{call.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No call history yet</p>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  Recent Messages
                </h3>
                {messageLogsQuery.isLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : (messageLogsQuery.data as any[])?.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(messageLogsQuery.data as any[]).map((msg: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                        {msg.direction === 'inbound' ? (
                          <PhoneIncoming className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        ) : (
                          <PhoneOutgoing className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{msg.direction === 'inbound' ? msg.from : msg.to}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {msg.dateSent ? new Date(msg.dateSent).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0 capitalize">{msg.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No message history yet</p>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {viewMode === 'developer' && (
        <>
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {([
              { key: 'webhooks', label: 'Webhooks', icon: Webhook },
              { key: 'subaccounts', label: 'Sub-Accounts', icon: Users },
              { key: 'config', label: 'Raw Config', icon: Settings },
            ] as const).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={devTab === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevTab(key)}
                data-testid={`button-devtab-${key}`}
              >
                <Icon className="w-4 h-4 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>

          {devTab === 'webhooks' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Webhook Configuration
              </h2>
              <div className="space-y-4">
                {([
                  { label: 'Voice URL', key: 'voiceUrl', value: config?.voiceUrl },
                  { label: 'Voice Fallback', key: 'voiceFallbackUrl', value: config?.voiceFallbackUrl },
                  { label: 'Status Callback', key: 'statusCallbackUrl', value: config?.statusCallbackUrl },
                  { label: 'SMS URL', key: 'smsUrl', value: config?.smsUrl },
                  { label: 'SMS Fallback', key: 'smsFallbackUrl', value: config?.smsFallbackUrl },
                  { label: 'Error URL', key: 'errorUrl', value: config?.errorUrl },
                ] as const).map(({ label, key, value }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
                    <div className="flex gap-2">
                      <Input
                        defaultValue={value || ''}
                        placeholder={`https://your-domain.com/webhook/${key.replace('Url', '').replace('Fallback', '/fallback')}`}
                        className="font-mono text-xs"
                        onBlur={(e) => updateConfigMutation.mutate({ [key]: e.target.value || null })}
                        data-testid={`input-webhook-${key}`}
                      />
                      {value && (
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(value, label)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {config?.phoneSid && (
                  <div className="pt-4 border-t mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Save webhook URLs to your local config on blur. Click "Apply to Twilio" to push them live.</p>
                    </div>
                    <Button
                      onClick={() => applyWebhooksMutation.mutate()}
                      disabled={applyWebhooksMutation.isPending}
                      data-testid="button-apply-webhooks"
                    >
                      {applyWebhooksMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Globe className="w-4 h-4 mr-1.5" />}
                      Apply to Twilio
                    </Button>
                  </div>
                )}

                {config?.phoneNumber && (
                  <div className="pt-4 border-t mt-4">
                    <h3 className="text-sm font-semibold mb-3">Quick Reference</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Phone SID', value: config.phoneSid },
                        { label: 'Account SID', value: config.accountSid },
                        { label: 'Messaging Service', value: config.messagingServiceSid },
                        { label: 'Config ID', value: config.id },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono truncate flex-1">{value || 'Not set'}</code>
                            {value && (
                              <button onClick={() => copyToClipboard(value, label)} className="text-muted-foreground hover:text-foreground">
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {devTab === 'subaccounts' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Twilio Sub-Accounts
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create isolated Twilio sub-accounts for each customer. Each sub-account has its own credentials, phone numbers, and billing.
              </p>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Sub-account name (e.g. Acme Corp)"
                  value={subAccountName}
                  onChange={(e) => setSubAccountName(e.target.value)}
                  data-testid="input-subaccount-name"
                />
                <Button
                  onClick={() => subAccountName.trim() && createSubAccountMutation.mutate(subAccountName.trim())}
                  disabled={createSubAccountMutation.isPending || !subAccountName.trim()}
                  data-testid="button-create-subaccount"
                >
                  {createSubAccountMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
                  Create
                </Button>
              </div>

              {subAccountsQuery.isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (subAccountsQuery.data as any[])?.length > 0 ? (
                <div className="space-y-3">
                  {(subAccountsQuery.data as any[]).map((acct: any) => (
                    <div key={acct.sid} className="p-4 bg-muted/20 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-sm">{acct.friendlyName}</span>
                        </div>
                        <Badge variant={acct.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">
                          {acct.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-muted-foreground truncate">{acct.sid}</code>
                        <button onClick={() => copyToClipboard(acct.sid, 'SID')} className="text-muted-foreground hover:text-foreground shrink-0">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      {acct.dateCreated && (
                        <p className="text-xs text-muted-foreground">Created: {new Date(acct.dateCreated).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No sub-accounts yet</p>
                </div>
              )}
            </Card>
          )}

          {devTab === 'config' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Raw Configuration
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (config) copyToClipboard(JSON.stringify(config, null, 2), 'Config JSON');
                  }}
                  data-testid="button-copy-config"
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copy JSON
                </Button>
              </div>
              <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed max-h-[500px] overflow-y-auto" data-testid="text-raw-config">
                {config ? JSON.stringify(config, null, 2) : 'No configuration found'}
              </pre>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
