import { useLocation, Link } from 'wouter';
import { Server, Settings, Play, Activity, ShieldAlert, MessageSquare, Phone, Terminal, Building2, Sparkles, ClipboardCheck, AudioLines, Bot, Users, LayoutDashboard, Globe, Stethoscope } from 'lucide-react';
import gatewayLogoSm from '@assets/GatewayGlobalLogo_sm_1770154272626.png';
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
  { id: 'assessment', label: 'DISC Assessment', path: '/assessment', icon: ClipboardCheck },
  { id: 'conversation', label: 'Character Tool', path: '/conversation', icon: AudioLines },
];

const OPERATIONS_ITEMS = [
  { id: 'gateway-admin', label: 'Gateway Admin', path: '/gateway-admin', icon: Globe },
  { id: 'customers', label: 'Customer Manager', path: '/customers', icon: Users },
  { id: 'twilio-health', label: 'SMS Health Check', path: '/twilio-health', icon: Stethoscope },
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
