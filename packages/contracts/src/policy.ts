/**
 * @gateway/contracts/policy — PolicyDecision contract re-export.
 *
 * Canonical source: shared/policyDecisionContract.ts
 * All consumers should import from '@gateway/contracts/policy'.
 */
export {
  POLICY_DECISION_CONTRACT_VERSION,
  POLICY_VERDICTS,
  POLICY_DENIAL_REASONS,
  POLICY_ESCALATION_REASONS,
  POLICY_DEGRADE_REASONS,
  PolicyDecisionSchema,
  SwarmRoleContextSchema,
  IntentContextSchema,
  parsePolicyDecision,
  allowDecision,
  denyDecision,
  escalateDecision,
  degradeDecision,
  formatPolicyDecisionSummary,
  type PolicyVerdict,
  type PolicyDenialReason,
  type PolicyEscalationReason,
  type PolicyDegradeReason,
  type PolicyReasonCode,
  type SwarmRoleContext,
  type IntentContext,
  type PolicyDecision,
} from '../../../shared/policyDecisionContract.js';
