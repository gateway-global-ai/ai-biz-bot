# MVP scope

## In scope for MVP

1. **Chat** — Float / fixed / fullscreen layout + PTT (hold to record, release to send) on customer-facing sites.
2. **Agent manager** — Behavior, knowledge base, and voice config wired to chat.
3. **Automated website builder** — Generates sites with chat/PTT; used in BusinessPage preview and lead flow.
4. **Lead machine** — Outbound + free-websites promotion; deploy and run on prod (aibizbot.gatewayglobal.ai).

## Standard vs paid

- **Standard (free):** Core chat, PTT, agent behavior, website builder, one site per business, basic knowledge base.
- **Paid / marketplace (post-MVP):** Plans ($99, $299), add-ons by category (Restaurants, Real Estate, Professional Services), advanced integrations, usage-based features. Document in ROADMAP and product docs.

## Out of scope for MVP

- Full Account UI (plan selection, billing history) beyond placeholder.
- My Biz Dashboard add-on marketplace.
- Developer UI beyond Twilio telephony / webhooks / debug.
- Google My Business / Workspace / Micro-Learning as first-class flows (keep as integrations; polish post-MVP).

## References

- Deployment: [../deployment/](deployment/)
- Environments (dev/stage/prod): [../deployment/ENVIRONMENTS_DEV_STAGE_PROD.md](../deployment/ENVIRONMENTS_DEV_STAGE_PROD.md)
- Repo structure: root [README.md](../../README.md) and [platform/README.md](../../platform/README.md)
