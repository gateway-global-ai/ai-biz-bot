# Live Adapter Testing

## Purpose
Define the governance rules for testing the live execution-plane adapter so vendor-specific payloads can be exercised safely without weakening the control-plane boundary.

## Adapter boundary mandate
- The Control Plane is forbidden from parsing or understanding vendor-specific schemas directly.
- This includes:
  - Google-specific `functionCall` nesting
  - provider-specific transport envelopes
  - raw provider message dialects
- The live adapter is solely responsible for:
  - parsing provider-native payloads
  - normalizing them
  - emitting only governed `GeminiIncomingAction` contracts upward

The Action Registry, Shared Canvas, routes, views, and UI must remain ignorant of provider dialect details.

## Injection contract
The live adapter testing harness may return exactly three verdicts:

### `ACCEPTED`
Definition:
- the raw provider payload was successfully parsed
- the tool/function call was recognized
- it was normalized into a governed `GeminiIncomingAction`
- and it was handed to the Control Plane

Important:
- `ACCEPTED` does **not** mean the OS executed the action
- the Action Registry may still block it later based on policy, which is correct

### `DROPPED`
Definition:
- the payload contained an unknown, hallucinated, malformed-tool, or unsupported function name
- the adapter safely neutralized it before it reached the Control Plane

This is a successful safety behavior, not a system failure.

### `ERROR`
Definition:
- the payload was malformed JSON
- or structurally invalid in a way that prevented safe parsing

The adapter must fail safely and must not crash the shell or corrupt the session boundary.

## Hallucination failsafe requirement
Every future live adapter change must be tested against hallucinated or malicious tool payloads, for example:
- `delete_all_user_data`
- malformed argument shapes
- structurally broken JSON

The OS must prove that:
- garbage input is ignored or dropped safely
- no fatal JavaScript exception escapes into the shell
- the Control Plane never receives unnormalized provider garbage

## Test harness rule
The raw injection harness exists to test the adapter boundary, not to bypass it.

Allowed uses:
- inject synthetic provider messages
- validate adapter parsing
- validate ACCEPTED / DROPPED / ERROR outcomes
- validate that the Flight Recorder and Inspector reflect the results correctly

Forbidden uses:
- bypassing the adapter to call control-plane internals directly
- using raw provider payloads as application truth above the adapter layer

## Governance rule
- Any new inbound tool or provider message type must be tested through the adapter harness before approval.
- No future developer may “fix” a DROPPED hallucinated payload by allowing raw provider JSON to leak into the Control Plane.
