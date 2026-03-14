/**
 * Operational Mode — foundational template for agent behavior and execution plane.
 * The prompt compiler injects the selected mode as an absolute directive; the backend
 * filters the tool set so the model never receives APIs the mode does not allow.
 */

export type OperationalModeId =
  | "SAFE"
  | "CONCIERGE"
  | "RECEPTIONIST"
  | "SALES"
  | "CASHIER"
  | "CUSTOMER_SUPPORT"
  | "MANAGER"
  | "RESEARCH"
  | "CODING"
  | "REVIEW";

export interface OperationalModeDef {
  id: OperationalModeId;
  label: string;
  permissions: string;
  constraint: string;
  /** Instruction injected into system prompt. {{verification_level}} replaced when mode is CUSTOMER_SUPPORT. */
  instruction: string;
  /** Tool names allowed for this mode. Empty = no tools. Backend must not pass any tool not in this set. */
  allowedToolNames: string[];
}

export const OPERATIONAL_MODES: OperationalModeDef[] = [
  {
    id: "SAFE",
    label: "Safe Mode",
    permissions: "Discussion Only.",
    constraint:
      "Cannot offer to perform tasks. Cannot prompt for or save Customer PII (Personally Identifiable Information).",
    instruction:
      "You are in SAFE MODE. You may ONLY answer questions based on your provided knowledge base. You MUST NOT offer to perform any tasks, workflows, or actions. You MUST NOT ask for, collect, or save any customer contact information or PII. If a user asks you to perform a task, politely state that you are an information-only assistant.",
    allowedToolNames: [],
  },
  {
    id: "CONCIERGE",
    label: "Concierge Mode",
    permissions: "Routing Only.",
    constraint:
      "Can only assess user intent and route customers to provided internal destinations/agents.",
    instruction:
      "You are in CONCIERGE MODE. You act as a routing gateway. Your ONLY goal is to determine the user's intent and transfer them to the correct destination, department, or specialized agent. Do not attempt to solve complex problems yourself. Once intent is clear, immediately suggest the appropriate next step or transfer.",
    allowedToolNames: ["request_manual_input", "confirm_location_selection", "get_business_details"],
  },
  {
    id: "RECEPTIONIST",
    label: "Receptionist Mode",
    permissions: "Intake & Data Collection.",
    constraint:
      "Can take customer information and save inquiries/tickets for others to handle. Cannot resolve complex issues.",
    instruction:
      "You are in RECEPTIONIST MODE. You may collect customer information and save inquiries or tickets for others to handle. You MUST NOT attempt to resolve complex issues yourself. Limit yourself to intake, scheduling context, and routing to the right team.",
    allowedToolNames: [
      "request_manual_input",
      "get_business_details",
      "get_booking_and_pricing_info",
      "query_knowledge_library",
    ],
  },
  {
    id: "SALES",
    label: "Sales Mode",
    permissions: "Commerce Generation.",
    constraint:
      "Can assist with locating products/services from a catalog, create an invoice, order, or fill a shopping cart. (No payment capture).",
    instruction:
      "You are in SALES MODE. You may assist with locating products or services, creating quotes, and filling a shopping cart. You MUST NOT capture payment or process payments yourself. Direct the customer to a secure payment link or cashier when they are ready to pay.",
    allowedToolNames: [
      "request_manual_input",
      "get_business_details",
      "get_booking_and_pricing_info",
      "query_knowledge_library",
      "search_local_business",
      "generate_quote",
      "apply_discount",
    ],
  },
  {
    id: "CASHIER",
    label: "Cashier Mode",
    permissions: "Payment Capture.",
    constraint:
      "Has access to shopping cart info and customer details. Can accept payments or provide secure payment links.",
    instruction:
      "You are in CASHIER MODE. You have access to cart and customer context. You may provide secure payment links and confirm payment completion. Only use payment tools when the customer has agreed to purchase.",
    allowedToolNames: [
      "request_manual_input",
      "get_business_details",
      "get_booking_and_pricing_info",
      "query_knowledge_library",
      "stripe_checkout",
      "send_onboarding_email",
    ],
  },
  {
    id: "CUSTOMER_SUPPORT",
    label: "Customer Support Mode",
    permissions: "Account Access & Resolution.",
    constraint: "Requires active Customer Verification (OTP/Magic Link).",
    instruction:
      "You are in CUSTOMER SUPPORT MODE. You may access customer account data to resolve issues. However, before discussing ANY account-specific information, you MUST verify the customer's identity using the available verification flow. If verification fails or is incomplete, you must refuse to share account details.",
    allowedToolNames: [
      "request_manual_input",
      "get_business_details",
      "get_booking_and_pricing_info",
      "query_knowledge_library",
    ],
  },
  {
    id: "MANAGER",
    label: "Manager Mode",
    permissions: "Oversight & Approval.",
    constraint:
      "Has access to customer data, chat logs, and guidelines. Can approve execute-with-approval decisions for other agents.",
    instruction:
      "You are in MANAGER MODE. You are an oversight and approval agent. You have access to chat logs and cross-agent data. Your primary function is to review pending decisions from Tier 1 agents and approve or reject them based on the company guidelines provided in your Knowledge Base.",
    allowedToolNames: [
      "request_manual_input",
      "get_business_details",
      "get_business_reviews",
      "get_business_intelligence",
      "query_knowledge_library",
    ],
  },
  {
    id: "RESEARCH",
    label: "Research Mode",
    permissions: "Read-Only Discovery.",
    constraint:
      "Restricted to internet/internal KB research. Cannot edit or modify external systems. Operates strictly in an isolated sandbox/owner folder.",
    instruction:
      "You are in RESEARCH MODE. You are restricted to read-only discovery: internal knowledge base and provided data. You MUST NOT edit, modify, or write to any external systems. Operate strictly within the provided research context.",
    allowedToolNames: [
      "query_knowledge_library",
      "get_business_details",
      "get_business_reviews",
      "get_business_intelligence",
      "search_local_business",
      "get_place_ui_data",
    ],
  },
  {
    id: "CODING",
    label: "Coding Mode",
    permissions: "Write/Execute Access.",
    constraint: "Can work on systems and coding in designated working folders. Can make changes and edits.",
    instruction:
      "You are in CODING MODE. You may work in designated working folders and make changes. Stay within the scoped paths and do not modify production or sensitive systems without approval.",
    allowedToolNames: [],
  },
  {
    id: "REVIEW",
    label: "Review Mode",
    permissions: "Read/Annotate.",
    constraint:
      "Can review code/work previously done. Can comment, but strictly cannot modify, delete, or commit code changes.",
    instruction:
      "You are in REVIEW MODE. You may review and comment on work previously done. You MUST NOT modify, delete, or commit any code or data changes.",
    allowedToolNames: [],
  },
];

const modeById = new Map<OperationalModeId, OperationalModeDef>(
  OPERATIONAL_MODES.map((m) => [m.id, m])
);

export function getOperationalMode(modeId: string | null | undefined): OperationalModeDef | null {
  if (!modeId) return null;
  return modeById.get(modeId as OperationalModeId) ?? null;
}

export function getModeInstruction(
  modeId: string | null | undefined,
  verificationLevel?: string | null
): string {
  const mode = getOperationalMode(modeId);
  if (!mode) return "";
  let text = mode.instruction;
  if (mode.id === "CUSTOMER_SUPPORT" && verificationLevel) {
    text = text.replace(
      "using the available verification flow",
      `using ${verificationLevel} verification`
    );
  }
  return text;
}

/** Returns the list of tool names allowed for this mode. Execution plane must only pass these tools. */
export function getToolsAllowedForMode(modeId: string | null | undefined): string[] {
  const mode = getOperationalMode(modeId);
  return mode?.allowedToolNames ?? [];
}
