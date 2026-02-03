import { useLocation, Link } from 'wouter';
import { Server, Settings, Play, Activity, UserCircle, ShieldAlert, MessageSquare, Phone, Terminal, Building2 } from 'lucide-react';
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

const MENU_ITEMS = [
  { id: 'disc', label: 'DISC Profile', path: '/', icon: UserCircle },
  { id: 'telephony', label: 'Telephony', path: '/telephony', icon: Phone },
  { id: 'twilio', label: 'Twilio Hub', path: '/twilio', icon: MessageSquare },
  { id: 'servers', label: 'Server Control', path: '/servers', icon: Server },
  { id: 'global_config', label: 'Global Config', path: '/config', icon: Settings },
  { id: 'tests', label: 'Orchestrator', path: '/tests', icon: Play },
  { id: 'results', label: 'Results & AI', path: '/results', icon: Activity },
  { id: 'security', label: 'Security Audit', path: '/security', icon: ShieldAlert },
];

const ACCESS_ITEMS = [
  { id: 'developer', label: 'Developer Access', path: '/developer', icon: Terminal },
  { id: 'business', label: 'Business Access', path: '/business', icon: Building2 },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-slate-800 bg-slate-900">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-indigo-500 tracking-wider">NEXUS<span className="text-white">CMD</span></h1>
      </div>
      <SidebarContent className="bg-slate-900">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 text-xs font-bold uppercase">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
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
