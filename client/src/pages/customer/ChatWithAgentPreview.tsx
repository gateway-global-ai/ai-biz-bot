import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StandardizedChatInterface from '@/components/StandardizedChatInterface';

interface AgentPreviewProps {
  agentId?: string;
  showThoughtProcess?: boolean;
}

interface ThoughtStep {
  id: string;
  timestamp: Date;
  type: 'thinking' | 'action' | 'observation' | 'decision';
  content: string;
  agentName?: string;
}

export default function ChatWithAgentPreview({ 
  agentId,
  showThoughtProcess = true 
}: AgentPreviewProps) {
  const [showOrchestration, setShowOrchestration] = useState(true);
  const [currentAgent, setCurrentAgent] = useState('AI Biz Bot');
  const [thoughtProcess, setThoughtProcess] = useState<ThoughtStep[]>([]);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed'>('idle');

  // Simulate thought process updates
  const addThought = (type: ThoughtStep['type'], content: string, agentName?: string) => {
    const newThought: ThoughtStep = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
      type,
      content,
      agentName,
    };
    setThoughtProcess(prev => [...prev, newThought]);
  };

  // Demo: Simulate agent thinking when messages are sent
  const simulateAgentThinking = () => {
    setStatus('processing');
    
    setTimeout(() => {
      addThought('thinking', 'Analyzing user query to determine intent...');
    }, 500);
    
    setTimeout(() => {
      addThought('observation', 'User is asking about business hours');
    }, 1000);
    
    setTimeout(() => {
      addThought('action', 'Searching business database for operating hours', 'Chat Agent');
    }, 1500);
    
    setTimeout(() => {
      addThought('decision', 'Found information, preparing response');
    }, 2000);
    
    setTimeout(() => {
      setStatus('completed');
    }, 2500);
  };

  const getTypeIcon = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'thinking':
        return '🧠';
      case 'action':
        return '⚡';
      case 'observation':
        return '👁️';
      case 'decision':
        return '✅';
      default:
        return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Agent Chat Preview</h1>
          <p className="text-gray-400">
            See how agents think and work in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface - Left/Main */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
              <div className="h-[700px]">
                <StandardizedChatInterface
                  mode="customer"
                  botName="AI Biz Bot"
                  fullscreen={true}
                />
              </div>
            </Card>
          </div>

          {/* Agent Orchestration - Right Sidebar */}
          {showThoughtProcess && (
            <div className="space-y-4">
              {/* Current Agent */}
              <Card className="p-4 bg-gradient-to-br from-purple-900/20 to-slate-900/50 border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Active Agent</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOrchestration(!showOrchestration)}
                  >
                    {showOrchestration ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{currentAgent}</div>
                    <Badge 
                      variant="outline" 
                      className={
                        status === 'processing' 
                          ? 'border-yellow-500 text-yellow-400'
                          : status === 'completed'
                          ? 'border-green-500 text-green-400'
                          : 'border-gray-500 text-gray-400'
                      }
                    >
                      {status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Thought Process */}
              {showOrchestration && (
                <Card className="bg-slate-900/50 border-slate-700 overflow-hidden">
                  <div className="p-4 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-white">Thought Process</h3>
                      </div>
                      <Badge variant="outline">{thoughtProcess.length} steps</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 h-[540px] overflow-y-auto space-y-3">
                    {thoughtProcess.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Send a message to see agent thinking</p>
                      </div>
                    ) : (
                      thoughtProcess.map((step) => (
                        <div
                          key={step.id}
                          className="border-l-2 border-purple-500/30 pl-3 py-2"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{getTypeIcon(step.type)}</span>
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
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-slate-700">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={simulateAgentThinking}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Simulate Agent Thinking
                    </Button>
                  </div>
                </Card>
              )}

              {/* Agent Info */}
              <Card className="p-4 bg-slate-900/50 border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-3">Available Agents</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-400">AI Biz Bot</span>
                    <Badge variant="outline" className="text-xs">Orchestrator</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-400">Chat Agent</span>
                    <Badge variant="outline" className="text-xs bg-green-500/10">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-400">Voice Agent</span>
                    <Badge variant="outline" className="text-xs">Standby</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-400">SMS Agent</span>
                    <Badge variant="outline" className="text-xs">Standby</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-400">SWOT Agent</span>
                    <Badge variant="outline" className="text-xs">Standby</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
