# @gateway/canvas-sdk

**OS surface SDK** for **voice-first, intent-driven, runtime-generated** interfaces — **not** a general-purpose component library for legacy dashboards or pre-intent menu UIs.

Approved building blocks for the **Concierge canvas**, auth handoffs, and public shell entry points that participate in the governed pipeline. Every export must have a row in [`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](../../docs-governance/canonical/UI_COMPONENT_APPROVAL_REGISTRY_V1.md) and YAML under [`registry-yaml/ui-components/approved/`](../../registry-yaml/ui-components/).

**Doctrine:** [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](../../docs-governance/canonical/VOICE_FIRST_INTERFACE_PIPELINE_V1.md) — we govern the **system that creates** future UI; we do not optimize for polishing deprecated interface inventory.

## Architecture (target)

| Layer | Contents |
|-------|----------|
| Primitives | TokenButton, TokenInput, SystemCard *(add with approval)* |
| Composites | CanvasShell, OtpVerificationForm, CommandBar *(add with approval)* |
| Views | Bound to `VIEW_REGISTRY` / syscall payloads |

## v0.1 bootstrap

- `UnifiedOtpForm` — `component_id: auth.unified_otp_form`

Do **not** add exports without updating the registry and YAML.
