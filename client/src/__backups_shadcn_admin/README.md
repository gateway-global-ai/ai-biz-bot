# Backups before shadcn-admin work

- **App.tsx.bak** — `client/src/App.tsx` as of first edit (added /platform and /me routes, AdminShell import).
- To restore: `cp App.tsx.bak ../App.tsx`
- To diff: `diff App.tsx.bak ../App.tsx`

No database changes were made; only client routes and new admin UI files.
