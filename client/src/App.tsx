import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CustomerAuthProvider } from "@/lib/customerAuth";
import TelephonyPanel from "@/pages/TelephonyPanel";
import GatewayAdmin from "@/pages/GatewayAdmin";
import AgentTelephony from "@/pages/AgentTelephony";
import AgentChat from "@/pages/AgentChat";
import DiscVisualizer from "@/pages/DiscVisualizer";
import DeveloperPage from "@/pages/DeveloperPage";
import BusinessPage from "@/pages/BusinessPage";
import GoogleApiAnalyst from "@/pages/GoogleApiAnalyst";
import OnboardingFlow from "@/pages/OnboardingFlow";
import DiscAssessment from "@/pages/DiscAssessment";
import MockConversation from "@/pages/MockConversation";
import AgentManager from "@/pages/AgentManager";
import AgentDashboard from "@/pages/AgentDashboard";
import TheVibe from "@/pages/TheVibe";
import TheOffice from "@/pages/TheOffice";
import TheLab from "@/pages/TheLab";
import TheClassroom from "@/pages/TheClassroom";
import ImmersiveClassroom from "@/pages/classroom/ImmersiveClassroom";
import CustomerManager from "@/pages/CustomerManager";
import TwilioAccountManager from "@/pages/TwilioAccountManager";
import MvpLanding from "@/pages/MvpLanding";
import LandingV2 from "@/pages/LandingV2";
import KimiAudioDemo from "@/pages/KimiAudioDemo";
import TwilioHealthCheck from "@/pages/TwilioHealthCheck";
import TelephonyManager from "@/pages/TelephonyManager";
import BillingPage from "@/pages/BillingPage";
import GoogleDrivePage from "@/pages/GoogleDrivePage";
import GoogleCalendarPage from "@/pages/GoogleCalendarPage";
import GoogleTasksPage from "@/pages/GoogleTasksPage";
import AiBizBotAdmin from "@/pages/AiBizBotAdmin";
import Login from "@/pages/Login";
import SdkShowcase from "@/pages/SdkShowcase";
import GooglePlacesSdk from "@/pages/GooglePlacesSdk";
import MyAccount from "@/pages/MyAccount";
import CustomerSiteManager from "@/pages/CustomerSiteManager";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { Server, Settings, Play, Activity, ShieldAlert, MessageSquare, Check, Clock, Phone, Smartphone } from 'lucide-react';

function ServerPanel() {
  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-indigo-400" />
            Server Control Panel
          </h2>
          <p className="text-slate-400">Connect and manage external servers and hosting providers.</p>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="text-center py-8">
          <Server className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Servers Connected</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Connect your external servers (Hostinger, DigitalOcean, AWS, etc.) to monitor and manage them from Gateway Global AI.
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Server integration requires API credentials from your hosting provider.
          </p>
          <div className="flex justify-center gap-3">
            <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Supported Providers</p>
              <p className="text-sm text-slate-300">Hostinger • DigitalOcean • AWS • VPS</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Coming Soon</h4>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• One-click server provisioning</li>
          <li>• Real-time monitoring and alerts</li>
          <li>• Automated scaling and load balancing</li>
          <li>• Integration with Hostinger API for DNS and hosting management</li>
        </ul>
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
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <div className="border-b border-slate-700 pb-4">
          <h3 className="text-lg font-semibold text-white mb-2">Platform Settings</h3>
          <p className="text-sm text-slate-400 mb-4">
            These settings control global platform behavior and can be configured via environment secrets.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">AI Provider</p>
            <p className="text-white font-medium">Moonshot AI (Kimi K2.5)</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">Telephony Provider</p>
            <p className="text-white font-medium">Twilio</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">Voice AI</p>
            <p className="text-white font-medium">Kimi-Audio (Replicate)</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">Task Scheduler</p>
            <p className="text-white font-medium">Active (5 min interval)</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 text-center pt-4">
          To modify API keys and secrets, use the Secrets tab in your Replit workspace.
        </p>
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
      <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
      <Route path="/onboard" component={OnboardingFlow} />
      <Route path="/agents" component={AgentDashboard} />
      <Route path="/dashboard" component={AgentDashboard} />
      <Route path="/agent/:agentId/vibe" component={TheVibe} />
      <Route path="/agent/:agentId/office" component={TheOffice} />
      <Route path="/agent/:agentId/lab" component={TheLab} />
      <Route path="/agent/:agentId/classroom" component={TheClassroom} />
      <Route path="/nexus-classroom" component={ImmersiveClassroom} />
      <Route path="/agent/:agentId/telephony" component={AgentTelephony} />
      <Route path="/agent-manager" component={AgentManager} />
      <Route path="/customers" component={CustomerManager} />
      <Route path="/gateway-admin" component={GatewayAdmin} />
      <Route path="/telephony" component={TelephonyManager} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/google-drive" component={GoogleDrivePage} />
      <Route path="/google-calendar" component={GoogleCalendarPage} />
      <Route path="/google-tasks" component={GoogleTasksPage} />
      <Route path="/telephony-legacy" component={TelephonyPanel} />
      <Route path="/twilio-account" component={TwilioAccountManager} />
      <Route path="/twilio-health" component={TwilioHealthCheck} />
      <Route path="/twilio" component={TwilioHub} />
      <Route path="/servers" component={ServerPanel} />
      <Route path="/config" component={GlobalConfig} />
      <Route path="/tests" component={TestOrchestrator} />
      <Route path="/results" component={ResultsAnalyzer} />
      <Route path="/security" component={SecurityDashboard} />
      <Route path="/disc" component={DiscVisualizer} />
      <Route path="/developer" component={DeveloperPage} />
      {/* BusinessPage moved to public routes */}
      <Route path="/aibizbot" component={AiBizBotAdmin} />
      <Route path="/google-analyst" component={GoogleApiAnalyst} />
      <Route path="/assessment" component={DiscAssessment} />
      <Route path="/conversation" component={MockConversation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AppWithSidebar() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <Switch>
              {/* Public routes */}
              <Route path="/" component={BusinessPage} />
              <Route path="/business" component={BusinessPage} />
              <Route path="/demo" component={BusinessPage} />
              <Route path="/login" component={Login} />
              <Route path="/v2" component={LandingV2} />
              <Route path="/kimi-audio" component={KimiAudioDemo} />
              <Route path="/sdk" component={SdkShowcase} />
              <Route path="/sdk/google-places" component={GooglePlacesSdk} />
              <Route path="/chat/:agentId" component={AgentChat} />
              {/* Customer account routes */}
              <Route path="/my-account" component={MyAccount} />
              <Route path="/my-account/site/:siteId" component={CustomerSiteManager} />
              {/* Protected admin routes with sidebar */}
              <Route component={AppWithSidebar} />
            </Switch>
          </CustomerAuthProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
