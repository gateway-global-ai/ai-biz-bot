# Licensing and Activation Flow

## Purpose
Define how a new installation becomes an activated software instance with a valid admin account and runtime configuration.

## Required flow
1. Install OS package
2. Validate required environment and readiness prerequisites
3. Enter or inject product/license key
4. Verify license with governance service
5. Initialize first software admin account
6. Select managed or self-hosted secret mode
7. Configure Gemini server-side credentials
8. Run health and latency checks
9. Boot OS shell
10. Present QR/CTA entry into ClearVoice OS

## Rules
- activation must complete before full runtime access is granted
- failures must land in a governed fallback state, not an undefined shell state
- end users never enter Gemini credentials through the product UI
