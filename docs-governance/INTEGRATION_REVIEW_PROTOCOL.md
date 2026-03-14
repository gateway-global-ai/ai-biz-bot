# Integration Review Protocol

## Purpose
Define how external APIs, YAML specs, and integration surfaces are reviewed before the OS accepts them as governed tools or views.

## Core principle
The platform should not hand-build every integration blindly and then declare it complete. It should analyze the external specification, propose the operating model, and let humans approve or reject the result.

## Inputs
- OpenAPI spec
- YAML file
- API docs
- endpoint list
- field maps

## Required review outputs

### 1. Entity mapping
- map external concepts to current schema anchors or domain concepts

### 2. Field classification
- required fields
- default fields
- optional fields
- validation constraints
- high-risk or sensitive fields

### 3. Grounding policy recommendation
- recommended `groundingImportance`
- recommended `filterTransparency`
- recommended `persistence`
- required/default/optional filters

### 4. View recommendation
- suggested governed views
- detailed vs summary view guidance
- whether booleans/flags unlock deeper data worth exposing

### 5. Tool recommendation
- which actions should be exposed as governed tools
- what health checks are required
- what result objects should return

### 5a. Actionable event classification
- which provider fields become primary actionable events
- which fields remain secondary non-actionable fields
- what should be answered in voice vs routed to UI/link/handoff

### 6. Health and reliability assessment
- auth readiness
- latency concerns
- schema mismatch risks
- likely fallback modes

## Approval workflow
1. Analyze external spec
2. Produce structured review output
3. Present recommended mapping and governed interface
4. Human accepts, adjusts, or rejects
5. Only accepted definitions proceed into registries/runtime

## Rule
External integrations should be brought into the OS through governed review and approval, not directly through custom-coded assumptions.
