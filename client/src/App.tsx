import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CustomerAuthProvider } from "@/lib/customerAuth";
import { Loader2 } from "lucide-react";
import { Server, Settings, Play, Activity, ShieldAlert, MessageSquare, Check, Clock, Phone, Smartphone } from 'lucide-react';

// ── Eager: first-paint critical paths only ────────────────────────────────────
import PlatformHomePage from "@/pages/public/PlatformHomePage";
import DemoPublicRedirect from "@/pages/public/DemoPublicRedirect";
import NotFound from "@/pages/admin/not-found";

// ── Lazy: everything else — loaded only when the route is visited ─────────────
const TelephonyPanel        = lazy(() => import("@/pages/developer/TelephonyPanel"));
const GatewayAdmin          = lazy(() => import("@/pages/admin/GatewayAdmin"));
const AgentTelephony        = lazy(() => import("@/pages/developer/AgentTelephony"));
const AgentChat             = lazy(() => import("@/pages/agents/AgentChat"));
const DiscVisualizer        = lazy(() => import("@/pages/showcase/DiscVisualizer"));
const DeveloperPage         = lazy(() => import("@/pages/developer/DeveloperPage"));
const UiKitPage             = lazy(() => import("@/pages/developer/ui-kit"));
const ShadcnIoCatalogPage   = lazy(() => import("@/pages/developer/shadcn-io-catalog"));
const BusinessPage          = lazy(() => import("@/pages/customer/BusinessPage"));
const GoogleApiAnalyst      = lazy(() => import("@/pages/integrations/GoogleApiAnalyst"));
const OnboardingFlow        = lazy(() => import("@/pages/agents/OnboardingFlow"));
const DiscAssessment        = lazy(() => import("@/pages/showcase/DiscAssessment"));
const MockConversation      = lazy(() => import("@/pages/showcase/MockConversation"));
const AgentManager          = lazy(() => import("@/pages/agents/AgentManager"));
const AgentBuilderPage      = lazy(() => import("@/pages/agents/AgentBuilderPage"));
const AgentDashboard        = lazy(() => import("@/pages/agents/AgentDashboard"));
const AgentsLandingPage     = lazy(() => import("@/pages/public/AgentsLandingPage"));
const CustomerManager       = lazy(() => import("@/pages/biz-dashboard/CustomerManager"));
const TwilioAccountManager  = lazy(() => import("@/pages/developer/TwilioAccountManager"));
const MvpLanding            = lazy(() => import("@/pages/showcase/MvpLanding"));
const LandingV2             = lazy(() => import("@/pages/showcase/LandingV2"));
const TwilioHealthCheck     = lazy(() => import("@/pages/developer/TwilioHealthCheck"));
const SystemHealthCheck     = lazy(() => import("@/pages/developer/SystemHealthCheck"));
const TelephonyManager      = lazy(() => import("@/pages/developer/TelephonyManager"));
const BillingPage           = lazy(() => import("@/pages/account/BillingPage"));
const OnboardingGateway     = lazy(() => import("@/pages/account/OnboardingGateway"));
const NovaVerifyPage        = lazy(() => import("@/pages/account/NovaVerifyPage"));
const GoogleDrivePage       = lazy(() => import("@/pages/integrations/GoogleDrivePage"));
const GoogleCalendarPage    = lazy(() => import("@/pages/biz-dashboard/GoogleCalendarPage"));
const GoogleTasksPage       = lazy(() => import("@/pages/biz-dashboard/GoogleTasksPage"));
const AiBizBotAdmin         = lazy(() => import("@/pages/owner/AiBizBotAdmin"));
const Login                 = lazy(() => import("@/pages/account/Login"));
const SdkShowcase           = lazy(() => import("@/pages/showcase/SdkShowcase"));
const UiPrimitivesComparisonPage = lazy(() => import("@/pages/showcase/UiPrimitivesComparisonPage"));
const GooglePlacesSdk       = lazy(() => import("@/pages/integrations/GooglePlacesSdk"));
const MyAccount             = lazy(() => import("@/pages/account/MyAccount"));
const CustomerSiteManager   = lazy(() => import("@/pages/owner/CustomerSiteManager"));
const PublicBusinessPage    = lazy(() => import("@/pages/public/PublicBusinessPage"));
const AgentPage             = lazy(() => import("@/pages/agents/AgentPage"));
const AiOsAgentPage         = lazy(() => import("@/pages/public/AiOsAgentPage"));
const KioskPage             = lazy(() => import("@/pages/public/KioskPage"));
const SovereignNetworkPage  = lazy(() => import("@/pages/public/SovereignNetworkPage"));
const PhonePage             = lazy(() => import("@/pages/public/PhonePage"));
const ClearVoiceLogoCenteredPage = lazy(() => import("@/pages/public/ClearVoiceLogoCenteredPage"));
const PlatformBuyPage       = lazy(() => import("@/pages/public/PlatformBuyPage"));
const PlatformInfoPage      = lazy(() => import("@/pages/public/PlatformInfoPage"));
const IndustryFunnelPage    = lazy(() => import("@/pages/public/IndustryFunnelPage"));
const SitesAndLeads         = lazy(() => import("@/pages/owner/SitesAndLeads"));
const MixingBoard           = lazy(() => import("@/pages/reseller/MixingBoard"));
const ResellerDashboard     = lazy(() => import("@/pages/reseller/ResellerDashboard"));
const ResellerApplyPage     = lazy(() => import("@/pages/ResellerApplyPage"));
const SmsConsent            = lazy(() => import("@/pages/legal/SmsConsent"));
const CommandChat           = lazy(() => import("@/pages/agents/CommandChat"));
const InquiryManagement     = lazy(() => import("@/pages/owner/InquiryManagement"));
const CallTracking          = lazy(() => import("@/pages/biz-dashboard/CallTracking"));
const TransparencyDashboard = lazy(() => import("@/pages/biz-dashboard/TransparencyDashboard"));
const ContactForm           = lazy(() => import("@/pages/customer/ContactForm"));
const CustomerChatInterface = lazy(() => import("@/pages/customer/CustomerChatInterface"));
const OwnerChatInterface    = lazy(() => import("@/pages/owner/OwnerChatInterface"));
const DeveloperChatInterface = lazy(() => import("@/pages/developer/DeveloperChatInterface"));
const ChatEmbedShowcase     = lazy(() => import("@/pages/showcase/ChatEmbedShowcase"));
const AgentManagementPage   = lazy(() => import("@/pages/agents/AgentManagementPage"));
const AgentTestingDashboard = lazy(() => import("@/pages/agents/AgentTestingDashboard"));
const ChatWithAgentPreview  = lazy(() => import("@/pages/customer/ChatWithAgentPreview"));
const WidgetShowcasePage    = lazy(() => import("@/pages/showcase/WidgetShowcasePage"));
const TestB2b               = lazy(() => import("@/pages/showcase/TestB2b"));
const OlympicB2b            = lazy(() => import("@/pages/showcase/OlympicB2b"));
const AgentPortal           = lazy(() => import("@/pages/showcase/AgentPortal"));
const InvestorDemo          = lazy(() => import("@/pages/showcase/InvestorDemo"));
const PitchDeckViewer       = lazy(() => import("@/pages/showcase/PitchDeckViewer"));
const StorefrontsIndex      = lazy(() => import("@/pages/storefronts/StorefrontsIndex"));
const StorefrontCategoryPage = lazy(() => import("@/pages/storefronts/StorefrontCategoryPage"));
const BrandAdminPage        = lazy(() => import("@/pages/brand-admin"));
const AdminShell            = lazy(() => import("@/pages/admin/AdminShell").then(m => ({ default: m.AdminShell })));
const MissionControlApp = lazy(() => import("./mission-control/MissionControlApp"));
/** Browser adapter for logical route `operator.integration.connect` / view `integration_connect_surface` — not a routing authority; see GET /api/integration/connect/governance-context. */
const CloudbedsConnectPage = lazy(() => import("@/pages/connect/CloudbedsConnectPage"));

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
      
      <div className="bg-slate-800 rounded-sui border border-slate-700 p-6">
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
            <div className="bg-slate-900 px-4 py-2 rounded-sui border border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Supported Providers</p>
              <p className="text-sm text-slate-300">Hostinger • DigitalOcean • AWS • VPS</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-slate-800/50 rounded-sui border border-slate-700 p-4">
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
      <div className="bg-slate-800 rounded-sui border border-slate-700 p-6 space-y-4">
        <div className="border-b border-slate-700 pb-4">
          <h3 className="text-lg font-semibold text-white mb-2">Platform Settings</h3>
          <p className="text-sm text-slate-400 mb-4">
            These settings control global platform behavior and can be configured via environment secrets.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-sui border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">AI Provider</p>
            <p className="text-white font-medium">Google Gemini</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-sui border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">Telephony Provider</p>
            <p className="text-white font-medium">Twilio</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-sui border border-slate-700">
            <p className="text-xs text-slate-500 uppercase mb-1">Voice AI</p>
            <p className="text-white font-medium">Gemini Native Audio</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-sui border border-slate-700">
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
      <div className="bg-slate-800 rounded-sui border border-slate-700 p-6">
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
      <div className="bg-slate-800 rounded-sui border border-slate-700 p-6">
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
      <div className="bg-slate-800 rounded-sui border border-slate-700 p-6">
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
        <div className="bg-slate-800 rounded-sui border border-slate-700 p-5">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5" /> Recent SMS Logs
            </h3>
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-sui border border-slate-800">
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

        <div className="bg-slate-800 rounded-sui border border-slate-700 p-5">
            <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5" /> Voice Call Gateway
            </h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-sui border border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-sm text-white font-mono">+1 (555) 987-6543</span>
                        <span className="text-xs text-slate-500">Duration: 45s • Critical Alert</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <Check className="w-3 h-3" /> Completed
                    </span>
                </div>
                 <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-sui border border-slate-800">
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
      {/* /agents legacy marketing page — redirected to platform home */}
      <Route path="/agents">{() => <Redirect to="/" />}</Route>
      <Route path="/dashboard" component={AgentDashboard} />
      <Route path="/agent/:agentId/telephony" component={AgentTelephony} />
      <Route path="/brand-admin" component={BrandAdminPage} />
      <Route path="/agent-manager" component={AgentManager} />
      <Route path="/admin/agents/build" component={AgentBuilderPage} />
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
      {/* Force dark theme so sidebar and main use sovereign palette (no light/grey mix). */}
      <div className="dark">
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full bg-slate-950 text-slate-200">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center gap-2 p-2 border-b border-indigo-500/20 bg-slate-900/80 backdrop-blur-xl shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="text-slate-300 hover:text-white hover:bg-slate-800" />
              </header>
              <main className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
                <AppRouter />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </ProtectedRoute>
  );
}

const RouteSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CustomerAuthProvider>
            <Suspense fallback={<RouteSpinner />}>
            <Switch>
              {/* Public routes */}
              <Route path="/" component={PlatformHomePage} />
              <Route path="/business" component={BusinessPage} />
              <Route path="/demo" component={DemoPublicRedirect} />
              <Route path="/buy" component={PlatformBuyPage} />
              <Route path="/more-info" component={PlatformInfoPage} />
              <Route path="/industry/:slug" component={IndustryFunnelPage} />
              <Route path="/login" component={Login} />
              <Route path="/contact" component={ContactForm} />
              <Route path="/sms-consent" component={SmsConsent} />
              <Route path="/v2" component={LandingV2} />
              <Route path="/investor-demo" component={InvestorDemo} />
              <Route path="/network" component={SovereignNetworkPage} />
              <Route path="/pitch-decks/:slug" component={PitchDeckViewer} />
              <Route path="/storefronts" component={StorefrontsIndex} />
              <Route path="/storefronts/:categorySlug" component={StorefrontCategoryPage} />
              {/* voice-demo route — handled by Gemini Live on homepage */}
              <Route path="/sdk" component={SdkShowcase} />
              <Route path="/sdk/ui-primitives" component={UiPrimitivesComparisonPage} />
              <Route path="/sdk/google-places" component={GooglePlacesSdk} />
              {/* ClearVoice Developer UI Kit — public URL; content gated inside page (dev or VITE_UI_KIT). Not LiveKit. */}
              <Route path="/dev/ui-kit" component={UiKitPage} />
              <Route path="/dev/shadcn-io-catalog" component={ShadcnIoCatalogPage} />
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
              {/* /agents legacy marketing page — redirected to platform home */}
              <Route path="/agents">{() => <Redirect to="/" />}</Route>
              <Route path="/biz/:slug" component={PublicBusinessPage} />
              <Route path="/agent/:slug" component={AgentPage} />
              <Route path="/ai-os/:slug" component={AiOsAgentPage} />
              <Route path="/kiosk/:slug" component={KioskPage} />
              {/* Standalone Clear Voice phone UI — QR-codeable, no app shell. Params: ?siteConfigId=uuid | ?slug=url-slug */}
              {/* Adapter only; governed entry: operator.integration.connect + governance-context API */}
              <Route path="/connect/cloudbeds" component={CloudbedsConnectPage} />
              <Route path="/phone" component={PhonePage} />
              <Route path="/clearvoice-logo" component={ClearVoiceLogoCenteredPage} />
              <Route path="/mission-control" component={MissionControlApp} />
              <Route path="/mission-control/*" component={MissionControlApp} />
              {/* Customer account routes */}
              <Route path="/my-account" component={MyAccount} />
              <Route path="/my-account/site/:siteId" component={CustomerSiteManager} />
              {/* Command Center / OS routes — same content, no sidebar (from chat) */}
              <Route path="/app/my-account" component={MyAccount} />
              <Route path="/app/my-account/site/:siteId" component={CustomerSiteManager} />
              <Route path="/app/billing" component={BillingPage} />
              <Route path="/app/reseller" component={ResellerDashboard} />
              <Route path="/app/mixing-board" component={MixingBoard} />
              <Route path="/app/aibizbot" component={AiBizBotAdmin} />
              <Route path="/app/compliance-gateway" component={OnboardingGateway} />
              {/* Sovereign admin shell — /platform and /me (dark mode). Use splat so /platform/tools/qr-codes etc. match. */}
              <Route path="/platform">
                <ProtectedRoute>
                  <AdminShell />
                </ProtectedRoute>
              </Route>
              <Route path="/platform/*">
                <ProtectedRoute>
                  <AdminShell />
                </ProtectedRoute>
              </Route>
              <Route path="/me">
                <ProtectedRoute>
                  <AdminShell />
                </ProtectedRoute>
              </Route>
              <Route path="/me/*">
                <ProtectedRoute>
                  <AdminShell />
                </ProtectedRoute>
              </Route>
              {/* Protected admin routes with sidebar */}
              <Route component={AppWithSidebar} />
            </Switch>
            </Suspense>
          </CustomerAuthProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
