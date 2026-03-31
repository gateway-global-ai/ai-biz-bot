# deep-build

Perform a "Nuclear" project rebuild to resolve module resolution and cache issues:

**Port discipline (non-negotiable):** Dev/stage/prod listen on Doppler-configured `PORT` only (dev **3004**, stage **3003**, prod **3002**). If `npm run dev` fails with “port already in use”, free that port via `doppler run -- ./scripts/kill-port.sh` (or stop the PM2 app for that environment). **Do not** start the app on ad-hoc ports (e.g. `PORT=3010`).

1. **Cache Purge**: Execute `rm -rf /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/node_modules/.vite /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/dist /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/.vite-temp`.
2. **Directory Integrity**: Ensure all component imports in `ToolRouter.tsx` use the flat directory structure (no `/forms/` subfolder).
3. **Build Execution**: Run `cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai && npm run build`.
4. **Output Verification**: Confirm the existence of the following production files:
   - `dist/public/index.html` (Client)
   - `dist/index.mjs` (Server).
5. **Auto-Deploy**: If the build succeeds, execute `doppler run -- pm2 restart all --update-env` and verify the processes are online.

If the build fails, do NOT move files. Analyze the `ENOENT` or `UNRESOLVED_IMPORT` error and correct the code imports to match the current physical file location.

# This command will be available in chat with /deep-build
