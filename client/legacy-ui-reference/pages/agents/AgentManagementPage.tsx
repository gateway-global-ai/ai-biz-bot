import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Phone, PhoneCall, MessageSquare, Users, Plus, Settings, Play, Pause } from 'lucide-react';

interface AgentInstance {
  id: string;
  templateId: string;
  businessId: string;
  name: string;
  modal: 'voice-inbound' | 'voice-outbound' | 'sms' | 'chat';
  isActive: boolean;
  performance?: {
    totalInteractions: number;
    successRate: number;
    averageResponseTime: number;
    customerSatisfaction: number;
  };
}

const MODAL_CONFIG = {
  'voice-inbound': { icon: Phone, label: 'Inbound Calls', color: 'bg-blue-500' },
  'voice-outbound': { icon: PhoneCall, label: 'Outbound Calls', color: 'bg-green-500' },
  'sms': { icon: MessageSquare, label: 'SMS', color: 'bg-purple-500' },
  'chat': { icon: Bot, label: 'Chat', color: 'bg-indigo-500' },
};

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId] = useState('demo-business-1'); // Would come from auth context

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const res = await fetch(`/api/agents/business/${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSetup = async () => {
    try {
      const res = await fetch('/api/agents/quick-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessName: 'Demo Business',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAgents([
          data.agents.chat,
          data.agents.voiceInbound,
          data.agents.voiceOutbound,
          data.agents.sms,
        ]);
      }
    } catch (error) {
      console.error('Quick setup failed:', error);
    }
  };

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        loadAgents();
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  const performBusinessResearch = async () => {
    try {
      const res = await fetch('/api/business-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: 'Demo Business',
          industry: 'Professional Services',
          location: {
            address: '123 Main St',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
          },
        }),
      });

      if (res.ok) {
        const insights = await res.json();
        console.log('Business insights:', insights);
        
        // Train agents with insights
        const agentIds = agents.map(a => a.id);
        await fetch('/api/business-research/train-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessInsights: insights,
            agentIds,
          }),
        });
        
        alert('Business research complete! Agents have been trained with insights.');
      }
    } catch (error) {
      console.error('Business research failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agent Management</h1>
        <p className="text-muted-foreground">
          Manage your AI agents and configure agent behavior
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Set up and manage your agents
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={handleQuickSetup} disabled={agents.length > 0}>
              <Plus className="w-4 h-4 mr-2" />
              Quick Setup (Deploy All Agents)
            </Button>
            <Button onClick={performBusinessResearch} variant="outline" disabled={agents.length === 0}>
              <Bot className="w-4 h-4 mr-2" />
              Perform Business Research
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Agents Deployed</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by deploying your agents
                </p>
                <Button onClick={handleQuickSetup}>
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Setup
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => {
                const config = MODAL_CONFIG[agent.modal];
                const Icon = config.icon;

                return (
                  <Card key={agent.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${config.color} text-white`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{agent.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {config.label}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={agent.isActive ? 'default' : 'secondary'}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {agent.performance && (
                        <div className="space-y-2 text-sm mb-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Interactions:</span>
                            <span className="font-medium">{agent.performance.totalInteractions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Success Rate:</span>
                            <span className="font-medium">
                              {(agent.performance.successRate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Response:</span>
                            <span className="font-medium">
                              {agent.performance.averageResponseTime.toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={agent.isActive ? 'outline' : 'default'}
                          className="flex-1"
                          onClick={() => toggleAgent(agent.id, agent.isActive)}
                        >
                          {agent.isActive ? (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
