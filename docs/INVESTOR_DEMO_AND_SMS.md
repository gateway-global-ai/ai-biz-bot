# Investor Demo & SMS / OTP

## Investor demo route (`/investor-demo`)

- **SMS-gated:** Viewing the report requires phone verification. On first visit, the user enters a phone number, receives a one-time code by SMS, then enters the code. After verification, a 24-hour session cookie is set and the report is shown. Each verified view is recorded in `investor_report_views` (phone, viewed_at, ip_address, user_agent).
- **Tracking:** Who viewed the report is stored in the database. Admins can list viewers via `GET /api/investor-demo/views` with admin Bearer token (see “Required for SMS” below for Twilio/Doppler so the code is actually sent).

## Why SMS (verification code) might not send

SMS is sent by the **server** when you use:

- **Admin login** (phone OTP) → uses Sovereign SMS Router and requires `TWILIO_MS_PLATFORM_OTP` (and Twilio credentials) from the environment.
- **Customer login** (phone OTP) → uses `getTwilioFromPhoneNumber()` and `sendSms()`; requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and a from number (e.g. `TWILIO_PHONE_NUMBER` or DB telephony config).

Those variables are **injected by Doppler** at runtime. They are not baked into the build.

### Fix: run the server with Doppler

- **Local:**  
  `npm run dev:doppler`  
  or  
  `doppler run -- npm run dev`

- **Production / hosted:**  
  Start the process with Doppler (e.g. `doppler run -- npm start` or `npm run start:doppler`), or configure the same variables in your host’s environment (e.g. Replit Secrets, Railway, etc.).

### Required for SMS

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- **Admin OTP:** `TWILIO_MS_PLATFORM_OTP` (Messaging Service SID for platform 2FA).
- **Customer OTP:** A from number: `TWILIO_PHONE_NUMBER` (or `TWILIO_ACCOUNT_PHONE_NUMBER` / `TWILIO_PHONE_NUMBER_BOT`), or a telephony config in the DB.

Rebuilding the app does **not** load Doppler or change these values; the process must be started with Doppler (or equivalent env) for SMS to work.
