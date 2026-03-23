/**
 * Admin nav taxonomy — single source of truth for sidebar and routes.
 * Sovereign admin: Platform, Org, Location, Me.
 * Dark mode aligned to sovereign palette (slate-950, indigo, rounded-sui).
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Plug,
  FileText,
  ScrollText,
  Shield,
  BookOpen,
  Route,
  Phone,
  Bot,
  Wallet,
  Link2,
  ClipboardList,
  User,
  Key,
  Bell,
  Settings,
  HelpCircle,
  Wrench,
  QrCode,
  Zap,
  BarChart3,
  Activity,
  Brain,
} from "lucide-react";

export type AdminScope = "platform" | "org" | "location" | "me";

export interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  children?: AdminNavItem[];
}

/** Platform (super-admin) group. */
export const platformNav: AdminNavItem[] = [
  { id: "overview", label: "Overview", path: "/platform/overview", icon: LayoutDashboard },
  { id: "businesses", label: "Businesses", path: "/platform/businesses", icon: Building2 },
  { id: "tenants", label: "Business Customers", path: "/platform/tenants", icon: Users },
  { id: "knowledge-library", label: "Knowledge Library", path: "/platform/knowledge", icon: BookOpen },
  {
    id: "tools",
    label: "Tools",
    path: "/platform/tools",
    icon: Wrench,
    children: [
      { id: "qr-code-manager", label: "QR Code Manager", path: "/platform/tools/qr-codes", icon: QrCode },
      { id: "call-tracking", label: "Call Tracking", path: "/platform/tools/call-tracking", icon: Phone },
      { id: "lead-machine", label: "Lead Machine", path: "/platform/tools/lead-machine", icon: Zap },
      { id: "sites-leads", label: "Sites & Leads", path: "/platform/tools/sites-leads", icon: LayoutDashboard },
      { id: "campaigns", label: "Campaigns", path: "/platform/tools/campaigns", icon: BarChart3 },
      { id: "customers", label: "Customers", path: "/platform/tools/customers", icon: Users },
      { id: "sms-health", label: "SMS Health", path: "/platform/tools/sms-health", icon: Activity },
      { id: "disc", label: "DISC Assessment", path: "/platform/tools/disc", icon: Brain },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    path: "/platform/settings",
    icon: Settings,
    children: [
      { id: "security", label: "Security", path: "/platform/settings/security", icon: Shield },
      { id: "routing", label: "Routing", path: "/platform/settings/routing", icon: Route },
      { id: "telephony", label: "Global Telephony", path: "/platform/settings/telephony", icon: Phone },
      { id: "ai-providers", label: "AI Providers", path: "/platform/settings/ai-providers", icon: Bot },
      { id: "agent-templates", label: "Agent Templates", path: "/platform/settings/agent-templates", icon: FileText },
      { id: "billing-engine", label: "Billing Engine", path: "/platform/settings/billing-engine", icon: Wallet },
      { id: "affiliate-program", label: "Affiliate Program", path: "/platform/settings/affiliate-program", icon: Link2 },
      { id: "audit-logs", label: "Audit Logs", path: "/platform/settings/audit-logs", icon: ClipboardList },
    ],
  },
  {
    id: "support",
    label: "Support",
    path: "/platform/support",
    icon: HelpCircle,
    children: [
      { id: "impersonate", label: "Impersonate", path: "/platform/support/impersonate", icon: User },
    ],
  },
];

/** My Account (end-user) group. */
export const meNav: AdminNavItem[] = [
  { id: "profile", label: "Profile", path: "/me/profile", icon: User },
  { id: "security", label: "Security", path: "/me/security", icon: Shield },
  { id: "notifications", label: "Notifications", path: "/me/notifications", icon: Bell },
  { id: "api-keys", label: "API Keys", path: "/me/api-keys", icon: Key },
];

/** Resolve scope from path (e.g. /platform/* -> platform, /me/* -> me). */
export function getScopeFromPath(path: string): AdminScope | null {
  if (path.startsWith("/platform")) return "platform";
  if (path.startsWith("/org/")) return "org";
  if (path.startsWith("/me")) return "me";
  return null;
}

/** Flatten nav items for sidebar (include child paths). */
export function flattenNavItems(items: AdminNavItem[]): AdminNavItem[] {
  const out: AdminNavItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children) out.push(...flattenNavItems(item.children));
  }
  return out;
}
