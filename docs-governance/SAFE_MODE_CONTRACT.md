# Safe Mode Contract

## Purpose
Define Safe Mode as an enforceable runtime policy, not a conversational style.

## Safe Mode controls

### Tool access
- strict allowlist only
- no undeclared or exploratory tool usage

### Scope
- current context keys only
- no unrelated entity traversal

### Memory
- memory writes disabled by default
- no persistent profile or workflow mutation unless explicitly allowed

### Navigation
- menu-first
- transition to `view` only when the route/view policy declares it valid

### Mutation
- disabled or tightly limited
- high-risk actions require confirmation or promotion

### Search and retrieval
- no broad catalog or tool exploration
- only scoped, policy-approved lookup behavior

### Response posture
- concise
- schema-grounded
- action-bounded
- explicit about what is and is not allowed

### Escalation
- if the request falls outside scope, the agent must:
  - offer allowed next actions
  - escalate to a better-suited agent
  - or refuse cleanly

## Enforcement rule
Safe Mode behavior must be enforced through:
- policy registry
- route/view/action contracts
- tool allowlists
- execution-time validation

It must not rely on “be careful” wording alone.
