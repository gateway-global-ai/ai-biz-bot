/**
 * @gateway/canvas-sdk — governed UI for canvas/auth/public surfaces.
 * Registry: docs-governance/canonical/UI_COMPONENT_APPROVAL_REGISTRY_V1.md
 */
export const CANVAS_SDK_VERSION = '0.1.0';

/** Approved: auth.unified_otp_form — see registry-yaml/ui-components/approved/auth.unified_otp_form.v1.yaml */
export { UnifiedOtpForm } from '../../../client/src/components/auth/UnifiedOtpForm';

export type { UnifiedOtpSurface, UnifiedOtpFormProps } from '../../../client/src/components/auth/UnifiedOtpForm';
