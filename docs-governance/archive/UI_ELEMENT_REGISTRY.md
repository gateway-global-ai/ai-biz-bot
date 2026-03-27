# UI Element Registry

## Purpose
Define the governed registry that maps semantic UI intent to physical interface targets.

## Core principle
The AI may express semantic intent. It may not directly address raw physical DOM identity.

## Semantic isolation mandate
- The execution plane is forbidden from generating or relying on raw DOM IDs.
- Inbound UI manipulation requests must target semantic aliases, not physical implementation details.
- The UI element registry is the sole source of truth for translating:
  - semantic alias
  - into physical `elementId`
  - plus the route where that element legally exists

## Registry fields
Each UI element entry should define:
- `elementId`
- `semantic_aliases`
- `required_route`

## Orchestration contract
`required_route` is not descriptive metadata only. It is a runtime contract.

The OS must guarantee that:
- if an element belongs to `agent.behavior`
- the control plane must transition to `agent.behavior`
- before applying the highlight/focus state

UI elements do not exist in a vacuum. They are valid only inside the spatial law of routes and views.

## Hallucination and rendering failsafe
If the AI:
- requests a semantic alias that does not exist
- or requests a physical target that is not in the registry
- or the route transition succeeds but the UI element does not mount in time

then:
- the OS must not throw a fatal JavaScript exception
- the visual update must be safely aborted
- the event must be captured in the Flight Recorder as a governed failure or error

The AI is allowed to point. It is not allowed to break the dashboard.

## Day 0 law status
`ui-elements.yaml` must be treated like a first-class law file:

- versioned
- validated
- checksummed
- visible on the Day 0 Mission Control screen
- required for successful boot

The OS must mathematically prove it knows its own interface before allowing governed UI-driving AI behavior.

## Governance rules
- No hardcoded semantic-to-physical UI mapping should be reintroduced outside the registry.
- No inbound highlight/focus tool may bypass the registry lookup path.
- Registry changes should be reviewed like route and policy changes.
