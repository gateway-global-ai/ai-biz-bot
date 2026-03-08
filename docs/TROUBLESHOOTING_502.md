# 502 Bad Gateway (nginx)

A **502 Bad Gateway** from nginx means nginx is running but **cannot reach the Node.js app** (connection refused, timeout, or upstream not running).

## Quick fix (on the server)

1. **Check if the app is running**
   ```bash
   pm2 list
   ```
   Look for `aibizbot-dev.gatewayglobal.ai` (dev), `aibizbot-stage.gatewayglobal.ai` (stage), or `aibizbot.gatewayglobal.ai` (prod). Status should be **online**.

2. **If the app is stopped or errored, restart it**
   ```bash
   cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
   doppler run -- npm run dev
   ```
   Or with PM2:
   ```bash
   pm2 restart aibizbot-dev.gatewayglobal.ai --update-env
   pm2 save
   ```

3. **Check app logs for startup errors**
   ```bash
   pm2 logs aibizbot-dev.gatewayglobal.ai --lines 100
   ```
   Common causes: missing env (Doppler), database unreachable, or port already in use.

4. **Port in use**
   The app uses **PORT** from Doppler (dev=3004, stage=3003, prod=3002). If the app fails with "port in use":
   ```bash
   npm run kill-port
   doppler run -- npm run dev
   ```
   Or restart via PM2 after fixing the port conflict.

5. **Nginx upstream**
   Nginx must proxy to the same port the app listens on. For dev, that is **3004**. Example:
   ```nginx
   location / {
     proxy_pass http://127.0.0.1:3004;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
   If your nginx config uses a different port, either change nginx to match Doppler `PORT` or set `PORT` in Doppler to match nginx.

## Full redeploy (dev)

If the app keeps crashing or you just deployed code changes:

```bash
cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
./script/deploy-dev.sh aibizbot-dev.gatewayglobal.ai
```

This pulls, runs migrations, builds, and restarts the PM2 app.
