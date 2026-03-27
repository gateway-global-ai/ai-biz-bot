/**
 * Workspace Tool Registry — Phase 5 Governed Dispatch Contract
 *
 * This is the SINGLE SOURCE OF TRUTH for what the workspace_provisioning_agent
 * is permitted to call. It binds three things together:
 *
 *   1. The agent's output contract  — only keys listed here may appear in workspace_actions[]
 *   2. GoogleWorkspaceService.executeTool() — maps registry keys to internal tool names
 *   3. The dispatch harness in workspaceAgentRoutes.ts — validates every action before execution
 *
 * ## Principle of Least Privilege
 *
 * - READ tools: list/verify only — no data mutation
 * - WRITE tools: create only — no update, no delete
 * - DELETE operations are NOT in this registry — they require a separate Phase 6 review gate
 * - gmail.sendWelcome: templateId resolves to a server-side object; free-form body never reaches sendEmail()
 * - workspace.updateStatus: intercepted before executeTool(); writes DB directly — agent cannot call arbitrary DB operations
 *
 * ## Adding a new tool
 *
 * 1. Add an entry here with the correct gswTool name (must exist in GoogleWorkspaceService.executeTool() switch)
 * 2. Add it to the WORKSPACE_WELCOME_TEMPLATES map if it uses a template
 * 3. Update the workspace_agent system prompt in seed-local-coding-agent.ts
 * 4. Run the seed script to redeploy the agent
 */
import { z } from "zod";

// ── Tool registry entry ───────────────────────────────────────────────────────

export type MutationLevel = "read" | "write";

export interface WorkspaceToolEntry {
  /** The tool name passed to GoogleWorkspaceService.executeTool(). "_internal_db_only_" means intercepted before that call. */
  gswTool: string;
  mutationLevel: MutationLevel;
  /** If true, the action is deferred to the review queue instead of executing immediately */
  requiresApproval: boolean;
  /** Param keys that must be present in the agent's action.params object */
  requiredParams: readonly string[];
  /** Human-readable description injected into the agent's system prompt */
  description: string;
}

export const WORKSPACE_TOOL_REGISTRY: Record<string, WorkspaceToolEntry> = {
  // ── Calendar ──────────────────────────────────────────────────────────────
  "calendar.verify": {
    gswTool: "listCalendarEvents",
    mutationLevel: "read",
    requiresApproval: false,
    requiredParams: [],
    description: "Verify that Calendar access is working. Returns up to 5 upcoming events.",
  },
  "calendar.createEvent": {
    gswTool: "createCalendarEvent",
    mutationLevel: "write",
    requiresApproval: false,
    requiredParams: ["summary", "startTime", "endTime"],
    description: "Create a calendar event. Required: summary, startTime (ISO8601), endTime (ISO8601).",
  },

  // ── Drive ─────────────────────────────────────────────────────────────────
  "drive.createFolder": {
    gswTool: "createDriveFolder",
    mutationLevel: "write",
    requiresApproval: false,
    requiredParams: ["name"],
    description: "Create a Drive folder. Required: name. Optional: parentId.",
  },
  "drive.createSheet": {
    gswTool: "createSpreadsheet",
    mutationLevel: "write",
    requiresApproval: false,
    requiredParams: ["title", "headers"],
    description: "Create a Google Sheet with named headers. Required: title (string), headers (string[]).",
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  "tasks.createTask": {
    gswTool: "createTask",
    mutationLevel: "write",
    requiresApproval: false,
    requiredParams: ["title"],
    description: "Create a task in the default task list. Required: title. Optional: notes, dueDate.",
  },

  // ── Gmail ─────────────────────────────────────────────────────────────────
  "gmail.verify": {
    gswTool: "listEmails",
    mutationLevel: "read",
    requiresApproval: false,
    requiredParams: [],
    description: "Verify Gmail access by listing the 5 most recent inbox messages.",
  },
  "gmail.sendWelcome": {
    gswTool: "sendEmail",
    mutationLevel: "write",
    requiresApproval: true,
    requiredParams: ["to", "templateId"],
    description: "Send a templated welcome email to the business operator. Required: to (email), templateId (string key from server template map). Agent may NOT supply a free-form body.",
  },

  // ── Workspace lifecycle ───────────────────────────────────────────────────
  "workspace.updateStatus": {
    gswTool: "_internal_db_only_",
    mutationLevel: "write",
    requiresApproval: false,
    requiredParams: ["status"],
    description: "Update the workspaceConfigurations.status for this siteConfigId. Allowed values: connected | error | provisioned.",
  },
  "workspace.createStructure": {
    gswTool: "createWorkspaceStructure",
    mutationLevel: "write",
    requiresApproval: false,
    requiredParams: ["businessName"],
    description: "Create the full standard Drive folder structure for a new business. Required: businessName.",
  },
} as const;

// ── Allowed status transitions for workspace.updateStatus ────────────────────

export const WORKSPACE_ALLOWED_STATUSES = new Set(["connected", "error", "provisioned"]);

// ── Gmail welcome templates ───────────────────────────────────────────────────
// The agent emits { tool: "gmail.sendWelcome", params: { to: "...", templateId: "workspace_ready" } }
// The harness resolves templateId here — free-form body never flows from agent output to sendEmail().

export interface WelcomeTemplate {
  subject: string;
  body: string;
}

export const WORKSPACE_WELCOME_TEMPLATES: Record<string, WelcomeTemplate> = {
  workspace_ready: {
    subject: "Your Gateway AI Workspace Is Ready",
    body: `Your Google Workspace integration has been successfully configured by Gateway Global AI.

What's been set up for you:
- Google Calendar sync for appointment booking
- Drive folder structure for lead tracking
- Task list for follow-up workflows
- Gmail connectivity verified

You can manage your workspace settings from your Gateway AI dashboard.

This is Gateway Global AI — you own this workspace and its data. No platform fees, no middleman.

— The Gateway Global AI Team`,
  },
  workspace_verify_success: {
    subject: "Google Workspace Verification Complete",
    body: `Your Google Workspace connection was verified successfully.

Calendar, Gmail, and Drive access are all confirmed. Your AI agents can now execute workspace actions on your behalf within your approved permission scope.

— The Gateway Global AI Team`,
  },
};

// ── Param schemas for runtime validation ─────────────────────────────────────

export const workspaceActionSchema = z.object({
  tool: z.string().min(1),
  params: z.record(z.unknown()).default({}),
});

export const workspaceActionsArraySchema = z.array(workspaceActionSchema).min(1).max(10);

export type WorkspaceAction = z.infer<typeof workspaceActionSchema>;

// ── Goal → default action sequence map ───────────────────────────────────────
// The route injects this context into the agent prompt for each goal type.

export const WORKSPACE_GOAL_CONTEXT: Record<string, string> = {
  setup_full: `Your goal is: FULL WORKSPACE SETUP
Emit an ordered workspace_actions[] array that:
1. Verifies Calendar access (calendar.verify)
2. Verifies Gmail access (gmail.verify)
3. Creates the standard Drive folder structure (workspace.createStructure) with businessName
4. Creates a Lead Tracking spreadsheet in Drive (drive.createSheet) with headers: ["Date","Name","Phone","Email","Service","Status","Notes"]
5. Creates a Follow-Up task list entry (tasks.createTask) titled "Weekly Follow-Up Review"
6. Updates workspace status to provisioned (workspace.updateStatus)
7. Sends a welcome email to the operator (gmail.sendWelcome) with templateId: "workspace_ready"`,

  verify_only: `Your goal is: VERIFY CONNECTIVITY ONLY
Emit workspace_actions[] that:
1. Verifies Calendar access (calendar.verify)
2. Verifies Gmail access (gmail.verify)
3. Updates workspace status accordingly (workspace.updateStatus)`,

  calendar_only: `Your goal is: CALENDAR SETUP ONLY
Emit workspace_actions[] that:
1. Verifies Calendar access (calendar.verify)
2. Creates a welcome/orientation calendar event (calendar.createEvent) with appropriate title and times`,

  drive_only: `Your goal is: DRIVE SETUP ONLY
Emit workspace_actions[] that:
1. Creates the standard Drive folder structure (workspace.createStructure) with businessName
2. Creates a Lead Tracking spreadsheet (drive.createSheet)`,
};
