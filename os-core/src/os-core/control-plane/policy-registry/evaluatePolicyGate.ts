const ALPHA_ALLOWED_GATES = new Set([
  "os_boot_ready",
  "admin_access",
  "workspace_access",
  "agent_config_access",
  "agent_behavior_control",
  "support_public",
  "admin.onboarding.read",
  "admin.onboarding.write",
  "runtime_chaos_mutate",
  "telephony.paid_activation.write",
  "messaging.verification_only",
  "messaging.customer_care",
  "messaging.marketing",
  "frontdesk.assist.write",
  "frontdesk.outcome.write",
]);

export function evaluatePolicyGate(policyGate: string): boolean {
  return ALPHA_ALLOWED_GATES.has(policyGate);
}
