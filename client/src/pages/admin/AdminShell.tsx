/**
 * Admin shell — sovereign-styled layout for /platform and /me.
 * Dark mode aligned to chat: bg-slate-950, glass, indigo accents, rounded-sui.
 * Sidebar driven by adminNav.ts.
 */
import { useLocation, Link, Redirect } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
} from "@/components/ui/sidebar";
import {
  platformNav,
  meNav,
  getScopeFromPath,
  type AdminNavItem,
} from "@/config/adminNav";
import { PlatformOverview } from "./PlatformOverview";
import { PlatformTenants } from "./PlatformTenants";
import { PlatformBusinesses } from "./PlatformBusinesses";
import { PlatformBusinessManager } from "./PlatformBusinessManager";
import { PlatformQRCodeManager } from "./PlatformQRCodeManager";
import { PlatformSettingsPage } from "./PlatformSettingsPage";
import { PlatformTelephony } from "./PlatformTelephony";
import { PlatformBilling } from "./PlatformBilling";
import { PlatformAffiliate } from "./PlatformAffiliate";
import { MeProfile } from "./MeProfile";
import CallTracking from "@/pages/biz-dashboard/CallTracking";
import VoiceLeadMachine from "@/pages/biz-dashboard/VoiceLeadMachine";
import SitesAndLeads from "@/pages/owner/SitesAndLeads";
import TransparencyDashboard from "@/pages/biz-dashboard/TransparencyDashboard";
import CustomerManager from "@/pages/biz-dashboard/CustomerManager";
import TwilioHealthCheck from "@/pages/developer/TwilioHealthCheck";
import DiscAssessment from "@/pages/showcase/DiscAssessment";
import { PlatformAgentsLanding } from "./PlatformAgentsLanding";
import { PlatformKnowledgeLanding } from "./PlatformKnowledgeLanding";
/** Same Clear Voice AI logo as main app sidebar (POWERED BY CLEAR VOICE AI). */
const SIDEBAR_LOGO = "/clear_voice_ai_logo.png";

function NavItem({ item, isActive }: { item: AdminNavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={item.path}>
          <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
          <span className={isActive ? "text-white" : "text-slate-400"}>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AdminSidebar() {
  const [location] = useLocation();
  const scope = getScopeFromPath(location);

  const renderGroup = (label: string, items: AdminNavItem[], groupId: string) => (
    <SidebarGroup key={groupId}>
      <SidebarGroupLabel className="text-slate-500 text-xs font-bold uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location === item.path ||
              (item.path !== "/platform" && item.path !== "/me" && location.startsWith(item.path + "/"));
            if (item.children && item.children.length > 0) {
              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {item.label}
                  </div>
                  {item.children.map((child) => (
                    <NavItem
                      key={child.id}
                      item={child}
                      isActive={location === child.path}
                    />
                  ))}
                </div>
              );
            }
            return <NavItem key={item.id} item={item} isActive={isActive} />;
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className="sidebar-admin border-r border-indigo-500/20 bg-[#0F172A] text-slate-200">
      <div className="p-4 pb-6 border-b border-indigo-500/20 flex justify-center items-center bg-[#0F172A] min-h-[12rem]">
        <img src={SIDEBAR_LOGO} alt="Clear Voice AI" className="h-48 w-auto max-w-[540px] object-contain" />
      </div>
      <SidebarContent className="bg-[#0F172A] text-slate-200 overflow-y-auto scrollbar-hide">
        {scope === "platform" && renderGroup("Platform", platformNav, "platform")}
        {scope === "me" && renderGroup("My Account", meNav, "me")}
        {!scope && (
          <>
            {renderGroup("Platform", platformNav, "platform")}
            {renderGroup("My Account", meNav, "me")}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-indigo-500/20 bg-[#0F172A] p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sui bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
            A
          </div>
          <div>
            <p className="text-xs font-bold text-white">Admin</p>
            <p className="text-[10px] text-slate-400">Sovereign</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminContent() {
  const [location] = useLocation();

  if (location === "/platform" || location === "/platform/overview") return <PlatformOverview />;
  if (location === "/platform/tenants") return <PlatformTenants />;
  if (location === "/platform/businesses") return <PlatformBusinesses />;
  if (location.startsWith("/platform/businesses/")) return <PlatformBusinessManager />;
  if (location === "/platform/agents" || location.startsWith("/platform/agents/")) return <PlatformBusinesses />;
  if (location === "/platform/knowledge") return <PlatformKnowledgeLanding />;
  // Platform settings overrides (real content, not stub)
  if (location === "/platform/settings/telephony") return <PlatformTelephony />;
  if (location === "/platform/settings/billing-engine") return <PlatformBilling />;
  if (location === "/platform/settings/affiliate-program") return <PlatformAffiliate />;
  // Platform tools (specific routes)
  if (location === "/platform/tools/call-tracking") return <CallTracking />;
  if (location === "/platform/tools/lead-machine") return <VoiceLeadMachine />;
  if (location === "/platform/tools/sites-leads") return <SitesAndLeads />;
  if (location === "/platform/tools/campaigns") return <TransparencyDashboard />;
  if (location === "/platform/tools/customers") return <CustomerManager />;
  if (location === "/platform/tools/sms-health") return <TwilioHealthCheck />;
  if (location === "/platform/tools/disc") return <DiscAssessment />;
  // Tools: QR Code Manager (default for /platform/tools and /platform/tools/qr-codes)
  if (location === "/platform/tools" || location === "/platform/tools/qr-codes") return <PlatformQRCodeManager />;
  // All other platform settings and support sub-routes
  if (location.startsWith("/platform/settings/") || location.startsWith("/platform/support/")) return <PlatformSettingsPage />;
  if (location === "/me" || location === "/me/profile") return <MeProfile />;
  if (location.startsWith("/platform")) return <PlatformOverview />;
  if (location.startsWith("/me")) return <MeProfile />;

  return (
    <div className="p-6">
      <p className="text-slate-400">Page not found. Use the sidebar to navigate.</p>
    </div>
  );
}

export function AdminShell() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle} defaultOpen={true}>
      <div className="flex h-screen w-full bg-[#0F172A] text-slate-200">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-2 border-b border-indigo-500/20 bg-slate-900/80 backdrop-blur-xl">
            <SidebarTrigger className="text-slate-400 hover:text-white" />
            <span className="text-sm text-slate-400">Admin</span>
          </header>
          <main className="flex-1 overflow-y-auto bg-slate-950 scrollbar-hide">
            <AdminContent />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
