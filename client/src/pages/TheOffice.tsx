import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, Briefcase, Send, Users, FileText, CheckSquare,
  Server, Zap, Cpu, Radio, Plus
} from 'lucide-react';
import type { Agent } from '@shared/schema';
import type { DiscScores } from '@shared/schema';

import avatar1 from '@assets/freepik__melissa-model-as-a-superhuman-metal-android-smooth__8_1770156432895.png';
import avatar2 from '@assets/freepik__melissa-model-turned-into-a-futuristic-ai-robot-wi__8_1770156535941.png';
import avatar3 from '@assets/freepik__generate-9-different-angles-of-this-image-back-vie__8_1770156725733.png';
import avatar4 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725735.png';
import avatar5 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725736.png';

const AVATAR_OPTIONS = [
  { id: 'avatar1', src: avatar1 },
  { id: 'avatar2', src: avatar2 },
  { id: 'avatar3', src: avatar3 },
  { id: 'avatar4', src: avatar4 },
  { id: 'avatar5', src: avatar5 },
];

const OFFICE_DISC: DiscScores = {
  dominance: 60,
  influence: 55,
  steadiness: 50,
  conscientiousness: 75,
};

export default function TheOffice() {
  const [, params] = useRoute('/agent/:agentId/office');
  const [, setLocation] = useLocation();
  const agentId = params?.agentId;
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const [invitedAgents, setInvitedAgents] = useState<string[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });
  
  const agent = agents.find(a => a.id === agentId);
  const avatar = AVATAR_OPTIONS.find(a => a.id === agent?.avatarId) || AVATAR_OPTIONS[0];
  const otherAgents = agents.filter(a => a.id !== agentId);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: message }]);
    setMessage('');
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        text: "I've reviewed the project requirements. Let me help break this down into actionable items. What's our timeline looking like?"
      }]);
    }, 1500);
  };

  const toggleInviteAgent = (id: string) => {
    setInvitedAgents(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading The Office...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950/30 to-slate-950">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/agents')}
            className="text-slate-400 hover:text-white"
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 font-medium">The Office</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/80 border-blue-500/30 mb-4">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden border-2 border-blue-500/50">
                    <img src={avatar.src} alt={agent.name} className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-lg font-bold text-white">{agent.name}</h2>
                  <p className="text-xs text-slate-400 mb-3">Project Lead</p>
                  
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center gap-1 text-pink-400">
                      <Zap className="w-2 h-2" /> D:{OFFICE_DISC.dominance}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Radio className="w-2 h-2" /> I:{OFFICE_DISC.influence}
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <Cpu className="w-2 h-2" /> S:{OFFICE_DISC.steadiness}
                    </div>
                    <div className="flex items-center gap-1 text-blue-400">
                      <Server className="w-2 h-2" /> C:{OFFICE_DISC.conscientiousness}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> Team
                  </span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-blue-400"
                    onClick={() => setShowInvite(!showInvite)}
                    data-testid="button-invite-toggle"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Invite
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invitedAgents.length === 0 && !showInvite && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Invite other agents to collaborate
                  </p>
                )}
                
                {showInvite && otherAgents.map(a => {
                  const av = AVATAR_OPTIONS.find(opt => opt.id === a.avatarId) || AVATAR_OPTIONS[0];
                  const isInvited = invitedAgents.includes(a.id);
                  return (
                    <div 
                      key={a.id}
                      onClick={() => toggleInviteAgent(a.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isInvited ? 'bg-blue-500/20 border border-blue-500/50' : 'hover:bg-slate-800'
                      }`}
                      data-testid={`invite-agent-${a.id}`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden">
                        <img src={av.src} alt={a.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm text-white flex-1">{a.name}</span>
                      {isInvited && <Badge className="bg-blue-500/30 text-blue-300 text-[10px]">Invited</Badge>}
                    </div>
                  );
                })}

                {invitedAgents.map(id => {
                  const a = agents.find(ag => ag.id === id);
                  if (!a) return null;
                  const av = AVATAR_OPTIONS.find(opt => opt.id === a.avatarId) || AVATAR_OPTIONS[0];
                  return (
                    <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                      <div className="w-8 h-8 rounded-lg overflow-hidden">
                        <img src={av.src} alt={a.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm text-white">{a.name}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="bg-slate-900/80 border-slate-700 h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Project Workspace
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[300px]">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <CheckSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-slate-500">Start collaborating on projects with {agent.name}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {invitedAgents.length > 0 && `+ ${invitedAgents.length} team member(s)`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Describe your project or task..."
                    className="bg-slate-800 border-slate-600"
                    data-testid="input-message"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    className="bg-blue-600 hover:bg-blue-500"
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
