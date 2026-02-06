import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Server, Settings, Play, Activity, ShieldAlert, MessageSquare, Phone,
  Terminal, Building2, Sparkles, ClipboardCheck, AudioLines, Bot, Users,
  LayoutDashboard, Globe, Stethoscope, CreditCard, HardDrive, Calendar,
  ListTodo, Zap, Eye, Coffee, Briefcase, FlaskConical, GraduationCap,
  ChevronDown, ChevronRight, MessageCircle,
} from 'lucide-react';
import gatewayLogoSm from '@assets/GatewayGlobalLogo_sm_1770154272626.png';
import type { Agent } from '@shared/schema';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';

const AGENT_ITEMS = [
  { id: 'dashboard', label: 'Agent Dashboard', path: '/agents', icon: LayoutDashboard },
  { id: 'command-chat', label: 'Command Chat', path: '/command-chat', icon: MessageCircle },
  { id: 'agent-manager', label: 'Agent Manager', path: '/agent-manager', icon: Bot },
  { id: 'agent-testing', label: 'Agent Testing', path: '/agent-testing', icon: ClipboardCheck },
  { id: 'assessment', label: 'DISC Assessment', path: '/assessment', icon: ClipboardCheck },
  { id: 'conversation', label: 'Character Tool', path: '/conversation', icon: AudioLines },
];

const AGENT_TOOLS = [
  { id: 'vibe', label: 'The Vibe', icon: Coffee, color: 'text-purple-400' },
  { id: 'office', label: 'The Office', icon: Briefcase, color: 'text-blue-400' },
  { id: 'lab', label: 'The Lab', icon: FlaskConical, color: 'text-emerald-400' },
  { id: 'classroom', label: 'The Classroom', icon: GraduationCap, color: 'text-amber-400' },
  { id: 'telephony', label: 'Telephony', icon: Phone, color: 'text-cyan-400' },
];

const OPERATIONS_ITEMS = [
  { id: 'aibizbot', label: 'AI Biz Bot', path: '/aibizbot', icon: Bot },
  { id: 'gateway-admin', label: 'Gateway Admin', path: '/gateway-admin', icon: Globe },
  { id: 'telephony-mgr', label: 'Telephony', path: '/telephony', icon: Phone },
  { id: 'customers', label: 'Customer Manager', path: '/customers', icon: Users },
  { id: 'billing', label: 'Billing', path: '/billing', icon: CreditCard },
  { id: 'twilio-health', label: 'SMS Health Check', path: '/twilio-health', icon: Stethoscope },
  { id: 'google-drive', label: 'Google Drive', path: '/google-drive', icon: HardDrive },
  { id: 'google-calendar', label: 'Google Calendar', path: '/google-calendar', icon: Calendar },
  { id: 'google-tasks', label: 'Google Tasks', path: '/google-tasks', icon: ListTodo },
  { id: 'lead-machine', label: 'Lead Machine', path: '/lead-machine', icon: Zap },
  { id: 'sites-leads', label: 'Sites & Leads', path: '/sites-leads', icon: Eye },
];

const SYSTEM_ITEMS = [
  { id: 'servers', label: 'Server Control', path: '/servers', icon: Server },
  { id: 'global_config', label: 'Global Config', path: '/config', icon: Settings },
  { id: 'tests', label: 'Orchestrator', path: '/tests', icon: Play },
  { id: 'security', label: 'Security Audit', path: '/security', icon: ShieldAlert },
];

const ACCESS_ITEMS = [
  { id: 'onboard', label: 'Create Your Agent', path: '/onboard', icon: Sparkles },
  { id: 'developer', label: 'Developer Access', path: '/developer', icon: Terminal },
  { id: 'business', label: 'Business Access', path: '/business', icon: Building2 },
];

function AgentToolsSubmenu({ location }: { location: string }) {
  const [expanded, setExpanded] = useState(
    location.includes('/agent/') && AGENT_TOOLS.some(t => location.includes(`/${t.id}`))
  );

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const activeAgents = agents.filter(a => a.status === 'active');

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase text-slate-500 hover:text-slate-300 transition-colors"
        data-testid="button-expand-agent-tools"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Agent Tools
      </button>
      {expanded && (
        <div className="space-y-0.5 pl-2">
          {activeAgents.length === 0 ? (
            <p className="text-[10px] text-slate-600 px-3 py-1">No active agents. Create one first.</p>
          ) : (
            activeAgents.map((agent) => (
              <div key={agent.id} className="mb-2">
                <p className="text-[10px] font-semibold text-slate-400 px-3 py-1 truncate" data-testid={`text-agent-name-sidebar-${agent.id}`}>
                  {agent.name}
                </p>
                {AGENT_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const toolPath = `/agent/${agent.id}/${tool.id}`;
                  const isActive = location === toolPath;
                  return (
                    <SidebarMenuItem key={`${agent.id}-${tool.id}`}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={toolPath} data-testid={`nav-agent-${agent.id}-${tool.id}`}>
                          <Icon className={`w-4 h-4 ${isActive ? tool.color : 'text-slate-600'}`} />
                          <span className="text-xs">{tool.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-slate-800 bg-slate-900">
      <div className="p-4 pb-6 border-b border-slate-800 flex justify-center">
        <img src={gatewayLogoSm} alt="Gateway Global AI" className="h-24 w-auto" />
      </div>
      <SidebarContent className="bg-slate-900">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-xs font-bold uppercase">Agent Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {AGENT_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || (item.path === '/agents' && location === '/');
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.path} data-testid={`nav-${item.id}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            <AgentToolsSubmenu location={location} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-xs font-bold uppercase">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {OPERATIONS_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.path} data-testid={`nav-${item.id}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-xs font-bold uppercase">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SYSTEM_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.path} data-testid={`nav-${item.id}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-xs font-bold uppercase">Access Portals</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ACCESS_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.path} data-testid={`nav-${item.id}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500" />
          <div>
            <p className="text-xs font-bold text-white">Admin User</p>
            <p className="text-[10px] text-slate-500">admin@nexus.test</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
