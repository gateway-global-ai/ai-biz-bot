# Auth / OTP Flow Verification Guide

This guide shows how to verify the admin and customer OTP authentication flows using `curl`.

> **Note:** Twilio must be configured for SMS delivery. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` in your environment (or via Doppler). If Twilio is not configured, the `/send-otp` endpoint will return `500: SMS service not configured`.

## Prerequisites

- Server running locally: `npm run dev` (default port 5000)
- A phone number seeded in `admin_users` for admin flows
- `DATABASE_URL` pointing to a running Postgres instance

---

## Admin OTP Flow

### 1. Request an OTP code

```bash
curl -s -X POST http://localhost:5000/api/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+15551234567"}' | jq
```

Expected response:
```json
{ "success": true, "message": "Verification code sent", "phone": "4567" }
```

### 2. Verify the OTP code

Replace `123456` with the code received via SMS.

```bash
curl -s -X POST http://localhost:5000/api/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+15551234567", "code": "123456"}' | jq
```

Expected response:
```json
{
  "success": true,
  "token": "<session-token>",
  "user": { "id": "...", "phone": "+15551234567", "name": "...", "role": "admin" }
}
```

### 3. Verify the session

```bash
curl -s http://localhost:5000/api/auth/verify-session \
  -H 'Authorization: Bearer <session-token>' | jq
```

### 4. Logout

```bash
curl -s -X POST http://localhost:5000/api/auth/logout \
  -H 'Authorization: Bearer <session-token>' | jq
```

---

## Customer OTP Flow

### 1. Request an OTP code

```bash
curl -s -X POST http://localhost:5000/api/customer-auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+15559876543"}' | jq
```

### 2. Verify the OTP and get a session

```bash
curl -s -X POST http://localhost:5000/api/customer-auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+15559876543", "code": "654321"}' | jq
```

Expected response:
```json
{
  "success": true,
  "token": "<customer-token>",
  "user": { "id": "...", "phone": "+15559876543", "name": null, "email": null, "plan": "free" }
}
```

### 3. List "My Businesses"

```bash
curl -s http://localhost:5000/api/customer-auth/businesses \
  -H 'Authorization: Bearer <customer-token>' | jq
```

Expected response:
```json
{ "businesses": [ /* array of SiteConfig objects owned by this customer */ ] }
```

---

## Environment Variables

| Variable              | Description                           |
|-----------------------|---------------------------------------|
| `DATABASE_URL`        | Postgres connection string            |
| `TWILIO_ACCOUNT_SID`  | Twilio account SID                    |
| `TWILIO_AUTH_TOKEN`   | Twilio auth token                     |
| `TWILIO_FROM_NUMBER`  | Twilio phone number to send SMS from  |

To mock/skip Twilio during local development, you can temporarily remove the `fromNumber` check in `server/auth.ts` and log the OTP code to the console instead.
