import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, ArrowLeft, Check, Loader2, PhoneCall, 
  Search, Plus, X, Settings, Zap, Mic, ExternalLink
} from 'lucide-react';
import type { Agent } from '@shared/schema';

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

export default function AgentTelephony() {
  const { agentId } = useParams<{ agentId: string }>();
  const { toast } = useToast();
  const [searchArea, setSearchArea] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [existingNumber, setExistingNumber] = useState('');
  const [existingSid, setExistingSid] = useState('');

  const { data: agent, isLoading: agentLoading } = useQuery<Agent>({
    queryKey: ['/api/agents', agentId],
    enabled: !!agentId,
  });

  const { data: availableNumbers = [], isLoading: searchLoading, refetch: searchNumbers } = useQuery<AvailableNumber[]>({
    queryKey: ['/api/telephony/numbers/search', searchArea],
    enabled: false,
  });

  const searchMutation = useMutation({
    mutationFn: async (areaCode: string) => {
      const response = await apiRequest('POST', '/api/telephony/numbers/search', { areaCode });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/telephony/numbers/search', searchArea], data.numbers || []);
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const provisionMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('POST', '/api/telephony/numbers/provision', { phoneNumber });
      const data = await response.json();
      await apiRequest('PATCH', `/api/agents/${agentId}`, { 
        phoneNumber: data.phoneNumber, 
        phoneSid: data.phoneSid 
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents', agentId] });
      setShowSearch(false);
      toast({ title: 'Phone number assigned to agent' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (agent?.phoneSid) {
        await apiRequest('POST', '/api/telephony/numbers/release', { phoneSid: agent.phoneSid });
      }
      await apiRequest('PATCH', `/api/agents/${agentId}`, { phoneNumber: null, phoneSid: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents', agentId] });
      toast({ title: 'Phone number removed from agent' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const linkExistingMutation = useMutation({
    mutationFn: async ({ phoneNumber, phoneSid }: { phoneNumber: string; phoneSid: string }) => {
      const response = await apiRequest('POST', '/api/telephony/numbers/link', { 
        phoneNumber, 
        phoneSid,
        agentId 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents', agentId] });
      setShowSearch(false);
      setExistingNumber('');
      setExistingSid('');
      toast({ title: 'Existing number linked to agent' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const handleSearch = () => {
    if (searchArea.length >= 3) {
      searchMutation.mutate(searchArea);
    } else {
      toast({ title: 'Enter at least 3 digits for area code', variant: 'destructive' });
    }
  };

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <p>Agent not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{agent.name} - Telephony</h1>
            <p className="text-slate-400">Manage phone number for this agent</p>
          </div>
        </div>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-blue-400" />
              Agent Phone Number
            </CardTitle>
            <CardDescription>
              Assign a dedicated phone number for this agent to handle calls and SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agent.phoneNumber ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{agent.phoneNumber}</p>
                      <p className="text-sm text-slate-400">SID: {agent.phoneSid?.slice(0, 15)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Check className="w-3 h-3 mr-1" /> Active
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => removeMutation.mutate()}
                      disabled={removeMutation.isPending}
                      data-testid="button-remove-number"
                    >
                      {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-sm text-slate-400">
                    This number is configured for voice calls with Kimi-Audio AI and SMS messaging.
                    Inbound calls will be handled by this agent's personality and DISC profile.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6 text-slate-400">
                  <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No phone number assigned</p>
                  <p className="text-sm mt-1">Add a new number or connect an existing Twilio number</p>
                </div>
                
                {!showSearch ? (
                  <Button
                    className="w-full"
                    onClick={() => setShowSearch(true)}
                    data-testid="button-add-number"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Phone Number
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">Add Phone Number</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowSearch(false);
                          setExistingNumber('');
                          setExistingSid('');
                          setSearchArea('');
                        }}
                        data-testid="button-cancel-search"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <Tabs defaultValue="existing" className="w-full">
                      <TabsList className="w-full bg-slate-800 border border-slate-700">
                        <TabsTrigger value="existing" className="flex-1" data-testid="tab-existing-number">
                          Use Existing Number
                        </TabsTrigger>
                        <TabsTrigger value="new" className="flex-1" data-testid="tab-new-number">
                          Get New Number
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="existing" className="mt-4 space-y-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-sm text-blue-300">
                            Enter your existing Twilio phone number details. You can find these in your{' '}
                            <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">
                              Twilio Console
                            </a>.
                          </p>
                        </div>
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <p className="text-sm text-amber-300">
                            The number must be in your main Twilio account (not a sub-account). 
                            Webhooks will be automatically configured for voice AI.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Phone Number (E.164 format)</label>
                            <Input
                              placeholder="+17025551234"
                              value={existingNumber}
                              onChange={(e) => setExistingNumber(e.target.value)}
                              className="bg-slate-800 border-slate-600"
                              data-testid="input-existing-number"
                            />
                            <p className="text-xs text-slate-500 mt-1">Format: +1 followed by 10 digits</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Phone SID</label>
                            <Input
                              placeholder="PN followed by 32 characters"
                              value={existingSid}
                              onChange={(e) => setExistingSid(e.target.value)}
                              className="bg-slate-800 border-slate-600 font-mono text-sm"
                              data-testid="input-existing-sid"
                            />
                            <p className="text-xs text-slate-500 mt-1">Found in Twilio Console under Phone Number details</p>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => linkExistingMutation.mutate({ phoneNumber: existingNumber, phoneSid: existingSid })}
                            disabled={linkExistingMutation.isPending || !existingNumber || !existingSid || existingSid.length < 34}
                            data-testid="button-link-existing"
                          >
                            {linkExistingMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Phone className="w-4 h-4 mr-2" />
                            )}
                            Link Existing Number
                          </Button>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="new" className="mt-4 space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter area code (e.g., 702)"
                            value={searchArea}
                            onChange={(e) => setSearchArea(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            className="bg-slate-800 border-slate-600"
                            data-testid="input-area-code"
                          />
                          <Button
                            onClick={handleSearch}
                            disabled={searchMutation.isPending}
                            data-testid="button-search-numbers"
                          >
                            {searchMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        
                        {availableNumbers.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableNumbers.map((num) => (
                              <div 
                                key={num.phoneNumber}
                                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover-elevate"
                              >
                                <div>
                                  <p className="font-medium text-white">{num.phoneNumber}</p>
                                  <p className="text-xs text-slate-400">{num.locality}, {num.region}</p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => provisionMutation.mutate(num.phoneNumber)}
                                  disabled={provisionMutation.isPending}
                                  data-testid={`button-provision-${num.phoneNumber}`}
                                >
                                  {provisionMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Select'
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-indigo-900/30 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Powered by Kimi-Audio AI
            </CardTitle>
            <CardDescription>
              Real-time voice AI via Replicate for natural phone conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white">Kimi-Audio 7B Instruct</h3>
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                    via Replicate
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 mb-3">
                  Advanced audio-to-audio AI model with ~300ms latency for real-time phone conversations. 
                  Supports multi-turn dialogue with natural speech patterns.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">256K Context</Badge>
                  <Badge variant="outline" className="text-xs">Multi-turn Chat</Badge>
                  <Badge variant="outline" className="text-xs">Audio-to-Audio</Badge>
                  <Badge variant="outline" className="text-xs">Low Latency</Badge>
                </div>
              </div>
            </div>
            
            <a 
              href="https://replicate.com/zsxkib/kimi-audio-7b-instruct" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-purple-300 hover:text-purple-200"
              data-testid="link-replicate"
            >
              <ExternalLink className="w-4 h-4" />
              View model on Replicate
            </a>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              Agent Voice Settings
            </CardTitle>
            <CardDescription>
              Current configuration for this agent's phone interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Voice Model</p>
                <p className="text-white font-medium">Kimi-Audio 7B</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Voice Style</p>
                <p className="text-white font-medium">{agent.voiceName}</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">DISC Profile</p>
                <p className="text-white font-medium">
                  D:{agent.dominance} I:{agent.influence} S:{agent.steadiness} C:{agent.conscientiousness}
                </p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Status</p>
                <Badge className={
                  agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  agent.status === 'paused' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-slate-500/20 text-slate-400 border-slate-500/30'
                }>
                  {agent.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
