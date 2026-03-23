---
name: sovereign-devops-sentinel
description: Umbrella — Doppler, GitHub secrets bridge, environments, migrations, permits, and zero-drift CI discipline.
---

# Sovereign DevOps Sentinel (Umbrella)

Use this skill when work touches **secrets**, **env files**, **deploy scripts**, **GitHub Actions**, **Doppler**, **migrations**, or **API permit verification**.

## When to use

- Changing `.env.example`, `ecosystem` config, deploy scripts, or infrastructure-as-code.
- Running or extending **permit checks** / key diagnostics.

## Deep skills

| Skill | Focus |
|-------|--------|
| [`sovereign-ai-devops`](../sovereign-ai-devops/SKILL.md) | Doppler–GitHub bridge, zero drift |
| [`environment-management`](../environment-management/SKILL.md) | Dev/stage/prod ports and Doppler |
| [`health-diagnostics`](../health-diagnostics/SKILL.md) / [`SKILL.md` in `.cursor/rules`](../../rules/SKILL.md) | Permit / three-key checks |

## Cursor rules

- [`.cursor/rules/github-doppler-bridge.mdc`](../../rules/github-doppler-bridge.mdc)
- [`.cursor/rules/doppler-cli.mdc`](../../rules/doppler-cli.mdc)
- [`.cursor/rules/env-example-signature.mdc`](../../rules/env-example-signature.mdc)
- [`.cursor/rules/db-migrations.mdc`](../../rules/db-migrations.mdc)
- [`.cursor/rules/api-lockdown.mdc`](../../rules/api-lockdown.mdc)

## Conventions

- Prefer `doppler run --` for scripts that need secrets.
- New routes: add to permit-check script per root `.cursorrules`.
