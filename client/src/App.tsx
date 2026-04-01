import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CustomerAuthProvider } from "@/lib/customerAuth";
import { Loader2 } from "lucide-react";

import PlatformHomePage from "@/pages/public/PlatformHomePage";
import DemoPublicRedirect from "@/pages/public/DemoPublicRedirect";

const PublicBusinessPage    = lazy(() => import("@/pages/public/PublicBusinessPage"));
const AgentPage             = lazy(() => import("@/pages/public/AgentPage"));
const AiOsAgentPage         = lazy(() => import("@/pages/public/AiOsAgentPage"));
const KioskPage             = lazy(() => import("@/pages/public/KioskPage"));
const PhonePage             = lazy(() => import("@/pages/public/PhonePage"));
const ClearVoiceLogoCenteredPage = lazy(() => import("@/pages/public/ClearVoiceLogoCenteredPage"));
const PlatformBuyPage       = lazy(() => import("@/pages/public/PlatformBuyPage"));
const PlatformInfoPage      = lazy(() => import("@/pages/public/PlatformInfoPage"));
const IndustryFunnelPage    = lazy(() => import("@/pages/public/IndustryFunnelPage"));
const AgentsLandingPage     = lazy(() => import("@/pages/public/AgentsLandingPage"));
const SovereignNetworkPage  = lazy(() => import("@/pages/public/SovereignNetworkPage"));
const SmsConsent            = lazy(() => import("@/pages/legal/SmsConsent"));

const RouteSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
  </div>
);

function NotFoundFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-slate-400">Page not found</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CustomerAuthProvider>
          <Suspense fallback={<RouteSpinner />}>
            <Switch>
              <Route path="/" component={PlatformHomePage} />
              <Route path="/demo" component={DemoPublicRedirect} />
              <Route path="/buy" component={PlatformBuyPage} />
              <Route path="/more-info" component={PlatformInfoPage} />
              <Route path="/industry/:slug" component={IndustryFunnelPage} />
              <Route path="/network" component={SovereignNetworkPage} />
              <Route path="/sms-consent" component={SmsConsent} />
              <Route path="/agents">{() => <Redirect to="/" />}</Route>
              <Route path="/biz/:slug" component={PublicBusinessPage} />
              <Route path="/agent/:slug" component={AgentPage} />
              <Route path="/ai-os/:slug" component={AiOsAgentPage} />
              <Route path="/kiosk/:slug" component={KioskPage} />
              <Route path="/phone" component={PhonePage} />
              <Route path="/clearvoice-logo" component={ClearVoiceLogoCenteredPage} />
              <Route component={NotFoundFallback} />
            </Switch>
          </Suspense>
        </CustomerAuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
