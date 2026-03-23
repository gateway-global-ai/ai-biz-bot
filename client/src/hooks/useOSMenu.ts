import { useMemo } from 'react';
import { 
  LayoutDashboard, Users, Calendar, MessageSquare, 
  Shield, FileText, BarChart3, Settings, 
  CreditCard, Briefcase, User, Phone,
  Bot, Activity, Search, Globe
} from 'lucide-react';

export type OSMenuItem = {
  id: string;
  label: string;
  icon: any;
  action?: string; // Governed action ID (e.g. 'switch_view')
  viewId?: string; // Target view ID if action is switch_view
  children?: OSMenuItem[];
};

export type OSRole = 'customer' | 'employee' | 'manager' | 'admin';

export function useOSMenu(role: OSRole = 'customer', isAuthenticated: boolean = false) {
  return useMemo(() => {
    // 1. Customer (External User)
    const customerMenu: OSMenuItem[] = [
      {
        id: 'appointments',
        label: 'Appointments',
        icon: Calendar,
        children: [
          { id: 'book', label: 'Book Appointment', icon: Calendar, action: 'switch_view', viewId: 'booking-view' },
          { id: 'reschedule', label: 'Reschedule', icon: RefreshCw, action: 'switch_view', viewId: 'reschedule-view' },
        ]
      },
      {
        id: 'account',
        label: 'My Account',
        icon: User,
        children: [
          { id: 'profile', label: 'Profile', icon: User, action: 'switch_view', viewId: 'profile-view' },
          { id: 'insurance', label: 'Insurance', icon: Shield, action: 'switch_view', viewId: 'insurance-view' },
        ]
      },
      {
        id: 'support',
        label: 'Support',
        icon: MessageSquare,
        children: [
          { id: 'concierge', label: 'AI Concierge', icon: Bot, action: 'switch_view', viewId: 'concierge-view' },
        ]
      }
    ];

    // 2. Employee (Front Desk)
    const employeeMenu: OSMenuItem[] = [
      {
        id: 'start',
        label: 'Start Screen',
        icon: LayoutDashboard,
        action: 'switch_view',
        viewId: 'employee-dashboard-view'
      },
      {
        id: 'front_desk',
        label: 'Front Desk',
        icon: Users,
        children: [
          { id: 'live_queue', label: 'Live Queue', icon: Activity, action: 'switch_view', viewId: 'live-queue-view' },
          { id: 'session_monitor', label: 'Session Monitor', icon: Eye, action: 'switch_view', viewId: 'session-monitor-view' },
        ]
      },
      {
        id: 'appointments',
        label: 'Appointments',
        icon: Calendar,
        action: 'switch_view',
        viewId: 'calendar-view'
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: User,
        action: 'switch_view',
        viewId: 'customer-list-view'
      },
      {
        id: 'verification',
        label: 'Verification',
        icon: Shield,
        action: 'switch_view',
        viewId: 'verification-view'
      },
      {
        id: 'intake',
        label: 'Intake',
        icon: FileText,
        action: 'switch_view',
        viewId: 'intake-view'
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: MessageSquare,
        action: 'switch_view',
        viewId: 'communications-view'
      }
    ];

    // 3. Manager / Owner
    const managerMenu: OSMenuItem[] = [
      {
        id: 'start',
        label: 'Overview',
        icon: LayoutDashboard,
        action: 'switch_view',
        viewId: 'manager-dashboard-view'
      },
      {
        id: 'operations',
        label: 'Operations',
        icon: Activity,
        action: 'switch_view',
        viewId: 'operations-view'
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: Users,
        action: 'switch_view',
        viewId: 'customer-db-view'
      },
      {
        id: 'appointments',
        label: 'Appointments',
        icon: Calendar,
        action: 'switch_view',
        viewId: 'schedule-rules-view'
      },
      {
        id: 'staff',
        label: 'Staff',
        icon: Briefcase,
        action: 'switch_view',
        viewId: 'staff-view'
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: Phone,
        action: 'switch_view',
        viewId: 'comms-config-view'
      },
      {
        id: 'agents',
        label: 'Agents',
        icon: Bot,
        action: 'switch_view',
        viewId: 'agent-manager' // Maps to AgentManager component
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: BarChart3,
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
        action: 'switch_view',
        viewId: 'system-health-view'
      },
      {
        id: 'organization',
        label: 'Organization',
        icon: Building2,
        children: [
          { id: 'locations', label: 'Locations', icon: Globe, action: 'switch_view', viewId: 'locations-view' },
          { id: 'billing', label: 'Billing', icon: CreditCard, action: 'switch_view', viewId: 'billing-view' },
        ]
      },
      {
        id: 'identity',
        label: 'Identity',
        icon: Fingerprint,
        action: 'switch_view',
        viewId: 'identity-view'
      },
      {
        id: 'ai_governance',
        label: 'AI Governance',
        icon: Shield,
        children: [
          { id: 'agent_behavior', label: 'Agent Behavior', icon: Bot, action: 'switch_view', viewId: 'behavior-view' },
          { id: 'guardrails', label: 'Guardrails', icon: Lock, action: 'switch_view', viewId: 'guardrails-view' },
        ]
      },
      {
        id: 'audit',
        label: 'Audit',
        icon: FileText,
        action: 'switch_view',
        viewId: 'audit-view'
      }
    ];

    // Return menu based on role
    switch (role) {
      case 'admin': return adminMenu;
      case 'manager': return managerMenu;
      case 'employee': return employeeMenu;
      case 'customer': 
      default:
        return isAuthenticated ? customerMenu : [
          { id: 'welcome', label: 'Welcome', icon: LayoutDashboard, action: 'switch_view', viewId: 'welcome-view' },
          { id: 'login', label: 'Login / Verify', icon: User, action: 'switch_view', viewId: 'login-view' },
          ...customerMenu
        ];
    }
  }, [role, isAuthenticated]);
}

// Helper icons needed for imports
import { RefreshCw, Eye, Building2, Fingerprint, Lock } from 'lucide-react';
