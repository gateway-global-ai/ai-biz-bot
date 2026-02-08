# Server deployment standard (Gateway Global VPS)

**Single source of truth** for deploying apps on the Gateway Global VPS (72.61.4.44). One subdomain = one app, with a consistent layout and fixed ports.

## Deployment standard

- **One subdomain = one app** (e.g. aibizbot.gatewayglobal.ai → AI Biz Bot app).
- **App root**: `/opt/gatewayglobal/<hostname>`  
  Example: aibizbot.gatewayglobal.ai → `/opt/gatewayglobal/aibizbot.gatewayglobal.ai`
- **Fixed ports**: 3002–3009 (one port per app; assign per subdomain so no overlap).
- **Nginx**: One server block per subdomain; proxy to the app’s port.
- **SSL**: Per-subdomain with Certbot (Let’s Encrypt).

### New deploy (per subdomain)

1. **Create app directory**
   ```bash
   sudo mkdir -p /opt/gatewayglobal/<hostname>
   sudo chown $USER:$USER /opt/gatewayglobal/<hostname>
   cd /opt/gatewayglobal/<hostname>
   ```

2. **Assign a port** (3002–3009) and set in `.env`:
   ```bash
   PORT=3002   # e.g. 3002 for aibizbot.gatewayglobal.ai
   NODE_ENV=production
   WEBHOOK_BASE_URL=https://<hostname>
   DATABASE_URL=...
   # ... rest from .env.example
   ```

3. **Clone, build, run**
   ```bash
   git clone <repo> .   # or rsync
   npm ci --omit=dev
   npm run build
   npm run db:push      # if applicable
   pm2 start dist/index.cjs --name <hostname> -i 1
   pm2 save && pm2 startup
   ```

4. **Nginx**  
   Create `/etc/nginx/sites-available/<hostname>`:
   ```nginx
   server {
       listen 80;
       server_name <hostname>;
       location / {
           proxy_pass http://127.0.0.1:<PORT>;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Enable: `sudo ln -s /etc/nginx/sites-available/<hostname> /etc/nginx/sites-enabled/`  
   Test: `sudo nginx -t && sudo systemctl reload nginx`

5. **SSL**
   ```bash
   sudo certbot --nginx -d <hostname>
   ```

### Port allocation (example)

| Subdomain                    | Port |
|-----------------------------|------|
| aibizbot.gatewayglobal.ai   | 3002 |
| (future apps)               | 3003–3009 |

---

## Legacy cleanup

If you previously ran the app under **/var/www** on **port 5000** with a different Nginx site, retire it as follows.

1. **Stop the old app**
   ```bash
   pm2 stop gateway-ai   # or whatever name was used
   pm2 delete gateway-ai
   pm2 save
   ```

2. **Disable old Nginx site**
   ```bash
   sudo rm /etc/nginx/sites-enabled/aibizbot   # or the old site name
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Optional: remove old app directory**
   ```bash
   # Only after the new deploy at /opt/gatewayglobal/<hostname> is working
   # sudo rm -rf /var/www/gateway-ai
   ```

4. **Re-deploy using the new standard** (see “New deploy” above) at `/opt/gatewayglobal/<hostname>` with a fixed port (3002–3009).

---

## Server and DNS

- **VPS**: 72.61.4.44 (Hostinger, Ubuntu 24.04 LTS, US Boston). SSH: `root@72.61.4.44`.
- **DNS**: Each subdomain (e.g. aibizbot.gatewayglobal.ai) has an A record to 72.61.4.44.
- **Single base URL**: Use `https://<hostname>` for the site and all webhooks (`WEBHOOK_BASE_URL`) so the same code works per subdomain and for future customer domains.

## References

- App env vars: [../.env.example](../.env.example)
- VLM / Twilio webhooks: [../OUTBOUND_CAMPAIGN_WORKFLOW.md](../OUTBOUND_CAMPAIGN_WORKFLOW.md)
- aibizbot-specific notes: [DEPLOY_VPS_AIBIZBOT.md](DEPLOY_VPS_AIBIZBOT.md)
