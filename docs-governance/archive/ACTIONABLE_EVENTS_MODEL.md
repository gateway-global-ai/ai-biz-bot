# Actionable Events Model

## Purpose
Define how real-world business data surfaces become governed AI-usable events inside the OS.

This model is especially important for:
- QR voice entry points
- business information retrieval
- booking and service workflows
- enterprise multi-location deployments
- grounding- and action-driven customer interactions

## Core distinction

### Primary Actionable Events
Questions or intents the agent should answer directly, route intelligently, or turn into a governed workflow.

Examples:
- hours of operation
- directions / location
- call / phone
- website
- booking / reservations
- reviews and ratings
- price range
- services offered
- accessibility
- parking
- payment options
- photos / gallery

### Secondary Non-Actionable Fields
Rich content that should usually be linked out to websites, PDFs, or external experiences rather than spoken or handled as primary voice actions.

Examples:
- long editorial summaries
- large menu PDFs
- detailed policies / long descriptions
- broad static informational content

## Why this matters to the OS
Actionable events sit between:

- schema anchors
- route/view/action registries
- grounding and retrieval policy
- support / booking / enterprise workflows

The OS should not simply expose raw provider fields. It should classify them into governed event types.

## Event contract
Each actionable event should be describable with:

- `eventId`
- `label`
- `trigger`
- `sourceField`
- `defaultRoute`
- `uiElement`
- `requiredData`
- `priority`
- `privacyNotes`
- `metrics`

## Event routing model
For every event, the OS should determine:

1. what user signal triggered it
2. whether the event is actionable in voice
3. what grounding is required
4. whether the answer fits the communication window
5. whether to:
   - answer directly
   - open a governed view
   - launch a booking flow
   - hand off to support/human
   - link out to a website or external asset

## Grounding alignment
Actionable events must align with `GROUNDING_AND_RETRIEVAL_POLICY.md`.

Examples:
- account-sensitive support event -> grounding importance `100`
- travel request with dates/location -> grounding importance `100`
- hospitality discovery with quality filtering -> strong grounding plus default filters like minimum rating

## UI alignment
Primary actionable events should map into governed UI patterns such as:

- hero buttons
- quick actions
- contextual action chips
- controlled handoff views

Secondary non-actionable fields should more often map into:

- external links
- PDF/document views
- richer web pages
- deferred informational surfaces

## Enterprise concerns
For large deployments, actionable events must also account for:

- multi-tenant isolation
- audit logs
- fallback and escalation
- GDPR / HIPAA / PII handling where relevant
- telemetry for resolution rate, escalations, conversions, and latency

## Governance rule
The OS should classify provider fields into actionable-event semantics before exposing them to agents.

Agents should work with:
- event types
- governed routes
- governed views
- governed actions

not with raw, unbounded field blobs.
