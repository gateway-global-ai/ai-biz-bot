import { useMemo } from 'react';
import {
  LayoutDashboard, Users, Calendar, MessageSquare,
  Shield, FileText, BarChart3, Settings,
  CreditCard, Briefcase, User, Phone,
  Bot, Activity, Search, Globe,
  Sparkles, Palette, Gift, Target, TrendingUp, CheckSquare,
  Rocket, Building2, Fingerprint, Lock, RefreshCw, Eye,
  Wand2
} from 'lucide-react';

export type OSMenuItem = {
  id: string;
  label: string;
  icon: any;
  description?: string;
  action?: string;
  viewId?: string;
  children?: OSMenuItem[];
};

export type OSRole = 'customer' | 'employee' | 'manager' | 'admin';

/** Feature capabilities derived from the active skill registry (siteConfigs.config.skills).
 * A capability is true only when the corresponding skill status === "active".
 * See docs-governance/SKILL_REGISTRY.md for the full skill list and preflight requirements.
 */
export type OSCapabilities = {
  /** Appointments & Calendar skill — requires calendar + bookingEngineUrl. */
  booking?: boolean;
  /** Customer account/profile — always true on claimed sites. */
  account?: boolean;
  /** SMS & Text Notifications skill. */
  sms?: boolean;
  /** Payments & Invoicing skill. */
  payments?: boolean;
  /** Review Management skill. */
  reviews?: boolean;
  /** Loyalty & Rewards skill. */
  loyalty?: boolean;
};

export function useOSMenu(role: OSRole = 'customer', isAuthenticated: boolean = false, capabilities: OSCapabilities = {}) {
  return useMemo(() => {
    // 1. Customer (External User)
    const customerMenu: OSMenuItem[] = [
      // Appointments: only shown when booking integration is configured
      ...(capabilities.booking ? [{
        id: 'appointments',
        label: 'Appointments',
        icon: Calendar,
        description: 'Book, reschedule, or cancel',
        children: [
          { id: 'book', label: 'Book Appointment', icon: Calendar, description: 'Schedule a new visit', action: 'switch_view', viewId: 'booking-view' },
          { id: 'reschedule', label: 'Reschedule', icon: RefreshCw, description: 'Change an existing booking', action: 'switch_view', viewId: 'reschedule-view' },
        ]
      }] : []),
      {
        id: 'account',
        label: 'My Account',
        icon: User,
        description: 'Profile and insurance info',
        children: [
          { id: 'profile', label: 'Profile', icon: User, description: 'View and update your info', action: 'switch_view', viewId: 'profile-view' },
          { id: 'insurance', label: 'Insurance', icon: Shield, description: 'Insurance details on file', action: 'switch_view', viewId: 'insurance-view' },
        ]
      },
      {
        id: 'support',
        label: 'Support',
        icon: MessageSquare,
        description: 'Get help from AI or staff',
        children: [
          { id: 'concierge', label: 'AI Concierge', icon: Bot, description: 'Ask anything', action: 'switch_view', viewId: 'concierge-view' },
        ]
      }
    ];

    // 2. Employee (Front Desk)
    const employeeMenu: OSMenuItem[] = [
      {
        id: 'start',
        label: 'Dashboard',
        icon: LayoutDashboard,
        description: 'Your shift overview',
        action: 'switch_view',
        viewId: 'employee-dashboard-view'
      },
      {
        id: 'front_desk',
        label: 'Front Desk',
        icon: Users,
        description: 'Live queue and session monitor',
        children: [
          { id: 'live_queue', label: 'Live Queue', icon: Activity, description: 'Active customer queue', action: 'switch_view', viewId: 'live-queue-view' },
          { id: 'session_monitor', label: 'Session Monitor', icon: Eye, description: 'AI session activity', action: 'switch_view', viewId: 'session-monitor-view' },
        ]
      },
      // Appointments: only shown when calendar integration is active
      ...(capabilities.booking ? [{
        id: 'appointments',
        label: 'Appointments',
        icon: Calendar,
        description: 'Today\'s schedule',
        action: 'switch_view',
        viewId: 'calendar-view'
      }] : []),
      {
        id: 'customers',
        label: 'Customers',
        icon: User,
        description: 'Customer records',
        action: 'switch_view',
        viewId: 'customer-list-view'
      },
      {
        id: 'verification',
        label: 'Verification',
        icon: Shield,
        description: 'Nova IDV status',
        action: 'switch_view',
        viewId: 'verification-view'
      },
      {
        id: 'intake',
        label: 'Intake',
        icon: FileText,
        description: 'Patient or customer intake',
        action: 'switch_view',
        viewId: 'intake-view'
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: MessageSquare,
        description: 'SMS and messaging',
        action: 'switch_view',
        viewId: 'communications-view'
      }
    ];

    // 3. Manager / Owner
    const managerMenu: OSMenuItem[] = [
      {
        id: 'business_setup',
        label: 'Business Setup',
        icon: Wand2,
        description: 'AI-guided 5-step onboarding with the AI Biz Bot',
        action: 'switch_view',
        viewId: 'step_1_business_research'
      },
      {
        id: 'getting_started',
        label: 'Getting Started',
        icon: Rocket,
        description: 'Phase-by-phase deployment guide',
        action: 'switch_view',
        viewId: 'getting-started-view'
      },
      {
        id: 'overview',
        label: 'Overview',
        icon: LayoutDashboard,
        description: 'Business performance at a glance',
        action: 'switch_view',
        viewId: 'manager-dashboard-view'
      },
      {
        id: 'brand_governance',
        label: 'Brand Governance',
        icon: Sparkles,
        description: 'Define your brand, offer, and sales strategy',
        children: [
          { id: 'brand_profile', label: 'Brand Profile', icon: Palette, description: 'Name, slogan, logo, colors, claim', action: 'switch_view', viewId: 'brand-profile-view' },
          { id: 'offer_stack', label: 'Offer Stack', icon: Gift, description: 'Irresistible offer, free trial, guarantee', action: 'switch_view', viewId: 'offer-stack-view' },
          { id: 'market_strategy', label: 'Market Strategy', icon: Target, description: 'Target market and channel partners', action: 'switch_view', viewId: 'market-strategy-view' },
          { id: 'sales_funnels', label: 'Sales Funnels', icon: TrendingUp, description: 'Conversion paths and digital tree', action: 'switch_view', viewId: 'sales-funnels-view' },
          { id: 'preflight', label: 'Pre-Flight', icon: CheckSquare, description: 'Readiness score and go-live approval', action: 'switch_view', viewId: 'preflight-view' },
        ]
      },
      {
        id: 'operations',
        label: 'Operations',
        icon: Activity,
        description: 'Day-to-day business operations',
        action: 'switch_view',
        viewId: 'operations-view'
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: Users,
        description: 'Customer database and records',
        action: 'switch_view',
        viewId: 'customer-db-view'
      },
      {
        id: 'appointments',
        label: 'Appointments',
        icon: Calendar,
        description: 'Scheduling rules and calendar',
        action: 'switch_view',
        viewId: 'schedule-rules-view'
      },
      {
        id: 'staff',
        label: 'Staff',
        icon: Briefcase,
        description: 'Team members and roles',
        action: 'switch_view',
        viewId: 'staff-view'
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: Phone,
        description: 'Phone, SMS, and messaging config',
        action: 'switch_view',
        viewId: 'comms-config-view'
      },
      {
        id: 'agents',
        label: 'Agents',
        icon: Bot,
        description: 'Configure AI agent behavior and skills',
        action: 'switch_view',
        viewId: 'agent-manager'
      },
      {
        id: 'design_studio',
        label: 'Design Studio',
        icon: Wand2,
        description: 'AI-guided views and apps (Chad)',
        action: 'switch_view',
        viewId: 'design_studio_landing'
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: BarChart3,
        description: 'Revenue events and analytics',
        action: 'switch_view',
        viewId: 'reports-view'
      }
    ];

    // 4. Admin (System Governance)
    const adminMenu: OSMenuItem[] = [
      {
        id: 'health',
        label: 'System Health',
        icon: Activity,
        description: 'Platform and API status',
        action: 'switch_view',
        viewId: 'system-health-view'
      },
      {
        id: 'organization',
        label: 'Organization',
        icon: Building2,
        description: 'Locations and billing',
        children: [
          { id: 'locations', label: 'Locations', icon: Globe, description: 'Manage business locations', action: 'switch_view', viewId: 'locations-view' },
          { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Plans and payments', action: 'switch_view', viewId: 'billing-view' },
        ]
      },
      {
        id: 'identity',
        label: 'Identity',
        icon: Fingerprint,
        description: 'Nova IDV and verification settings',
        action: 'switch_view',
        viewId: 'identity-view'
      },
      {
        id: 'ai_governance',
        label: 'AI Governance',
        icon: Shield,
        description: 'Agent policies and guardrails',
        children: [
          { id: 'agent_behavior', label: 'Agent Behavior', icon: Bot, description: 'DISC, ARCH, and mode settings', action: 'switch_view', viewId: 'behavior-view' },
          { id: 'guardrails', label: 'Guardrails', icon: Lock, description: 'Safety policies and restrictions', action: 'switch_view', viewId: 'guardrails-view' },
        ]
      },
      {
        id: 'audit',
        label: 'Audit',
        icon: FileText,
        description: 'System logs and governance events',
        action: 'switch_view',
        viewId: 'audit-view'
      }
    ];

    switch (role) {
      case 'admin': return adminMenu;
      case 'manager': return managerMenu;
      case 'employee': return employeeMenu;
      case 'customer':
      default:
        return isAuthenticated ? customerMenu : [
          { id: 'welcome', label: 'Welcome', icon: LayoutDashboard, description: 'Get started with the AI OS', action: 'switch_view', viewId: 'welcome-view' },
          { id: 'login', label: 'Login / Verify', icon: User, description: 'Sign in or verify your identity', action: 'switch_view', viewId: 'login-view' },
          ...customerMenu
        ];
    }
  }, [role, isAuthenticated, capabilities.booking, capabilities.account,
      capabilities.sms, capabilities.payments, capabilities.reviews, capabilities.loyalty]);
}
