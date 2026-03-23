# Environment Manifest

## Purpose
Define the minimum environment contract for the OS across managed and self-hosted deployments.

## Secret modes

### Managed mode
- Preferred for supported/internal production deployments
- Uses Doppler or equivalent centralized secret backend
- Supports staged environments and rotation discipline

### Portable / self-hosted mode
- Must work with `.env.example`
- Supports Docker env injection, Compose env files, or host environment variables
- Must not require Doppler to complete a base install

## Required variables
- `GEMINI_API_KEY`
- `GEMINI_MODEL_ID`
- `DATABASE_URL`

## Optional variables
- product or license key
- governance API endpoint
- telemetry / observability flags
- secret backend configuration

## Security rules
- Gemini credentials are server-side only
- End users never enter Gemini keys in the runtime UI
- Runtime status pages may expose readiness state, never raw secrets

## Validation
Boot/install validation must fail closed if required variables are missing or unusable.
