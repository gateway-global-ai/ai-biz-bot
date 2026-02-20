# First-time setup: Stage and Dev on the VPS

Use this checklist on the server (72.61.4.44) after DNS is pointing **aibizbot-stage** and **aibizbot-dev** to the VPS. Prod (aibizbot) is assumed already deployed; see [DEPLOY_VPS_AIBIZBOT.md](DEPLOY_VPS_AIBIZBOT.md) and [server_deployment.md](server_deployment.md).

---

## Prerequisites

- SSH access to the VPS (e.g. `ssh root@72.61.4.44`).
- Nginx and Certbot installed.
- PM2 installed (`npm i -g pm2` if needed).
- DNS A records: **aibizbot-stage.gatewayglobal.ai** and **aibizbot-dev.gatewayglobal.ai** → 72.61.4.44.

---

## 0. Database (PostgreSQL) on the server

The app expects **PostgreSQL** at **localhost:5432**. Each environment’s `.env` has a `DATABASE_URL`; for dev it is set to something like `postgresql://gateway_ai_user:PASSWORD@localhost:5432/gateway_ai`.

**One-time server actions (run once per VPS or per environment):**

1. Install PostgreSQL and start it (see below).
2. Create the database and user (either run `./script/setup-db-server.sh` from the app repo root, or run the manual `psql` commands below with the password from `.env`).
3. From the app directory, run **`npm run db:push`** to apply schema and migrations.
4. Restart the app (`npm run serve` or `pm2 restart ...`) so it connects to the DB; seed and task scheduler should then run without SASL errors.

**If PostgreSQL is not installed or the database/user do not exist**, run this once on the VPS (adjust user/password to match your `.env`):

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create DB and user (run as postgres; replace YOUR_PASSWORD with the password in DATABASE_URL)
# The password must match the one in .env exactly; if it contains single quotes, escape them by doubling ('').
sudo -u postgres psql -c "CREATE USER gateway_ai_user WITH PASSWORD 'YOUR_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE gateway_ai OWNER gateway_ai_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gateway_ai TO gateway_ai_user;"
```

**Optional:** From the repo root, run **`./script/setup-db-server.sh`** to create the user and database using the password from `.env` (one-time; requires PostgreSQL already installed and `npm install` done so `dotenv` is available).

Then in the app directory run **`npm run db:push`** (or **`npx drizzle-kit push`**) so the schema and migrations are applied. The app loads `.env` at startup via `dotenv`; if you still see `SASL: client password must be a string`, ensure `DATABASE_URL` in `.env` is correct and that the database and user exist.

---

## 1. Stage (aibizbot-stage.gatewayglobal.ai, port 3003)

### 1.1 Create directory and clone (stage branch)

```bash
sudo mkdir -p /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai
sudo chown $USER:$USER /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai
cd /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai
git clone https://github.com/gateway-global-ai/chat-mvp-merge.git .
git checkout stage
```

### 1.2 Environment file

```bash
cp .env.example .env
# Edit .env — set at least:
# PORT=3003
# NODE_ENV=production
# WEBHOOK_BASE_URL=https://aibizbot-stage.gatewayglobal.ai
# DATABASE_URL=... (staging DB or same as prod for simplicity)
# Plus Twilio, API keys, etc. (see .env.example)
```

Optional: use `nano .env` or `vim .env` to edit.

### 1.3 Build and start with PM2

```bash
npm ci --omit=dev
npm run build
npm run db:push
pm2 start dist/index.cjs --name aibizbot-stage.gatewayglobal.ai -i 1
pm2 save
```

### 1.4 Nginx

```bash
sudo nano /etc/nginx/sites-available/aibizbot-stage.gatewayglobal.ai
```

Paste (then save and exit):

```nginx
server {
    listen 80;
    server_name aibizbot-stage.gatewayglobal.ai;
    location / {
        proxy_pass http://127.0.0.1:3003;
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

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/aibizbot-stage.gatewayglobal.ai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 1.5 SSL

```bash
sudo certbot --nginx -d aibizbot-stage.gatewayglobal.ai
```

### 1.6 Later: deploy updates to stage

```bash
cd /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai
./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai
```

---

## 2. Dev (aibizbot-dev.gatewayglobal.ai, port 3004)

### 2.1 Create directory and clone (main or any branch)

```bash
sudo mkdir -p /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
sudo chown $USER:$USER /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
git clone https://github.com/gateway-global-ai/chat-mvp-merge.git .
git checkout main
```

### 2.2 Environment file

```bash
cp .env.example .env
# Edit .env — set at least:
# PORT=3004
# NODE_ENV=development
# WEBHOOK_BASE_URL=https://aibizbot-dev.gatewayglobal.ai
# DATABASE_URL=... (dev DB or shared)
# Plus API keys, etc.
```

### 2.3 Build and start with PM2

```bash
npm ci --omit=dev
npm run build
npm run db:push
pm2 start dist/index.cjs --name aibizbot-dev.gatewayglobal.ai -i 1
pm2 save
```

### 2.4 Nginx

```bash
sudo nano /etc/nginx/sites-available/aibizbot-dev.gatewayglobal.ai
```

Paste (then save and exit):

```nginx
server {
    listen 80;
    server_name aibizbot-dev.gatewayglobal.ai;
    location / {
        proxy_pass http://127.0.0.1:3004;
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

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/aibizbot-dev.gatewayglobal.ai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 2.5 SSL

```bash
sudo certbot --nginx -d aibizbot-dev.gatewayglobal.ai
```

### 2.6 Later: deploy updates to dev

Pull the branch you want (e.g. `main`), then build and restart:

```bash
cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
git fetch origin
git checkout main
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart aibizbot-dev.gatewayglobal.ai
```

---

## 3. Quick reference

| Environment | URL | Port | App path | Deploy script / command |
|-------------|-----|------|----------|-------------------------|
| Prod | https://aibizbot.gatewayglobal.ai | 3002 | /opt/gatewayglobal/aibizbot.gatewayglobal.ai | `./script/deploy-server.sh aibizbot.gatewayglobal.ai` |
| Stage | https://aibizbot-stage.gatewayglobal.ai | 3003 | /opt/gatewayglobal/aibizbot-stage.gatewayglobal.ai | `./script/deploy-staging.sh aibizbot-stage.gatewayglobal.ai` |
| Dev | https://aibizbot-dev.gatewayglobal.ai | 3004 | /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai | Manual pull + build + `pm2 restart aibizbot-dev.gatewayglobal.ai` |

See [ENVIRONMENTS_DEV_STAGE_PROD.md](ENVIRONMENTS_DEV_STAGE_PROD.md) for branch strategy and when to deploy each.
