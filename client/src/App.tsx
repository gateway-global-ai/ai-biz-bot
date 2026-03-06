import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CustomerAuthProvider } from "@/lib/customerAuth";
import TelephonyPanel from "@/pages/developer/TelephonyPanel";
import GatewayAdmin from "@/pages/admin/GatewayAdmin";
import AgentTelephony from "@/pages/developer/AgentTelephony";
import AgentChat from "@/pages/agents/AgentChat";
import DiscVisualizer from "@/pages/showcase/DiscVisualizer";
import DeveloperPage from "@/pages/developer/DeveloperPage";
import BusinessPage from "@/pages/customer/BusinessPage";
import GoogleApiAnalyst from "@/pages/integrations/GoogleApiAnalyst";
import OnboardingFlow from "@/pages/agents/OnboardingFlow";
import DiscAssessment from "@/pages/showcase/DiscAssessment";
import MockConversation from "@/pages/showcase/MockConversation";
import AgentManager from "@/pages/agents/AgentManager";
import AgentDashboard from "@/pages/agents/AgentDashboard";
import TheVibe from "@/pages/agents/TheVibe";
import TheOffice from "@/pages/agents/TheOffice";
import TheLab from "@/pages/agents/TheLab";
import TheClassroom from "@/pages/agents/TheClassroom";
import ImmersiveClassroom from "@/pages/agents/classroom/ImmersiveClassroom";
import CustomerManager from "@/pages/biz-dashboard/CustomerManager";
import TwilioAccountManager from "@/pages/developer/TwilioAccountManager";
import MvpLanding from "@/pages/showcase/MvpLanding";
import LandingV2 from "@/pages/showcase/LandingV2";
// Gemini Live handles all voice demos
import TwilioHealthCheck from "@/pages/developer/TwilioHealthCheck";
import SystemHealthCheck from "@/pages/developer/SystemHealthCheck";
import TelephonyManager from "@/pages/developer/TelephonyManager";
import BillingPage from "@/pages/account/BillingPage";
import OnboardingGateway from "@/pages/account/OnboardingGateway";
import NovaVerifyPage from "@/pages/account/NovaVerifyPage";
import GoogleDrivePage from "@/pages/integrations/GoogleDrivePage";
import GoogleCalendarPage from "@/pages/biz-dashboard/GoogleCalendarPage";
import GoogleTasksPage from "@/pages/biz-dashboard/GoogleTasksPage";
import AiBizBotAdmin from "@/pages/owner/AiBizBotAdmin";
import Login from "@/pages/account/Login";
import SdkShowcase from "@/pages/showcase/SdkShowcase";
import GooglePlacesSdk from "@/pages/integrations/GooglePlacesSdk";
import MyAccount from "@/pages/account/MyAccount";
import CustomerSiteManager from "@/pages/owner/CustomerSiteManager";
import PublicBusinessPage from "@/pages/public/PublicBusinessPage";
import VoiceLeadMachine from "@/pages/biz-dashboard/VoiceLeadMachine";
import SitesAndLeads from "@/pages/owner/SitesAndLeads";
import MixingBoard from "@/pages/reseller/MixingBoard";
import ResellerApplyPage from "@/pages/ResellerApplyPage";
import CommandChat from "@/pages/agents/CommandChat";
import InquiryManagement from "@/pages/owner/InquiryManagement";
import CallTracking from "@/pages/biz-dashboard/CallTracking";
import TransparencyDashboard from "@/pages/biz-dashboard/TransparencyDashboard";
import ContactForm from "@/pages/customer/ContactForm";
import CustomerChatInterface from "@/pages/customer/CustomerChatInterface";
import OwnerChatInterface from "@/pages/owner/OwnerChatInterface";
import DeveloperChatInterface from "@/pages/developer/DeveloperChatInterface";
import ChatEmbedShowcase from "@/pages/showcase/ChatEmbedShowcase";
import AgentManagementPage from "@/pages/agents/AgentManagementPage";
import AgentTestingDashboard from "@/pages/agents/AgentTestingDashboard";
import ChatWithAgentPreview from "@/pages/customer/ChatWithAgentPreview";
import WidgetShowcasePage from "@/pages/showcase/WidgetShowcasePage";
import TestB2b from "@/pages/showcase/TestB2b";
import OlympicB2b from "@/pages/showcase/OlympicB2b";
import AgentPortal from "@/pages/showcase/AgentPortal";
import InvestorDemo from "@/pages/showcase/InvestorDemo";
import PitchDeckViewer from "@/pages/showcase/PitchDeckViewer";
import BrandAdminPage from "@/pages/brand-admin";
import NotFound from "@/pages/admin/not-found";
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
            <p className="text-white font-medium">Google Gemini</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">Telephony Provider</p>
            <p className="text-white font-medium">Twilio</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">Voice AI</p>
            <p className="text-white font-medium">Gemini Native Audio</p>
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
      <Route path="/brand-admin" component={BrandAdminPage} />
      <Route path="/agent-manager" component={AgentManager} />
      <Route path="/customers" component={CustomerManager} />
      <Route path="/gateway-admin" component={GatewayAdmin} />
      <Route path="/telephony" component={TelephonyManager} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/account/nova-verify" component={NovaVerifyPage} />
      <Route path="/compliance-gateway" component={OnboardingGateway} />
      <Route path="/google-drive" component={GoogleDrivePage} />
      <Route path="/google-calendar" component={GoogleCalendarPage} />
      <Route path="/google-tasks" component={GoogleTasksPage} />
      <Route path="/telephony-legacy" component={TelephonyPanel} />
      <Route path="/twilio-account" component={TwilioAccountManager} />
      <Route path="/twilio-health" component={TwilioHealthCheck} />
      <Route path="/system-health" component={SystemHealthCheck} />
      <Route path="/twilio" component={TwilioHub} />
      <Route path="/servers" component={ServerPanel} />
      <Route path="/config" component={GlobalConfig} />
      <Route path="/tests" component={TestOrchestrator} />
      <Route path="/results" component={ResultsAnalyzer} />
      <Route path="/security" component={SecurityDashboard} />
      <Route path="/disc" component={DiscVisualizer} />
      <Route path="/developer" component={DeveloperPage} />
      {/* 
        ⭐ STANDARDIZED CHAT INTERFACES - PROTECTED ROUTES ⭐
        
        These routes use the StandardizedChatInterface component, which is the ONLY
        approved base chat interface for the platform. See /CHAT_ARCHITECTURE.md.
        
        - /chat/owner: Business owner portal (requires auth for actual use)
        - /chat/developer: Developer interface (requires auth for actual use)
        - Public demo routes: /interface/owner and /interface/developer
        
        DO NOT create alternative chat implementations. Use StandardizedChatInterface
        or FloatingChatWidget for all new chat features.
      */}
      <Route path="/chat/owner" component={OwnerChatInterface} />
      <Route path="/chat/developer" component={DeveloperChatInterface} />
      {/* BusinessPage moved to public routes */}
      <Route path="/lead-machine" component={VoiceLeadMachine} />
      <Route path="/sites-leads" component={SitesAndLeads} />
      <Route path="/mixing-board" component={MixingBoard} />
      <Route path="/inquiries" component={InquiryManagement} />
      <Route path="/call-tracking" component={CallTracking} />
      <Route path="/transparency" component={TransparencyDashboard} />
      <Route path="/command-chat" component={CommandChat} /> {/* Admin tool - specialized UI */}
      <Route path="/aibizbot" component={AiBizBotAdmin} />
      <Route path="/google-analyst" component={GoogleApiAnalyst} />
      <Route path="/assessment" component={DiscAssessment} />
      <Route path="/conversation" component={MockConversation} />
      <Route path="/agent-management" component={AgentManagementPage} />
      <Route path="/agent-testing" component={AgentTestingDashboard} />
      <Route path="/agent-preview" component={ChatWithAgentPreview} />
      <Route path="/widget-showcase" component={WidgetShowcasePage} />
      <Route path="/test-b2b" component={AgentPortal} />
      <Route path="/test-b2b-olympic" component={OlympicB2b} />
      <Route path="/test-b2b-wireframe" component={TestB2b} />
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
              <Route path="/contact" component={ContactForm} />
              <Route path="/v2" component={LandingV2} />
              <Route path="/investor-demo" component={InvestorDemo} />
              <Route path="/pitch-decks/:slug" component={PitchDeckViewer} />
              {/* voice-demo route — handled by Gemini Live on homepage */}
              <Route path="/sdk" component={SdkShowcase} />
              <Route path="/sdk/google-places" component={GooglePlacesSdk} />
              <Route path="/reseller/apply" component={ResellerApplyPage} />
              <Route path="/chat/customer" component={CustomerChatInterface} />
              <Route path="/chat-showcase" component={ChatEmbedShowcase} />
              {/* 
                ⭐ STANDARDIZED CHAT INTERFACES - PUBLIC DEMO ROUTES ⭐
                
                These use StandardizedChatInterface, the approved base chat component.
                See /CHAT_ARCHITECTURE.md for architectural standards.
              */}
              <Route path="/interface/customer" component={CustomerChatInterface} />
              <Route path="/interface/owner" component={OwnerChatInterface} />
              <Route path="/interface/developer" component={DeveloperChatInterface} />
              <Route path="/chat/owner" component={OwnerChatInterface} />
              <Route path="/chat/:agentId" component={AgentChat} /> {/* Agent-specific chat - must be after /chat/owner */}
              {/* B2B Agent Portal – public for demo (GRN Connect) */}
              <Route path="/test-b2b" component={AgentPortal} />
              <Route path="/test-b2b-olympic" component={OlympicB2b} />
              <Route path="/test-b2b-wireframe" component={TestB2b} />
              {/* Public business pages — shareable, no auth required */}
              <Route path="/biz/:slug" component={PublicBusinessPage} />
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
