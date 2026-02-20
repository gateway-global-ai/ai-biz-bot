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

module.exports = {
  apps: [
    {
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
      name: 'aibizbot.gatewayglobal.ai',
      script: 'doppler',
      args: 'run --config prd -- node dist/index.mjs',
      cwd: '/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai',
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
