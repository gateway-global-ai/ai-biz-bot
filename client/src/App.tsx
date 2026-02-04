import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TelephonyPanel from "@/pages/TelephonyPanel";
import DiscVisualizer from "@/pages/DiscVisualizer";
import DeveloperPage from "@/pages/DeveloperPage";
import BusinessPage from "@/pages/BusinessPage";
import OnboardingFlow from "@/pages/OnboardingFlow";
import DiscAssessment from "@/pages/DiscAssessment";
import MockConversation from "@/pages/MockConversation";
import AgentManager from "@/pages/AgentManager";
import AgentDashboard from "@/pages/AgentDashboard";
import TheVibe from "@/pages/TheVibe";
import TheOffice from "@/pages/TheOffice";
import TheLab from "@/pages/TheLab";
import TheClassroom from "@/pages/TheClassroom";
import CustomerManager from "@/pages/CustomerManager";
import TwilioAccountManager from "@/pages/TwilioAccountManager";
import MvpLanding from "@/pages/MvpLanding";
import KimiAudioDemo from "@/pages/KimiAudioDemo";
import NotFound from "@/pages/not-found";
import { Server, Settings, Play, Activity, ShieldAlert, MessageSquare, Check, Clock, Phone, Smartphone } from 'lucide-react';

function ServerPanel() {
  const servers = [
    { id: '1', name: 'Alpha-Test-Node', ip: '10.0.1.12', region: 'us-east-1', status: 'online', cpuUsage: 45, memoryUsage: 62 },
    { id: '2', name: 'Beta-Staging', ip: '10.0.2.45', region: 'eu-west-2', status: 'busy', cpuUsage: 88, memoryUsage: 91 },
    { id: '3', name: 'Gamma-Legacy', ip: '10.0.3.99', region: 'us-west-1', status: 'offline', cpuUsage: 0, memoryUsage: 0 },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-indigo-400" />
            Server Control Panel
          </h2>
          <p className="text-slate-400">Real-time monitoring and infrastructure management.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium" data-testid="button-add-server">
          Add Server
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.map(server => (
          <div key={server.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-white font-bold">{server.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{server.ip} • {server.region}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                server.status === 'online' ? 'bg-green-500/20 text-green-400' :
                server.status === 'busy' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-slate-700 text-slate-400'
              }`}>
                {server.status}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>CPU Usage</span>
                  <span>{server.cpuUsage}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${server.cpuUsage}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Memory</span>
                  <span>{server.memoryUsage}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${server.memoryUsage}%` }} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">
                {server.status === 'offline' ? 'Boot' : 'Shutdown'}
              </button>
              <button className="flex-1 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">
                Reboot
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlobalConfig() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          Global Configuration
        </h2>
        <p className="text-slate-400">Manage environment variables and system settings.</p>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <p className="text-slate-400 text-center py-12">Configuration panel coming soon...</p>
      </div>
    </div>
  );
}

function TestOrchestrator() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Play className="w-6 h-6 text-green-400" />
          Test Orchestrator
        </h2>
        <p className="text-slate-400">Run and manage test suites.</p>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <p className="text-slate-400 text-center py-12">Test orchestrator coming soon...</p>
      </div>
    </div>
  );
}

function ResultsAnalyzer() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-400" />
          Results & AI Analysis
        </h2>
        <p className="text-slate-400">Analyze test results with AI assistance.</p>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <p className="text-slate-400 text-center py-12">Results analyzer coming soon...</p>
      </div>
    </div>
  );
}

function SecurityDashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-400" />
          Security Audit
        </h2>
        <p className="text-slate-400">Monitor security alerts and compliance.</p>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <p className="text-slate-400 text-center py-12">Security dashboard coming soon...</p>
      </div>
    </div>
  );
}

function TwilioHub() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-teal-400" />
          Twilio Integration Hub
        </h2>
        <p className="text-slate-400">Communication management for SMS alerts and Voice notifications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5" /> Recent SMS Logs
            </h3>
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div className="flex flex-col">
                            <span className="text-sm text-white font-mono">+1 (555) 012-34{i}{i}</span>
                            <span className="text-xs text-slate-500">Alert: Server Down (SRV-0{i})</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <Check className="w-3 h-3" /> Sent
                        </span>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5" /> Voice Call Gateway
            </h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-sm text-white font-mono">+1 (555) 987-6543</span>
                        <span className="text-xs text-slate-500">Duration: 45s • Critical Alert</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <Check className="w-3 h-3" /> Completed
                    </span>
                </div>
                 <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-sm text-white font-mono">+1 (555) 111-2222</span>
                        <span className="text-xs text-slate-500">Duration: 0s • Warn Alert</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <Clock className="w-3 h-3" /> Queued
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={OnboardingFlow} />
      <Route path="/agents" component={AgentDashboard} />
      <Route path="/dashboard" component={AgentDashboard} />
      <Route path="/agent/:agentId/vibe" component={TheVibe} />
      <Route path="/agent/:agentId/office" component={TheOffice} />
      <Route path="/agent/:agentId/lab" component={TheLab} />
      <Route path="/agent/:agentId/classroom" component={TheClassroom} />
      <Route path="/agent-manager" component={AgentManager} />
      <Route path="/customers" component={CustomerManager} />
      <Route path="/telephony" component={TelephonyPanel} />
      <Route path="/twilio-account" component={TwilioAccountManager} />
      <Route path="/twilio" component={TwilioHub} />
      <Route path="/servers" component={ServerPanel} />
      <Route path="/config" component={GlobalConfig} />
      <Route path="/tests" component={TestOrchestrator} />
      <Route path="/results" component={ResultsAnalyzer} />
      <Route path="/security" component={SecurityDashboard} />
      <Route path="/disc" component={DiscVisualizer} />
      <Route path="/developer" component={DeveloperPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/assessment" component={DiscAssessment} />
      <Route path="/conversation" component={MockConversation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithSidebar() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-slate-950 text-slate-200">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center gap-2 p-2 border-b border-slate-800 bg-slate-900">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <AppRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          {/* Full-screen routes without sidebar */}
          <Route path="/" component={MvpLanding} />
          <Route path="/onboarding" component={OnboardingFlow} />
          <Route path="/kimi-audio" component={KimiAudioDemo} />
          {/* All other routes use sidebar layout */}
          <Route component={AppWithSidebar} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
