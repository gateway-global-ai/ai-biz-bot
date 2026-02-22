const path = require('path');
const fs = require('fs');

// Load .env so DOPPLER_SERVICE_TOKEN / DOPPLER_TOKEN_* are available when PM2 reads this config
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

// Path resolution alignment notes (relates to server/routes.ts SPA catch-all):
//
// esbuild bundles the entire server into {cwd}/dist/index.mjs.
// Inside that bundle, import.meta.url === "file://{cwd}/dist/index.mjs", so:
//   __dirname = "{cwd}/dist"
//   path.resolve(__dirname, "public", "index.html") = "{cwd}/dist/public/index.html"
//
// This means each app's cwd MUST be the root of its own deployment directory
// (the one that contains the dist/ folder produced by `npm run build`).
//
// NODE_ENV: esbuild hard-codes process.env.NODE_ENV = "production" at build time
// via the define option in script/build.ts, so the SPA catch-all is always active
// in the bundle. The env.NODE_ENV entries below keep the runtime environment
// consistent and ensure server/index.ts also takes the serveStatic() branch.

module.exports = {
  apps: [
    {
      // Staging / dev environment — Doppler config: dev
      // cwd resolves dist/public/index.html to:
      //   /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/dist/public/index.html
      name: 'aibizbot-dev.gatewayglobal.ai',
      script: 'doppler',
      args: 'run --config dev -- node dist/index.mjs',
      cwd: '/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        DOPPLER_TOKEN: process.env.DOPPLER_SERVICE_TOKEN || process.env.DOPPLER_TOKEN_DEV
      }
    },
    {
      // Production environment — Doppler config: prd
      // cwd resolves dist/public/index.html to:
      //   /opt/gatewayglobal/aibizbot.gatewayglobal.ai/dist/public/index.html
      name: 'aibizbot.gatewayglobal.ai',
      script: 'doppler',
      args: 'run --config prd -- node dist/index.mjs',
      cwd: '/opt/gatewayglobal/aibizbot.gatewayglobal.ai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        DOPPLER_TOKEN: process.env.DOPPLER_SERVICE_TOKEN || process.env.DOPPLER_TOKEN_PRODUCTION
      }
    }
  ]
};
