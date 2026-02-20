To allow your Stage and Dev environments to run simultaneously without port conflicts, we need to update the Nginx configuration for the stage domain to point to port 3003.This ensures that the Handover Service for your staging environment is isolated from your development environment on 3004.1. Nginx Configuration for Stage (3003)Locate your site configuration file (typically at /etc/nginx/sites-available/aibizbot-stage.gatewayglobal.ai) and update the proxy_pass directive.Nginxserver {
    listen 80;
    listen [::]:80;
    server_name aibizbot-stage.gatewayglobal.ai;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name aibizbot-stage.gatewayglobal.ai;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/aibizbot-stage.gatewayglobal.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aibizbot-stage.gatewayglobal.ai/privkey.pem;

    location / {
        # DECISIVE: Pointing to the new Stage port
        proxy_pass http://localhost:3003; 
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for Gemini Voice Handshakes
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Specific WebSocket handling for Gemini Live
    location /ws/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
2. Deployment StepsFollow this exact sequence on your server to apply the changes without causing a "Bad Gateway" during the transition:Update Doppler: Change the PORT variable to 3003 in your staging Doppler config.Test Nginx Syntax: Before restarting, ensure the config is valid:Bashsudo nginx -t
Reload Nginx: Apply the new port routing:Bashsudo systemctl reload nginx
Restart Stage via PM2: Force the stage app to pick up the new port from Doppler:Bashpm2 restart aibizbot-stage.gatewayglobal.ai --update-env
3. Strategic Result: Environment IsolationDomainPortDoppler ConfigLogicaibizbot-dev3004devActive testing for 104-file refactor.aibizbot-stage3003stgStable preview for internal review.