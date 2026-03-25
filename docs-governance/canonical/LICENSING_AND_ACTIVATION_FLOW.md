---
status: canonical
truth_domain: runtime
enforced_by: none
backed_by:
  schema: true
  service: true
  route: true
last_verified: 2026-03-25
---
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

## Platform API (implemented)

Admin (session auth + platform role `admin` | `superadmin` | `owner`):

- `POST /api/v1/admin/platform-licenses/generate` — body: `{ count?, sku, maxActivations?, expiresAt?, label?, metadata? }`. Returns full keys **once**; store in Doppler or a secure vault, not in tickets.
- `GET /api/v1/admin/platform-licenses` — list keys (prefix + SKU + activation counts only).
- `POST /api/v1/admin/platform-licenses/:id/revoke` — revoke a key.

Customer (Bearer customer session):

- `POST /api/customer/platform-licenses/redeem` — body: `{ licenseKey, siteConfigId }`. Applies the license to a site the customer owns; sets `site_configs.platform_license_sku` and `platform_license_activated_at`.

Keys use prefix `gwl_` and are stored hashed (SHA-256), same pattern as `verification_installation_api_keys`.
