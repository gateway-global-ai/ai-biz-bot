# Pre-Implementation Review API

## Purpose
Define a machine-usable interface for submitting plans/specs to the governance review engine.

## Goal
Allow the OS, internal tools, or coding agents to submit a proposal and receive a structured readiness/conflict report before implementation.

## Example endpoint
`POST /api/governance/review-plan`

## Example request shape
```json
{
  "title": "Add agent behavior controller",
  "proposalType": "feature_plan",
  "content": "Full text of the plan or spec",
  "targetDomain": "agents",
  "affectedFiles": [
    "docs-governance/AGENT_POLICY_REGISTRY.md"
  ]
}
```

## Example response shape
```json
{
  "summary": {},
  "alignment": {},
  "conflicts": [],
  "missingDependencies": [],
  "impactMap": {},
  "riskAssessment": {},
  "suggestions": [],
  "verdict": "ready_with_prerequisites"
}
```

## Rules
- the API must review against the current System Manifest and approved registries
- the API is advisory unless elevated into a blocking gate in workflow automation
- the API must not mutate implementation state directly
