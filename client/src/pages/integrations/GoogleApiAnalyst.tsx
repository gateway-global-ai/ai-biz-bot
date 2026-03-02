import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowLeft, Send, DollarSign, Shield, BarChart3,
  Calculator, Loader2, Trash2, Plus, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';

interface ApiInfo {
  name: string;
  category: string;
  costPer1000: number;
  costPerRequest: number;
  freeMonthly: number;
  tier: string;
  notes: string;
}

interface UsageScenario {
  apiId: string;
  monthlyVolume: number;
  description?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type AnalystMode = 'chat' | 'calculator' | 'rate-limits' | 'pricing';

export default function GoogleApiAnalyst() {
  const [mode, setMode] = useState<AnalystMode>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [scenarios, setScenarios] = useState<UsageScenario[]>([
    { apiId: 'places_aggregate_insights', monthlyVolume: 500 },
    { apiId: 'places_text_search_essentials', monthlyVolume: 200 },
  ]);
  const [monthlyBudget, setMonthlyBudget] = useState('50');
  const [targetMargin, setTargetMargin] = useState('60');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: apisData } = useQuery<{ success: boolean; apis: Record<string, ApiInfo> }>({
    queryKey: ['/api/google-analyst/apis'],
  });

  const apis = apisData?.apis || {};

  const analyzeMutation = useMutation({
    mutationFn: async (question: string) => {
      const conversationHistory = chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest('POST', '/api/google-analyst/analyze', {
        question,
        scenarios: scenarios.length > 0 ? scenarios : undefined,
        conversationHistory: conversationHistory.slice(-10),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.analysis) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.analysis,
          timestamp: new Date(),
        }]);
      }
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/google-analyst/calculate-costs', { scenarios });
      return res.json();
    },
  });

  const rateLimitsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/google-analyst/rate-limits', {
        scenarios,
        monthlyBudget: parseFloat(monthlyBudget),
      });
      return res.json();
    },
  });

  const pricingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/google-analyst/pricing-strategy', {
        services: [{
          name: 'Business Intelligence Reports',
          apis: scenarios,
        }],
        targetMargin: parseFloat(targetMargin),
      });
      return res.json();
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = () => {
    if (!chatInput.trim() || analyzeMutation.isPending) return;
    const userMsg: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    analyzeMutation.mutate(chatInput.trim());
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const addScenario = () => {
    setScenarios(prev => [...prev, { apiId: 'places_details_essentials', monthlyVolume: 100 }]);
  };

  const removeScenario = (index: number) => {
    setScenarios(prev => prev.filter((_, i) => i !== index));
  };

  const updateScenario = (index: number, field: keyof UsageScenario, value: string | number) => {
    setScenarios(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const quickQuestions = [
    "What's the cheapest way to build a hotel competitor search tool?",
    "Compare Places Details vs Grounding Lite for getting business info",
    "How much would it cost to serve 100 businesses doing 10 reports each per month?",
    "What rate limits should we set with a $50/month budget?",
  ];

  const renderModeContent = () => {
    switch (mode) {
      case 'chat':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Search className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground" data-testid="text-analyst-title">Google API Analyst</h3>
                    <p className="text-sm text-muted-foreground mt-1">Powered by Gemini with embedded Google API pricing knowledge</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
                    {quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setChatInput(q);
                        }}
                        className="text-left p-3 rounded-md border text-sm text-muted-foreground hover-elevate"
                        data-testid={`button-quick-question-${i}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-muted text-foreground'
                    }`}
                    data-testid={`text-chat-message-${i}`}
                  >
                    <pre className="whitespace-pre-wrap text-sm font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}

              {analyzeMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Analyzing with Gemini...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about Google API costs, rate limits, or pricing strategies..."
                  className="resize-none min-h-[44px] max-h-32"
                  rows={1}
                  data-testid="input-chat"
                />
                <Button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || analyzeMutation.isPending}
                  data-testid="button-send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 'calculator':
        return (
          <div className="p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-foreground" data-testid="text-calculator-title">Cost Calculator</h3>
              <Button size="sm" onClick={addScenario} data-testid="button-add-scenario">
                <Plus className="w-4 h-4 mr-1" /> Add API
              </Button>
            </div>

            <div className="space-y-3">
              {scenarios.map((scenario, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-muted-foreground mb-1 block">API</label>
                        <Select
                          value={scenario.apiId}
                          onValueChange={(v) => updateScenario(index, 'apiId', v)}
                        >
                          <SelectTrigger data-testid={`select-api-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(apis).map(([id, api]) => (
                              <SelectItem key={id} value={id}>{api.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <label className="text-xs text-muted-foreground mb-1 block">Monthly Volume</label>
                        <Input
                          type="number"
                          value={scenario.monthlyVolume}
                          onChange={(e) => updateScenario(index, 'monthlyVolume', parseInt(e.target.value) || 0)}
                          data-testid={`input-volume-${index}`}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeScenario(index)}
                        data-testid={`button-remove-scenario-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {apis[scenario.apiId] && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">${apis[scenario.apiId].costPerRequest}/req</Badge>
                        <Badge variant="secondary">{apis[scenario.apiId].freeMonthly.toLocaleString()} free/mo</Badge>
                        <Badge variant="outline">{apis[scenario.apiId].tier}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={() => calculateMutation.mutate()}
              disabled={calculateMutation.isPending || scenarios.length === 0}
              className="w-full"
              data-testid="button-calculate"
            >
              {calculateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
              Calculate Costs
            </Button>

            {calculateMutation.data?.success && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                    Cost Breakdown
                    <Badge variant="default" data-testid="text-total-cost">
                      ${calculateMutation.data.totalMonthlyCost}/mo
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {calculateMutation.data.scenarios?.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm flex-wrap gap-1">
                      <span className="text-muted-foreground">{s.apiName}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {s.billableRequests.toLocaleString()} billable / {s.monthlyVolume.toLocaleString()} total
                        </span>
                        <Badge variant={s.monthlyCost > 0 ? 'default' : 'secondary'}>
                          ${s.monthlyCost.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t text-sm text-muted-foreground">
                    {calculateMutation.data.totalFreeRequests.toLocaleString()} requests covered by free tier
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'rate-limits':
        return (
          <div className="p-4 space-y-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground" data-testid="text-rate-limits-title">Rate Limit Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              Uses your cost calculator scenarios to recommend daily limits, burst rates, and budget alerts.
            </p>

            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Monthly Budget ($)</label>
                <Input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  data-testid="input-monthly-budget"
                />
              </div>
              <Button
                onClick={() => rateLimitsMutation.mutate()}
                disabled={rateLimitsMutation.isPending || scenarios.length === 0}
                data-testid="button-get-rate-limits"
              >
                {rateLimitsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                Get Recommendations
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Using {scenarios.length} API scenario{scenarios.length !== 1 ? 's' : ''} from calculator
            </div>

            {rateLimitsMutation.data?.success && (
              <Card>
                <CardContent className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-foreground" data-testid="text-rate-limits-result">
                    {rateLimitsMutation.data.recommendations}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'pricing':
        return (
          <div className="p-4 space-y-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground" data-testid="text-pricing-title">Pricing Strategy</h3>
            <p className="text-sm text-muted-foreground">
              Generate tiered pricing plans for reselling API capabilities as a service.
            </p>

            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Target Margin (%)</label>
                <Input
                  type="number"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                  data-testid="input-target-margin"
                />
              </div>
              <Button
                onClick={() => pricingMutation.mutate()}
                disabled={pricingMutation.isPending || scenarios.length === 0}
                data-testid="button-get-pricing"
              >
                {pricingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                Generate Strategy
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Using {scenarios.length} API scenario{scenarios.length !== 1 ? 's' : ''} from calculator
            </div>

            {pricingMutation.data?.success && (
              <Card>
                <CardContent className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-foreground" data-testid="text-pricing-result">
                    {pricingMutation.data.strategy}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  const modeButtons: { id: AnalystMode; label: string; icon: typeof DollarSign }[] = [
    { id: 'chat', label: 'Chat', icon: Send },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'rate-limits', label: 'Rate Limits', icon: Shield },
    { id: 'pricing', label: 'Pricing', icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between gap-2 p-3 border-b flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/agents">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <DollarSign className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-semibold text-foreground" data-testid="text-page-title">Google API Analyst</h2>
          <Badge variant="outline">Gemini</Badge>
        </div>

        <div className="flex gap-1">
          {modeButtons.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={mode === id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode(id)}
              className="toggle-elevate"
              data-testid={`button-mode-${id}`}
            >
              <Icon className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderModeContent()}
      </div>
    </div>
  );
}
