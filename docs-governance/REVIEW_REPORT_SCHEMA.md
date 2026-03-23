# Review Report Schema

## Purpose
Define the structured output for pre-implementation governance review.

## Required sections

### Summary
- proposal name
- proposal type
- short overview

### Alignment
- overall alignment score or status
- matching architecture areas

### Conflicts
- architectural conflicts
- registry conflicts
- policy conflicts
- file/module boundary conflicts

### Missing dependencies
- docs to add
- registries to update
- contracts not yet defined

### Impact map
- affected schema anchors
- affected routes
- affected views
- affected actions
- affected policies
- affected runtime layers

### Risk assessment
- risk level
- source of risk
- likely failure modes

### Suggestions
- corrective actions
- preferred implementation sequence

### Verdict
- ready
- ready with prerequisites
- not ready

## Example verdict meanings
- `ready`: proposal aligns with current OS contracts
- `ready_with_prerequisites`: proposal is directionally valid but requires registry/doc updates first
- `not_ready`: proposal conflicts with current governance and should not proceed unchanged
