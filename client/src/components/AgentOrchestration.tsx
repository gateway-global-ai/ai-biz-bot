import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, AlertCircle, Brain, Zap, Activity } from 'lucide-react';

interface ThoughtStep {
  id: string;
  timestamp: Date;
  type: 'thinking' | 'action' | 'observation' | 'decision';
  content: string;
  agentId?: string;
  agentName?: string;
  metadata?: Record<string, any>;
}

interface OrchestrationState {
  activeAgentId: string;
  activeAgentName: string;
  thoughtProcess: ThoughtStep[];
  status: 'idle' | 'processing' | 'completed' | 'error';
}

interface AgentOrchestrationProps {
  swarmId?: string;
  showThoughtProcess?: boolean;
  onAgentSwitch?: (agentId: string) => void;
}

export default function AgentOrchestration({ 
  swarmId, 
  showThoughtProcess = true,
  onAgentSwitch 
}: AgentOrchestrationProps) {
  const [orchestrationState, setOrchestrationState] = useState<OrchestrationState>({
    activeAgentId: '',
    activeAgentName: '',
    thoughtProcess: [],
    status: 'idle',
  });

  const { data: swarm } = useQuery({
    queryKey: swarmId ? [`/api/swarms/${swarmId}`] : null,
    enabled: !!swarmId,
  });

  const addThoughtStep = (step: Omit<ThoughtStep, 'id' | 'timestamp'>) => {
    const newStep: ThoughtStep = {
      ...step,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
    };

    setOrchestrationState(prev => ({
      ...prev,
      thoughtProcess: [...prev.thoughtProcess, newStep],
    }));
  };

  const switchAgent = (agentId: string, agentName: string, reason: string) => {
    addThoughtStep({
      type: 'decision',
      content: `Switching to ${agentName}: ${reason}`,
      agentId,
      agentName,
    });

    setOrchestrationState(prev => ({
      ...prev,
      activeAgentId: agentId,
      activeAgentName: agentName,
    }));

    onAgentSwitch?.(agentId);
  };

  const getTypeIcon = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'thinking':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'action':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'observation':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'decision':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'thinking':
        return 'border-l-purple-400';
      case 'action':
        return 'border-l-yellow-400';
      case 'observation':
        return 'border-l-blue-400';
      case 'decision':
        return 'border-l-green-400';
      default:
        return 'border-l-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Agent Display */}
      <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Active Agent</div>
              <div className="text-lg font-semibold text-white">
                {orchestrationState.activeAgentName || 'AI Biz Bot (Orchestrator)'}
              </div>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${
              orchestrationState.status === 'processing' 
                ? 'border-yellow-500 text-yellow-400'
                : orchestrationState.status === 'completed'
                ? 'border-green-500 text-green-400'
                : orchestrationState.status === 'error'
                ? 'border-red-500 text-red-400'
                : 'border-gray-500 text-gray-400'
            }`}
          >
            {orchestrationState.status === 'processing' && (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            )}
            {orchestrationState.status.toUpperCase()}
          </Badge>
        </div>
      </Card>

      {/* Thought Process Visualization */}
      {showThoughtProcess && (
        <Card className="bg-slate-900/50 border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Agent Thought Process</h3>
              <Badge variant="outline" className="ml-auto">
                {orchestrationState.thoughtProcess.length} steps
              </Badge>
            </div>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {orchestrationState.thoughtProcess.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No thought process recorded yet</p>
                  <p className="text-sm mt-1">Agent thinking will appear here in real-time</p>
                </div>
              ) : (
                orchestrationState.thoughtProcess.map((step) => (
                  <div
                    key={step.id}
                    className={`border-l-2 pl-4 py-2 ${getTypeColor(step.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getTypeIcon(step.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-0 capitalize"
                          >
                            {step.type}
                          </Badge>
                          {step.agentName && (
                            <span className="text-xs text-gray-500">
                              {step.agentName}
                            </span>
                          )}
                          <span className="text-xs text-gray-600 ml-auto">
                            {step.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 break-words">
                          {step.content}
                        </p>
                        {step.metadata && Object.keys(step.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500 font-mono bg-slate-800/50 p-2 rounded">
                            {JSON.stringify(step.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Demo Controls (for demonstration) */}
      <Card className="p-4 bg-slate-900/50 border-slate-700">
        <div className="text-sm text-gray-400 mb-3">Demo Controls</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              addThoughtStep({
                type: 'thinking',
                content: 'Analyzing customer query: "What are your business hours?"',
              });
              setOrchestrationState(prev => ({ ...prev, status: 'processing' }));
            }}
          >
            Simulate Thinking
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              addThoughtStep({
                type: 'action',
                content: 'Searching business database for operating hours',
                metadata: { query: 'business_hours' },
              });
            }}
          >
            Simulate Action
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              switchAgent(
                'chat-agent-123',
                'Chat Support Agent',
                'Customer requires detailed product information'
              );
            }}
          >
            Simulate Agent Switch
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              addThoughtStep({
                type: 'observation',
                content: 'Found business hours: Mon-Fri 9AM-5PM, Sat 10AM-2PM',
              });
              setOrchestrationState(prev => ({ ...prev, status: 'completed' }));
            }}
          >
            Simulate Completion
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setOrchestrationState({
                activeAgentId: '',
                activeAgentName: '',
                thoughtProcess: [],
                status: 'idle',
              });
            }}
          >
            Clear
          </Button>
        </div>
      </Card>
    </div>
  );
}
