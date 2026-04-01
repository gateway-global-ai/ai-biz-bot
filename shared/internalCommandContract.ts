/**
 * Gateway Global AI — Internal Command OS Contract
 *
 * Maps internal roles to actor classes, defines operating cycles,
 * internal intent keys, view IDs, and action IDs for the self-managing
 * AI OS. All internal actors authenticate via OTP, resolve to a governed
 * role, and see only the views/actions their role-cycle pair permits.
 */

import type { IntentLoopActorClass } from './intentLoopContract';

// ── Internal Roles ──────────────────────────────────────────────────────────

export const INTERNAL_ROLES = [
  'superadmin',
  'manager',
  'engineer',
  'customer_success',
  'auditor',
] as const;

export type InternalRole = (typeof INTERNAL_ROLES)[number];

export function resolveActorClass(role: InternalRole | string): IntentLoopActorClass {
  switch (role) {
    case 'superadmin':
    case 'manager':
      return 'management';
    case 'engineer':
    case 'customer_success':
    case 'auditor':
      return 'employee';
    default:
      return 'customer';
  }
}

export function isInternalRole(value: string): value is InternalRole {
  return (INTERNAL_ROLES as readonly string[]).includes(value);
}

// ── Operating Cycles ────────────────────────────────────────────────────────

export const BUILD_CYCLE_STATES = [
  'intake', 'planning', 'executing', 'review', 'promoted', 'blocked',
] as const;

export const CUSTOMER_CYCLE_STATES = [
  'lead', 'onboarding', 'active', 'support', 'expansion', 'retained', 'churn_risk',
] as const;

export const PLATFORM_CYCLE_STATES = [
  'configuration', 'validation', 'ready', 'deployed', 'monitored', 'incident', 'recovery',
] as const;

export const KNOWLEDGE_CYCLE_STATES = [
  'ingested', 'classified', 'certified', 'active', 'stale', 'rejected',
] as const;

export const APPROVAL_CYCLE_STATES = [
  'requested', 'under_review', 'approved', 'denied', 'escalated',
] as const;

export type BuildCycleState = (typeof BUILD_CYCLE_STATES)[number];
export type CustomerCycleState = (typeof CUSTOMER_CYCLE_STATES)[number];
export type PlatformCycleState = (typeof PLATFORM_CYCLE_STATES)[number];
export type KnowledgeCycleState = (typeof KNOWLEDGE_CYCLE_STATES)[number];
export type ApprovalCycleState = (typeof APPROVAL_CYCLE_STATES)[number];

// ── Command View IDs ────────────────────────────────────────────────────────

export const CMD_VIEW_IDS = [
  'cmd_home',
  'cmd_agents_list',
  'cmd_agent_detail',
  'cmd_work_items_list',
  'cmd_work_item_detail',
  'cmd_work_item_create',
  'cmd_tasks_list',
  'cmd_task_detail',
  'cmd_approvals_list',
  'cmd_approval_detail',
  'cmd_customers_list',
  'cmd_customer_detail',
  'cmd_violations_list',
  'cmd_system_status',
  'cmd_knowledge_status',
] as const;

export type CmdViewId = (typeof CMD_VIEW_IDS)[number];

// ── Command Action IDs ──────────────────────────────────────────────────────

export const CMD_ACTION_IDS = [
  'cmd.navigate',
  'cmd.agent.inspect',
  'cmd.agent.updateBehavior',
  'cmd.workItem.create',
  'cmd.workItem.inspect',
  'cmd.workItem.execute',
  'cmd.task.inspect',
  'cmd.task.assign',
  'cmd.approval.approve',
  'cmd.approval.deny',
  'cmd.approval.escalate',
  'cmd.customer.inspect',
  'cmd.violation.inspect',
  'cmd.knowledge.reviewStatus',
] as const;

export type CmdActionId = (typeof CMD_ACTION_IDS)[number];

// ── View Models ─────────────────────────────────────────────────────────────

export interface CmdHomeViewModel {
  role: InternalRole;
  actorClass: IntentLoopActorClass;
  agentCount: number;
  activeWorkItems: number;
  blockedWorkItems: number;
  pendingApprovals: number;
  recentViolations: number;
}

export interface CmdAgentSummary {
  id: string;
  name: string;
  roleType: string | null;
  status: string;
  operationalMode: string | null;
  siteConfigId: string | null;
}

export interface CmdAgentsListViewModel {
  agents: CmdAgentSummary[];
}

export interface CmdWorkItemSummary {
  id: string;
  title: string;
  status: string;
  siteConfigId: string | null;
  createdAt: string;
}

export interface CmdWorkItemsListViewModel {
  workItems: CmdWorkItemSummary[];
}

export interface CmdTaskSummary {
  id: string;
  state: string;
  intentType: string | null;
  agentId: string | null;
  createdAt: string;
}

export interface CmdTasksListViewModel {
  tasks: CmdTaskSummary[];
}

export interface CmdApprovalSummary {
  id: string;
  state: string;
  type: string | null;
  createdAt: string;
}

export interface CmdApprovalsListViewModel {
  approvals: CmdApprovalSummary[];
}

export interface CmdSystemStatusViewModel {
  agentsActive: number;
  agentsPaused: number;
  workItemsInProgress: number;
  violationsLast24h: number;
  siteConfigsTotal: number;
  voiceSessionsActive: number;
}

// ── Per-Role Capability Matrix ──────────────────────────────────────────────

export interface RoleCapabilities {
  canReadAgents: boolean;
  canWriteAgents: boolean;
  canReadWorkItems: boolean;
  canWriteWorkItems: boolean;
  canExecuteWorkItems: boolean;
  canReadTasks: boolean;
  canAssignTasks: boolean;
  canReadApprovals: boolean;
  canDecideApprovals: boolean;
  canReadViolations: boolean;
  canReadSystemStatus: boolean;
  canReadCustomers: boolean;
  canWriteCustomers: boolean;
  canManageKnowledge: boolean;
  canAccessVault: boolean;
}

export function getRoleCapabilities(role: InternalRole): RoleCapabilities {
  switch (role) {
    case 'superadmin':
      return {
        canReadAgents: true, canWriteAgents: true,
        canReadWorkItems: true, canWriteWorkItems: true, canExecuteWorkItems: true,
        canReadTasks: true, canAssignTasks: true,
        canReadApprovals: true, canDecideApprovals: true,
        canReadViolations: true, canReadSystemStatus: true,
        canReadCustomers: true, canWriteCustomers: true,
        canManageKnowledge: true, canAccessVault: true,
      };
    case 'manager':
      return {
        canReadAgents: true, canWriteAgents: true,
        canReadWorkItems: true, canWriteWorkItems: true, canExecuteWorkItems: false,
        canReadTasks: true, canAssignTasks: true,
        canReadApprovals: true, canDecideApprovals: true,
        canReadViolations: true, canReadSystemStatus: true,
        canReadCustomers: true, canWriteCustomers: true,
        canManageKnowledge: true, canAccessVault: false,
      };
    case 'engineer':
      return {
        canReadAgents: true, canWriteAgents: false,
        canReadWorkItems: true, canWriteWorkItems: true, canExecuteWorkItems: false,
        canReadTasks: true, canAssignTasks: false,
        canReadApprovals: false, canDecideApprovals: false,
        canReadViolations: true, canReadSystemStatus: true,
        canReadCustomers: false, canWriteCustomers: false,
        canManageKnowledge: false, canAccessVault: false,
      };
    case 'customer_success':
      return {
        canReadAgents: true, canWriteAgents: false,
        canReadWorkItems: false, canWriteWorkItems: false, canExecuteWorkItems: false,
        canReadTasks: false, canAssignTasks: false,
        canReadApprovals: false, canDecideApprovals: false,
        canReadViolations: false, canReadSystemStatus: false,
        canReadCustomers: true, canWriteCustomers: true,
        canManageKnowledge: false, canAccessVault: false,
      };
    case 'auditor':
      return {
        canReadAgents: true, canWriteAgents: false,
        canReadWorkItems: true, canWriteWorkItems: false, canExecuteWorkItems: false,
        canReadTasks: true, canAssignTasks: false,
        canReadApprovals: true, canDecideApprovals: false,
        canReadViolations: true, canReadSystemStatus: true,
        canReadCustomers: true, canWriteCustomers: false,
        canManageKnowledge: false, canAccessVault: false,
      };
  }
}

// ── Allowed Views per Role ──────────────────────────────────────────────────

export function getAllowedViews(role: InternalRole): CmdViewId[] {
  const caps = getRoleCapabilities(role);
  const views: CmdViewId[] = ['cmd_home'];

  if (caps.canReadAgents) views.push('cmd_agents_list', 'cmd_agent_detail');
  if (caps.canReadWorkItems) views.push('cmd_work_items_list', 'cmd_work_item_detail');
  if (caps.canWriteWorkItems) views.push('cmd_work_item_create');
  if (caps.canReadTasks) views.push('cmd_tasks_list', 'cmd_task_detail');
  if (caps.canReadApprovals) views.push('cmd_approvals_list', 'cmd_approval_detail');
  if (caps.canReadCustomers) views.push('cmd_customers_list', 'cmd_customer_detail');
  if (caps.canReadViolations) views.push('cmd_violations_list');
  if (caps.canReadSystemStatus) views.push('cmd_system_status');
  if (caps.canManageKnowledge) views.push('cmd_knowledge_status');

  return views;
}
