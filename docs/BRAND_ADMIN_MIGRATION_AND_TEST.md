# Brand Admin — Database Migration & Visual Test

Follow **environment-management** (Dev = port 3004, Doppler config `dev`, PM2 app `aibizbot-dev.gatewayglobal.ai`) and **api-lockdown** (secrets from Doppler; `GEMINI_MODEL_ID` only).

## Step 1: Apply the schema to Postgres

Secrets (e.g. `DATABASE_URL`) must come from Doppler. Never rely on `.env` for secrets; use `doppler run --` for any command that needs them.

### Generate migration (optional)

```bash
doppler run -- npx drizzle-kit generate
```

### Push schema to the database (required)

```bash
doppler run -- npx drizzle-kit push
```

When prompted:

- **"Is associations table created or renamed from another table?"**  
  Choose **"+ associations create table"** (first option) and press Enter.

That will:

- Create the `associations` table
- Add `association_id` to `customers` and `idx_customers_association_id`
- Add `legal_name_confirmed`, `legal_name_confirmed_at`, and `association_id` to `a2p_brands`

---

## Step 2: Run the app and test the UI

Per **environment-management**: Dev runs on **port 3004**. If the PM2 app is already running, stop it first so the port is free:

```bash
pm2 list
pm2 stop aibizbot-dev.gatewayglobal.ai   # if dev is running under PM2
doppler run -- npm run dev
```

Open: **http://localhost:3004/brand-admin**

### Quick checks

1. **Pre-flight guard**  
   Use a bad EIN (e.g. `123456789` without hyphen). Run pre-flight → EIN error → "Submit to Twilio" stays disabled.

2. **Sovereign UI**  
   In the iPhone preview: no "Pidea AI"; sender name is your company; real estate listing link cards show when industry is real estate.

3. **Legal name gate**  
   Go to "Confirm legal name" → open the modal.  
   - Name without LLC/Inc. → suffix warning.  
   - "I Confirm — Proceed to TrustHub" only enabled after the checkbox.

---

## Next (Phase 2)

- Compliance indicator layer (red/yellow/green for SMS length and spam words)
- Google Places auto-detect for industry
