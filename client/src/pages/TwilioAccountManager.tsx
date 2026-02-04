import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  CreditCard, 
  Building2, 
  Key, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Globe,
  DollarSign,
  Users,
  Eye,
  EyeOff,
  ShieldCheck,
  Settings,
  Signal
} from 'lucide-react';

type AccountView = 'credentials' | 'subaccounts' | 'phones' | 'billing';

interface TwilioAccountInfo {
  sid: string;
  friendlyName: string;
  status: string;
  type: string;
  dateCreated: string;
}

interface TwilioSubAccount {
  sid: string;
  friendlyName: string;
  status: string;
  dateCreated: string;
  authToken?: string;
}

interface OwnedPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  voiceUrl?: string;
  smsUrl?: string;
  dateCreated: string;
}

interface BillingInfo {
  balance: string;
  currency: string;
  usageThisMonth?: {
    calls: number;
    sms: number;
    totalCost: string;
  };
}

export default function TwilioAccountManager() {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<AccountView>('credentials');
  const [showToken, setShowToken] = useState(false);
  const [newSubAccountName, setNewSubAccountName] = useState('');

  const { data: accountInfo, isLoading: accountLoading, refetch: refetchAccount } = useQuery<TwilioAccountInfo>({
    queryKey: ['/api/twilio/account'],
  });

  const { data: subAccounts, isLoading: subAccountsLoading, refetch: refetchSubAccounts } = useQuery<TwilioSubAccount[]>({
    queryKey: ['/api/twilio/subaccounts'],
    enabled: activeView === 'subaccounts',
  });

  const { data: numbersData, isLoading: numbersLoading, refetch: refetchNumbers } = useQuery<{ numbers: OwnedPhoneNumber[] }>({
    queryKey: ['/api/twilio/numbers'],
    enabled: activeView === 'phones',
  });
  const ownedNumbers = numbersData?.numbers;

  const { data: billingInfo, isLoading: billingLoading, refetch: refetchBilling } = useQuery<BillingInfo>({
    queryKey: ['/api/twilio/billing'],
    enabled: activeView === 'billing',
  });

  const createSubAccountMutation = useMutation({
    mutationFn: async (friendlyName: string) => {
      return apiRequest('POST', '/api/twilio/subaccounts', { friendlyName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/twilio/subaccounts'] });
      setNewSubAccountName('');
      toast({ title: 'Success', description: 'Sub-account created successfully!' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const suspendSubAccountMutation = useMutation({
    mutationFn: async (sid: string) => {
      return apiRequest('PATCH', `/api/twilio/subaccounts/${sid}`, { status: 'suspended' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/twilio/subaccounts'] });
      toast({ title: 'Success', description: 'Sub-account suspended' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const tabs: { id: AccountView; label: string; icon: any }[] = [
    { id: 'credentials', label: 'Credentials', icon: Key },
    { id: 'subaccounts', label: 'Sub-Accounts', icon: Users },
    { id: 'phones', label: 'Phone Numbers', icon: Phone },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  if (accountLoading) {
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              Twilio Account Manager
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your Twilio credentials, sub-accounts, phone numbers, and billing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5 py-1.5">
              {accountInfo?.status === 'active' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-chart-3" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              )}
              {accountInfo?.status || 'Unknown'}
            </Badge>
          </div>
        </div>

        {/* Account Summary Card */}
        {accountInfo && (
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account SID</p>
                <p className="font-mono text-sm truncate" data-testid="text-account-sid">{accountInfo.sid}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Name</p>
                <p className="font-medium">{accountInfo.friendlyName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Type</p>
                <p className="font-medium capitalize">{accountInfo.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                <p className="font-medium">{new Date(accountInfo.dateCreated).toLocaleDateString()}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-accent/50 rounded-xl w-fit">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeView === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView(tab.id)}
              className="gap-2"
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* CREDENTIALS VIEW */}
        {activeView === 'credentials' && (
          <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Credentials
              </h3>
              <p className="text-muted-foreground text-sm max-w-xl">
                Your Twilio account credentials are stored securely as environment secrets. 
                Contact your administrator to update these credentials.
              </p>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-accent/50 border border-border">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Account SID</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={accountInfo?.sid || 'Not configured'}
                        readOnly
                        className="bg-muted font-mono text-sm"
                      />
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="w-3 h-3 text-chart-3" />
                        Configured
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Auth Token</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type={showToken ? "text" : "password"}
                        value="••••••••••••••••••••••••••••••••"
                        readOnly
                        className="bg-muted font-mono text-sm"
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setShowToken(!showToken)}
                        data-testid="button-toggle-token"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Auth tokens are stored as encrypted secrets and cannot be viewed directly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Need to update credentials?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      To update your Twilio credentials, navigate to the Secrets tab in your Replit 
                      workspace and update TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* SUB-ACCOUNTS VIEW */}
        {activeView === 'subaccounts' && (
          <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Sub-Accounts
                </h3>
                <p className="text-muted-foreground text-sm max-w-xl">
                  Create and manage sub-accounts for different customers or projects. 
                  Each sub-account has its own credentials and billing.
                </p>
              </div>
              <Button 
                onClick={() => refetchSubAccounts()}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-refresh-subaccounts"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {/* Create Sub-Account */}
            <div className="p-6 rounded-xl bg-accent/50 border border-border mb-6">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Create New Sub-Account
              </h4>
              <div className="flex gap-3">
                <Input 
                  value={newSubAccountName}
                  onChange={(e) => setNewSubAccountName(e.target.value)}
                  placeholder="Sub-account name (e.g., Customer ABC)"
                  data-testid="input-subaccount-name"
                />
                <Button 
                  onClick={() => createSubAccountMutation.mutate(newSubAccountName)}
                  disabled={!newSubAccountName || createSubAccountMutation.isPending}
                  className="gap-2"
                  data-testid="button-create-subaccount"
                >
                  {createSubAccountMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create
                </Button>
              </div>
            </div>

            {/* Sub-Accounts List */}
            {subAccountsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : subAccounts && subAccounts.length > 0 ? (
              <div className="space-y-3">
                {subAccounts.map((account) => (
                  <div 
                    key={account.sid}
                    className="p-4 rounded-xl border border-border bg-card hover-elevate"
                    data-testid={`subaccount-${account.sid}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.friendlyName}</p>
                          <Badge 
                            variant={account.status === 'active' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {account.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{account.sid}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(account.dateCreated).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => suspendSubAccountMutation.mutate(account.sid)}
                          disabled={account.status === 'suspended'}
                          data-testid={`button-suspend-${account.sid}`}
                        >
                          Suspend
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No sub-accounts yet</p>
                <p className="text-muted-foreground/70 text-sm mt-1">Create a sub-account to get started</p>
              </div>
            )}
          </Card>
        )}

        {/* PHONE NUMBERS VIEW */}
        {activeView === 'phones' && (
          <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Phone Numbers
                </h3>
                <p className="text-muted-foreground text-sm max-w-xl">
                  View and manage all phone numbers provisioned under this account.
                </p>
              </div>
              <Button 
                onClick={() => refetchNumbers()}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-refresh-numbers"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {numbersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : ownedNumbers && ownedNumbers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ownedNumbers.map((number) => (
                  <div 
                    key={number.sid}
                    className="p-4 rounded-xl border border-border bg-card hover-elevate"
                    data-testid={`phone-${number.sid}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Signal className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-mono text-lg font-medium">{number.phoneNumber}</p>
                          <p className="text-xs text-muted-foreground">{number.friendlyName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {number.capabilities.voice && (
                        <Badge variant="secondary" className="text-xs">Voice</Badge>
                      )}
                      {number.capabilities.sms && (
                        <Badge variant="secondary" className="text-xs">SMS</Badge>
                      )}
                      {number.capabilities.mms && (
                        <Badge variant="secondary" className="text-xs">MMS</Badge>
                      )}
                    </div>
                    {number.voiceUrl && (
                      <p className="text-xs text-muted-foreground truncate">
                        Voice: {number.voiceUrl}
                      </p>
                    )}
                    {number.smsUrl && (
                      <p className="text-xs text-muted-foreground truncate">
                        SMS: {number.smsUrl}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <Phone className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No phone numbers</p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  Go to the Telephony panel to provision new numbers
                </p>
              </div>
            )}
          </Card>
        )}

        {/* BILLING VIEW */}
        {activeView === 'billing' && (
          <Card className="p-6 md:p-8 border-t-4 border-t-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Billing & Usage
                </h3>
                <p className="text-muted-foreground text-sm max-w-xl">
                  View your account balance and usage statistics.
                </p>
              </div>
              <Button 
                onClick={() => refetchBilling()}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-refresh-billing"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {billingLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ) : billingInfo ? (
              <div className="space-y-6">
                {/* Balance Card */}
                <div className="p-8 rounded-xl bg-gradient-to-r from-chart-3/10 to-chart-3/5 border border-chart-3/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Account Balance</p>
                      <p className="text-4xl font-bold text-chart-3" data-testid="text-balance">
                        {billingInfo.currency} {billingInfo.balance}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-chart-3/20">
                      <DollarSign className="w-10 h-10 text-chart-3" />
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                {billingInfo.usageThisMonth && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">Voice Calls</p>
                      </div>
                      <p className="text-2xl font-bold">{billingInfo.usageThisMonth.calls}</p>
                      <p className="text-xs text-muted-foreground mt-1">This month</p>
                    </div>
                    <div className="p-6 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-chart-2/10">
                          <Globe className="w-5 h-5 text-chart-2" />
                        </div>
                        <p className="text-sm text-muted-foreground">SMS Messages</p>
                      </div>
                      <p className="text-2xl font-bold">{billingInfo.usageThisMonth.sms}</p>
                      <p className="text-xs text-muted-foreground mt-1">This month</p>
                    </div>
                    <div className="p-6 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-chart-4/10">
                          <CreditCard className="w-5 h-5 text-chart-4" />
                        </div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                      </div>
                      <p className="text-2xl font-bold">{billingInfo.currency} {billingInfo.usageThisMonth.totalCost}</p>
                      <p className="text-xs text-muted-foreground mt-1">This month</p>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Billing Management</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        For detailed billing information, invoices, and payment methods, 
                        please visit your <a href="https://console.twilio.com/billing" target="_blank" rel="noopener noreferrer" className="text-primary underline">Twilio Console</a>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">Unable to load billing information</p>
                <p className="text-muted-foreground/70 text-sm mt-1">Check your Twilio credentials</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
