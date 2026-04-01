import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, Phone, Users, BarChart3, Settings, Check, 
  Loader2, PhoneCall, MessageSquare, Clock, TrendingUp,
  Building2, Plus, Trash2, Key, Zap
} from 'lucide-react';
import type { TelephonyConfig, Customer, CallLog, TwilioSubAccount, SiteConfig } from '@shared/schema';

export default function GatewayAdmin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('config');
  const [showCreateSubAccount, setShowCreateSubAccount] = useState(false);
  const [newSubAccountName, setNewSubAccountName] = useState('');
  const [newSubAccountEmail, setNewSubAccountEmail] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  
  // Provision Number dialog state
  const [provisioningSiteId, setProvisioningSiteId] = useState<string | null>(null);
  const [provisionAreaCode, setProvisionAreaCode] = useState('');

  // Local state for editable fields
  const [editedPhoneNumber, setEditedPhoneNumber] = useState('');
  const [editedPhoneSid, setEditedPhoneSid] = useState('');
  const [editedFriendlyName, setEditedFriendlyName] = useState('');
  const [editedAccountSid, setEditedAccountSid] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery<TelephonyConfig>({
    queryKey: ['/api/telephony/config'],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: callLogs = [], isLoading: logsLoading } = useQuery<CallLog[]>({
    queryKey: ['/api/call-logs'],
  });

  const { data: subAccounts = [], isLoading: subAccountsLoading } = useQuery<TwilioSubAccount[]>({
    queryKey: ['/api/twilio/sub-accounts'],
  });

  const { data: siteConfigs = [], isLoading: siteConfigsLoading } = useQuery<SiteConfig[]>({
    queryKey: ['/api/site-configs'],
    enabled: activeTab === 'ai-partners',
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<TelephonyConfig>) => 
      apiRequest('PATCH', '/api/telephony/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telephony/config'] });
      toast({ title: 'Gateway configuration updated' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const createSubAccountMutation = useMutation({
    mutationFn: (data: { friendlyName: string; ownerEmail?: string }) =>
      apiRequest('POST', '/api/twilio/sub-accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/twilio/sub-accounts'] });
      toast({ title: 'Sub-account created successfully' });
      setShowCreateSubAccount(false);
      setNewSubAccountName('');
      setNewSubAccountEmail('');
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteSubAccountMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/twilio/sub-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/twilio/sub-accounts'] });
      toast({ title: 'Sub-account deleted' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const provisionNumberMutation = useMutation({
    mutationFn: ({ siteId, areaCode }: { siteId: string; areaCode: string }) =>
      apiRequest('POST', `/api/site-configs/${siteId}/provision-number`, { areaCode }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/twilio/sub-accounts'] });
      toast({
        title: 'Phone number provisioned!',
        description: `${data.phoneNumber} is now live and connected.`,
      });
      setProvisioningSiteId(null);
      setProvisionAreaCode('');
    },
    onError: (error: any) => toast({ title: 'Provisioning failed', description: error.message, variant: 'destructive' }),
  });

  // Initialize edited values when config loads
  const initializeEditedValues = () => {
    if (config) {
      setEditedPhoneNumber(config.phoneNumber || '');
      setEditedPhoneSid(config.phoneSid || '');
      setEditedFriendlyName(config.friendlyName || '');
      setEditedAccountSid(config.accountSid || '');
      setHasChanges(false);
    }
  };

  // Check for changes
  const checkForChanges = () => {
    if (!config) return false;
    return (
      editedPhoneNumber !== (config.phoneNumber || '') ||
      editedPhoneSid !== (config.phoneSid || '') ||
      editedFriendlyName !== (config.friendlyName || '') ||
      editedAccountSid !== (config.accountSid || '')
    );
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate({
      phoneNumber: editedPhoneNumber || undefined,
      phoneSid: editedPhoneSid || undefined,
      friendlyName: editedFriendlyName || undefined,
      accountSid: editedAccountSid || undefined,
    });
    setHasChanges(false);
  };

  // Update hasChanges whenever fields change
  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'phoneNumber':
        setEditedPhoneNumber(value);
        break;
      case 'phoneSid':
        setEditedPhoneSid(value);
        break;
      case 'friendlyName':
        setEditedFriendlyName(value);
        break;
      case 'accountSid':
        setEditedAccountSid(value);
        break;
    }
    setHasChanges(true);
  };

  // Initialize when config loads
  useEffect(() => {
    initializeEditedValues();
  }, [config]);

  const totalCalls = callLogs.length;
  const completedCalls = callLogs.filter(c => c.status === 'completed').length;
  const totalMinutes = callLogs.reduce((acc, c) => acc + (c.duration || 0), 0) / 60;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gateway Admin</h1>
            <p className="text-slate-400">Manage Gateway Global AI platform settings</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{customers.length}</p>
                  <p className="text-xs text-slate-400">Total Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{totalCalls}</p>
                  <p className="text-xs text-slate-400">Total Calls</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{totalMinutes.toFixed(1)}</p>
                  <p className="text-xs text-slate-400">Minutes Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{completedCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0}%</p>
                  <p className="text-xs text-slate-400">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="config" className="data-[state=active]:bg-purple-600" data-testid="tab-config">
              <Settings className="w-4 h-4 mr-2" />
              Gateway Config
            </TabsTrigger>
            <TabsTrigger value="ai-partners" className="data-[state=active]:bg-purple-600" data-testid="tab-ai-partners">
              <Zap className="w-4 h-4 mr-2" />
              AI Partners
            </TabsTrigger>
            <TabsTrigger value="sub-accounts" className="data-[state=active]:bg-purple-600" data-testid="tab-sub-accounts">
              <Building2 className="w-4 h-4 mr-2" />
              Sub-Accounts
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-purple-600" data-testid="tab-customers">
              <Users className="w-4 h-4 mr-2" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-purple-600" data-testid="tab-usage">
              <BarChart3 className="w-4 h-4 mr-2" />
              Usage & Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-400" />
                  Gateway Global Phone Number
                </CardTitle>
                <CardDescription>
                  The main phone number for Gateway Global AI platform communications and OTP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {configLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Phone Number</label>
                        <div className="flex items-center gap-2">
                          <Input 
                            value={editedPhoneNumber} 
                            onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                            className="bg-slate-800 border-slate-700"
                            data-testid="input-gateway-phone"
                          />
                          {editedPhoneNumber && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              <Check className="w-3 h-3 mr-1" /> Configured
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Phone SID</label>
                        <Input 
                          value={editedPhoneSid} 
                          onChange={(e) => handleFieldChange('phoneSid', e.target.value)}
                          placeholder="PN..."
                          className="bg-slate-800 border-slate-700 font-mono text-xs"
                          data-testid="input-gateway-sid"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Friendly Name</label>
                        <Input 
                          value={editedFriendlyName} 
                          onChange={(e) => handleFieldChange('friendlyName', e.target.value)}
                          placeholder="AI Agent Trunk"
                          className="bg-slate-800 border-slate-700"
                          data-testid="input-gateway-friendly-name"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 block mb-2">Account SID</label>
                        <Input 
                          value={editedAccountSid} 
                          onChange={(e) => handleFieldChange('accountSid', e.target.value)}
                          placeholder="AC..."
                          className="bg-slate-800 border-slate-700 font-mono text-xs"
                          data-testid="input-gateway-account-sid"
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400 mb-2">
                          Configure the main Gateway Global number for platform SMS and OTP.
                        </p>
                        <Button 
                          variant="outline" 
                          className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                          onClick={() => window.location.href = '/twilio-account'}
                          data-testid="button-manage-twilio"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Twilio Settings
                        </Button>
                      </div>
                      {hasChanges && (
                        <Button 
                          onClick={handleSaveConfig}
                          disabled={updateConfigMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-500"
                          data-testid="button-save-config"
                        >
                          {updateConfigMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-partners" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  AI Partner Deployments
                </CardTitle>
                <CardDescription>
                  Provision dedicated phone numbers for your AI Partner clients. Each partner gets
                  their own Twilio sub-account and a local number with the voice webhook pre-configured.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {siteConfigsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  </div>
                ) : siteConfigs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No AI Partner deployments yet</p>
                    <p className="text-sm mt-1">Create site configurations to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {siteConfigs.map((site) => (
                      <div
                        key={site.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                        data-testid={`ai-partner-row-${site.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{site.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {site.provisionedPhoneNumber ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-400">
                                  <Phone className="w-3 h-3" />
                                  {site.provisionedPhoneNumber}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">No number provisioned</span>
                              )}
                              {site.domain && (
                                <span className="text-xs text-slate-500">• {site.domain}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {site.provisionedPhoneNumber ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              <Phone className="w-3 h-3 mr-1" /> Live
                            </Badge>
                          ) : (
                            <Dialog
                              open={provisioningSiteId === site.id}
                              onOpenChange={(open) => {
                                if (!open) { setProvisioningSiteId(null); setProvisionAreaCode(''); }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-amber-600 hover:bg-amber-500"
                                  onClick={() => setProvisioningSiteId(site.id)}
                                  data-testid={`button-provision-number-${site.id}`}
                                >
                                  <Phone className="w-3 h-3 mr-1" />
                                  Provision Number
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-900 border-slate-700">
                                <DialogHeader>
                                  <DialogTitle className="text-white">
                                    Provision Number for {site.name}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <p className="text-sm text-slate-400">
                                    A dedicated Twilio sub-account will be created for this AI Partner,
                                    and a local phone number from the requested area code will be
                                    purchased and pre-wired to the voice AI webhook.
                                  </p>
                                  <div>
                                    <Label className="text-slate-300">Area Code (US)</Label>
                                    <Input
                                      value={provisionAreaCode}
                                      onChange={(e) => setProvisionAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                      placeholder="e.g. 415"
                                      maxLength={3}
                                      className="bg-slate-800 border-slate-700 mt-1 font-mono"
                                      data-testid="input-provision-area-code"
                                    />
                                  </div>
                                  <Button
                                    className="w-full bg-amber-600 hover:bg-amber-500"
                                    disabled={provisionAreaCode.length !== 3 || provisionNumberMutation.isPending}
                                    onClick={() => provisionNumberMutation.mutate({ siteId: site.id, areaCode: provisionAreaCode })}
                                    data-testid="button-confirm-provision-number"
                                  >
                                    {provisionNumberMutation.isPending ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Provisioning…
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="w-4 h-4 mr-2" />
                                        Provision Number
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sub-accounts" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    Twilio Sub-Accounts
                  </CardTitle>
                  <CardDescription>
                    Manage Twilio sub-accounts for multi-tenant phone number provisioning
                  </CardDescription>
                </div>
                <Dialog open={showCreateSubAccount} onOpenChange={setShowCreateSubAccount}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-500" data-testid="button-create-sub-account">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Sub-Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create Twilio Sub-Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label className="text-slate-300">Account Name</Label>
                        <Input
                          value={newSubAccountName}
                          onChange={(e) => setNewSubAccountName(e.target.value)}
                          placeholder="e.g. Client XYZ"
                          className="bg-slate-800 border-slate-700 mt-1"
                          data-testid="input-sub-account-name"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Owner Email (optional)</Label>
                        <Input
                          value={newSubAccountEmail}
                          onChange={(e) => setNewSubAccountEmail(e.target.value)}
                          placeholder="owner@example.com"
                          className="bg-slate-800 border-slate-700 mt-1"
                          data-testid="input-sub-account-email"
                        />
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-500"
                        onClick={() => createSubAccountMutation.mutate({
                          friendlyName: newSubAccountName || 'Gateway Sub-Account',
                          ownerEmail: newSubAccountEmail || undefined
                        })}
                        disabled={createSubAccountMutation.isPending}
                        data-testid="button-confirm-create-sub-account"
                      >
                        {createSubAccountMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Create Sub-Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {subAccountsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : subAccounts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sub-accounts yet</p>
                    <p className="text-sm mt-1">Create a sub-account to provision phone numbers for clients</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                        data-testid={`sub-account-row-${account.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{account.friendlyName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400 font-mono">{account.accountSid}</span>
                              {account.ownerEmail && (
                                <span className="text-xs text-slate-500">• {account.ownerEmail}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={
                            account.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            account.status === 'suspended' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {account.status}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => deleteSubAccountMutation.mutate(account.id)}
                            disabled={deleteSubAccountMutation.isPending}
                            data-testid={`button-delete-sub-account-${account.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Customer List
                </CardTitle>
                <CardDescription>
                  All customers who have submitted tasks through Gateway Global AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No customers yet</p>
                    <p className="text-sm mt-1">Customers will appear here when they submit tasks</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div 
                        key={customer.id} 
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                        data-testid={`customer-row-${customer.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {customer.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{customer.name || 'Unknown'}</p>
                            <p className="text-sm text-slate-400">{customer.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={
                            customer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            customer.status === 'lead' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {customer.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Call Logs & Usage
                </CardTitle>
                <CardDescription>
                  View all calls and messages processed through Gateway Global AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : callLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <PhoneCall className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No call logs yet</p>
                    <p className="text-sm mt-1">Call logs will appear here as calls are made</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {callLogs.slice(0, 50).map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                        data-testid={`call-log-${log.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            log.direction === 'inbound' ? 'bg-blue-500/20' : 'bg-emerald-500/20'
                          }`}>
                            <PhoneCall className={`w-4 h-4 ${
                              log.direction === 'inbound' ? 'text-blue-400' : 'text-emerald-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-white">{log.phoneNumber}</p>
                            <p className="text-xs text-slate-400 capitalize">{log.direction}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={
                            log.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            log.status === 'missed' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            log.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            {log.status}
                          </Badge>
                          <span className="text-sm text-slate-400">{log.duration}s</span>
                          <span className="text-xs text-slate-500">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
