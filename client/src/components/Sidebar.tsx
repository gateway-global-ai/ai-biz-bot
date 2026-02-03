import { Server, Settings, Play, Activity, UserCircle, ShieldAlert, MessageSquare, Phone } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MENU_ITEMS = [
  { id: 'disc', label: 'DISC Profile', icon: UserCircle },
  { id: 'telephony', label: 'Telephony', icon: Phone },
  { id: 'twilio', label: 'Twilio Hub', icon: MessageSquare },
  { id: 'servers', label: 'Server Control', icon: Server },
  { id: 'global_config', label: 'Global Config', icon: Settings },
  { id: 'tests', label: 'Orchestrator', icon: Play },
  { id: 'results', label: 'Results & AI', icon: Activity },
  { id: 'security', label: 'Security Audit', icon: ShieldAlert },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-indigo-500 tracking-wider">NEXUS<span className="text-white">CMD</span></h1>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive 
                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    data-testid={`nav-${item.id}`}
                >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                </button>
            )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500" />
            <div>
                <p className="text-xs font-bold text-white">Admin User</p>
                <p className="text-[10px] text-slate-500">admin@nexus.test</p>
            </div>
        </div>
      </div>
    </div>
  );
}
