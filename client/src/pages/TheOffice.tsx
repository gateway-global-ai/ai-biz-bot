import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft, Briefcase, Send, Users, FileText, CheckSquare,
  Zap, Cpu, Radio, Server, Plus, X, Loader2, Building2,
  FolderPlus, ListTodo, Circle, Clock, Eye, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { Agent, Organization, Project, ProjectTask } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

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

const STATUS_ICONS: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  review: Eye,
  done: CheckCircle2,
};

const STATUS_COLORS: Record<string, string> = {
  todo: 'text-slate-400',
  in_progress: 'text-yellow-400',
  review: 'text-blue-400',
  done: 'text-green-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-300',
  medium: 'bg-blue-500/20 text-blue-300',
  high: 'bg-orange-500/20 text-orange-300',
  urgent: 'bg-red-500/20 text-red-300',
};

export default function TheOffice() {
  const [, params] = useRoute('/agent/:agentId/office');
  const [, setLocation] = useLocation();
  const agentId = params?.agentId;
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });

  const { data: projectsList = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects', { orgId: selectedOrgId }],
    queryFn: async () => {
      const url = selectedOrgId ? `/api/projects?orgId=${selectedOrgId}` : '/api/projects';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const { data: tasksList = [] } = useQuery<ProjectTask[]>({
    queryKey: [`/api/projects/${selectedProjectId}/tasks`],
    enabled: !!selectedProjectId,
  });
  
  const agent = agents.find(a => a.id === agentId);
  const avatar = AVATAR_OPTIONS.find(a => a.id === agent?.avatarId) || AVATAR_OPTIONS[0];
  const selectedProject = projectsList.find(p => p.id === selectedProjectId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-select first org/project if available
  useEffect(() => {
    if (orgs.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [orgs, selectedOrgId]);

  useEffect(() => {
    if (projectsList.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsList[0].id);
    }
  }, [projectsList, selectedProjectId]);

  const createOrgMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiRequest('POST', '/api/organizations', data),
    onSuccess: async (res) => {
      const org = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setSelectedOrgId(org.id);
      setShowNewOrg(false);
      setNewOrgName('');
      setNewOrgDesc('');
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: { orgId: string; name: string; description?: string; leadAgentId?: string }) =>
      apiRequest('POST', '/api/projects', data),
    onSuccess: async (res) => {
      const project = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedOrgId] });
      setSelectedProjectId(project.id);
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectDesc('');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; priority?: string; projectId?: string; assignedAgentId?: string }) =>
      apiRequest('POST', `/api/projects/${selectedProjectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}/tasks`] });
      setShowNewTask(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string }) =>
      apiRequest('PATCH', `/api/project-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}/tasks`] });
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || !agent || isSending) return;
    const userMsg = message.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage('');
    setIsSending(true);
    
    try {
      const res = await apiRequest('POST', '/api/chat', {
        agentId: agent.id,
        message: userMsg,
        projectId: selectedProjectId || undefined,
        history: messages.slice(-10).map(m => ({
          role: m.role === 'agent' ? 'assistant' : 'user',
          content: m.text,
        })),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'agent', text: data.response || data.error || 'No response' }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'agent', text: 'I had trouble responding. Please try again.' }]);
    } finally {
      setIsSending(false);
    }
  };

  const cycleTaskStatus = (task: ProjectTask) => {
    const order = ['todo', 'in_progress', 'review', 'done'];
    const currentIdx = order.indexOf(task.status);
    const nextStatus = order[(currentIdx + 1) % order.length];
    updateTaskMutation.mutate({ id: task.id, status: nextStatus });
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
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/agents')}
            className="text-slate-400"
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Agent + Org/Project Selector */}
          <div className="lg:col-span-3 space-y-4">
            {/* Agent Card */}
            <Card className="bg-slate-900/80 border-blue-500/30">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2 rounded-xl overflow-hidden border-2 border-blue-500/50">
                    <img src={avatar.src} alt={agent.name} className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-base font-bold text-white">{agent.name}</h2>
                  <p className="text-xs text-slate-400 mb-2">Project Lead</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center gap-1 text-pink-400">
                      <Zap className="w-2 h-2" /> D:{agent.dominance}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Radio className="w-2 h-2" /> I:{agent.influence}
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <Cpu className="w-2 h-2" /> S:{agent.steadiness}
                    </div>
                    <div className="flex items-center gap-1 text-blue-400">
                      <Server className="w-2 h-2" /> C:{agent.conscientiousness}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Selector */}
            <Card className="bg-slate-900/80 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400 flex items-center justify-between flex-wrap gap-1">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Organization
                  </span>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => setShowNewOrg(!showNewOrg)}
                    data-testid="button-new-org"
                  >
                    <Plus className="w-4 h-4 text-blue-400" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {showNewOrg && (
                  <div className="space-y-2 mb-2">
                    <Input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Organization name..."
                      className="bg-slate-800 border-slate-600 text-sm"
                      data-testid="input-org-name"
                    />
                    <Input
                      value={newOrgDesc}
                      onChange={(e) => setNewOrgDesc(e.target.value)}
                      placeholder="Description (optional)..."
                      className="bg-slate-800 border-slate-600 text-sm"
                      data-testid="input-org-desc"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => newOrgName && createOrgMutation.mutate({ name: newOrgName, description: newOrgDesc || undefined })}
                        disabled={!newOrgName || createOrgMutation.isPending}
                        data-testid="button-create-org"
                      >
                        {createOrgMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewOrg(false)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {orgs.map(org => (
                  <div
                    key={org.id}
                    onClick={() => { setSelectedOrgId(org.id); setSelectedProjectId(null); }}
                    className={`p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                      selectedOrgId === org.id 
                        ? 'bg-blue-500/20 border border-blue-500/50 text-white' 
                        : 'text-slate-300 hover-elevate'
                    }`}
                    data-testid={`org-item-${org.id}`}
                  >
                    <div className="font-medium">{org.name}</div>
                    {org.description && <div className="text-xs text-slate-500 mt-0.5">{org.description}</div>}
                  </div>
                ))}
                {orgs.length === 0 && !showNewOrg && (
                  <p className="text-xs text-slate-500 text-center py-2">Create an organization to get started</p>
                )}
              </CardContent>
            </Card>

            {/* Project Selector */}
            {selectedOrgId && (
              <Card className="bg-slate-900/80 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400 flex items-center justify-between flex-wrap gap-1">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Projects
                    </span>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setShowNewProject(!showNewProject)}
                      data-testid="button-new-project"
                    >
                      <Plus className="w-4 h-4 text-blue-400" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {showNewProject && (
                    <div className="space-y-2 mb-2">
                      <Input
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Project name..."
                        className="bg-slate-800 border-slate-600 text-sm"
                        data-testid="input-project-name"
                      />
                      <Textarea
                        value={newProjectDesc}
                        onChange={(e) => setNewProjectDesc(e.target.value)}
                        placeholder="Project description..."
                        className="bg-slate-800 border-slate-600 text-sm resize-none"
                        rows={2}
                        data-testid="input-project-desc"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => newProjectName && createProjectMutation.mutate({ 
                            orgId: selectedOrgId!, 
                            name: newProjectName, 
                            description: newProjectDesc || undefined,
                            leadAgentId: agentId || undefined,
                          })}
                          disabled={!newProjectName || createProjectMutation.isPending}
                          data-testid="button-create-project"
                        >
                          {createProjectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewProject(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {projectsList.map(project => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        selectedProjectId === project.id 
                          ? 'bg-blue-500/20 border border-blue-500/50 text-white' 
                          : 'text-slate-300 hover-elevate'
                      }`}
                      data-testid={`project-item-${project.id}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-medium">{project.name}</span>
                        <Badge className={`text-[10px] ${
                          project.status === 'active' ? 'bg-green-500/20 text-green-300' :
                          project.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>{project.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {projectsList.length === 0 && !showNewProject && (
                    <p className="text-xs text-slate-500 text-center py-2">No projects yet</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Column - Chat */}
          <div className="lg:col-span-5">
            <Card className="bg-slate-900/80 border-slate-700 h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {selectedProject ? selectedProject.name : 'Project Workspace'}
                  {selectedProject && (
                    <Badge className="bg-blue-500/20 text-blue-300 text-[10px] ml-auto">
                      {tasksList.length} tasks
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[400px] max-h-[500px]">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <CheckSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        {selectedProject ? (
                          <>
                            <p className="text-slate-400 text-sm">Chat with {agent.name} about</p>
                            <p className="text-white font-medium">{selectedProject.name}</p>
                            <p className="text-xs text-slate-500 mt-1">The agent has full context of your project and tasks</p>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-500">Select or create a project to get started</p>
                            <p className="text-xs text-slate-600 mt-1">Projects give your agents context about what they're working on</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'agent' && (
                            <div className="w-7 h-7 rounded-lg overflow-hidden mr-2 flex-shrink-0 mt-1">
                              <img src={avatar.src} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div 
                            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                              msg.role === 'user' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-800 text-slate-200'
                            }`}
                            data-testid={`chat-message-${idx}`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex justify-start">
                          <div className="w-7 h-7 rounded-lg overflow-hidden mr-2 flex-shrink-0 mt-1">
                            <img src={avatar.src} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="bg-slate-800 px-4 py-2.5 rounded-2xl">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={selectedProject ? `Message ${agent.name} about ${selectedProject.name}...` : 'Select a project first...'}
                    className="bg-slate-800 border-slate-600"
                    disabled={isSending}
                    data-testid="input-message"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    className="bg-blue-600"
                    disabled={isSending || !message.trim()}
                    data-testid="button-send"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tasks */}
          <div className="lg:col-span-4">
            <Card className="bg-slate-900/80 border-slate-700 h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-400 flex items-center justify-between flex-wrap gap-1">
                  <span className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4" /> Tasks
                  </span>
                  {selectedProjectId && (
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setShowNewTask(!showNewTask)}
                      data-testid="button-new-task"
                    >
                      <Plus className="w-4 h-4 text-blue-400" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-y-auto max-h-[600px]">
                {showNewTask && selectedProjectId && (
                  <div className="space-y-2 mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      className="bg-slate-800 border-slate-600 text-sm"
                      data-testid="input-task-title"
                    />
                    <Textarea
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Description (optional)..."
                      className="bg-slate-800 border-slate-600 text-sm resize-none"
                      rows={2}
                      data-testid="input-task-desc"
                    />
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-sm" data-testid="select-task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => newTaskTitle && createTaskMutation.mutate({ 
                          title: newTaskTitle, 
                          description: newTaskDesc || undefined,
                          priority: newTaskPriority,
                          assignedAgentId: agentId || undefined,
                        })}
                        disabled={!newTaskTitle || createTaskMutation.isPending}
                        data-testid="button-create-task"
                      >
                        {createTaskMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add Task'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewTask(false)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {!selectedProjectId ? (
                  <div className="text-center py-8">
                    <ListTodo className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Select a project to see its tasks</p>
                  </div>
                ) : tasksList.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No tasks yet. Add your first task!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {['in_progress', 'todo', 'review', 'done'].map(status => {
                      const filtered = tasksList.filter(t => t.status === status);
                      if (filtered.length === 0) return null;
                      const StatusIcon = STATUS_ICONS[status] || Circle;
                      return (
                        <div key={status}>
                          <div className={`text-xs font-medium mb-1.5 flex items-center gap-1.5 ${STATUS_COLORS[status]}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.replace('_', ' ').toUpperCase()} ({filtered.length})
                          </div>
                          {filtered.map(task => (
                            <div
                              key={task.id}
                              className="p-2.5 mb-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover-elevate cursor-pointer"
                              onClick={() => cycleTaskStatus(task)}
                              data-testid={`task-item-${task.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-white'}`}>
                                    {task.title}
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
                                  )}
                                </div>
                                <Badge className={`text-[10px] flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                                  {task.priority}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
