# Install Readiness Contract

## Purpose
Define what the OS must verify before it is considered ready to boot into normal runtime operation.

## Required readiness checks
- server process online
- database reachable
- Gemini execution plane can initialize
- policy registry loaded
- prompt registry loaded
- route/view/action registries loaded
- environment contract satisfied
- baseline latency checks within acceptable bounds

## Required fallback behavior
If readiness fails:
- do not enter full runtime mode
- land in a governed fallback shell state
- show actionable status for the installer/admin
- do not expose secrets

## Minimum readiness output
- readiness summary
- failed checks
- remediation hints
- current secret mode
- activation / license status
