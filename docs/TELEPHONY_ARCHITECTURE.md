# Gateway Global AI - Telephony Architecture

## Overview

This document describes the complete SMS and Voice communication architecture for Gateway Global AI, including setup processes, health checking, and error debugging.

---

## SMS Communication Flow

### Inbound SMS Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INBOUND SMS FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  Customer Phone                Twilio                    Gateway Global AI
       │                          │                              │
       │   1. Send SMS            │                              │
       │ ─────────────────────────>                              │
       │                          │                              │
       │                          │   2. Webhook POST            │
       │                          │      /webhook/sms            │
       │                          │ ─────────────────────────────>
       │                          │                              │
       │                          │      Request Body:           │
       │                          │      - From: +1234567890     │
       │                          │      - To: +1987654321       │
       │                          │      - Body: "message"       │
       │                          │      - MessageSid: SMxxx     │
       │                          │                              │
       │                          │                              │
       │                          │   3. Process Message         │
       │                          │      ┌─────────────────────┐ │
       │                          │      │ a. Lookup Customer  │ │
       │                          │      │ b. Find Agent       │ │
       │                          │      │ c. Check if Coding  │ │
       │                          │      │    Question         │ │
       │                          │      │ d. Generate AI      │ │
       │                          │      │    Response (Kimi)  │ │
       │                          │      └─────────────────────┘ │
       │                          │                              │
       │                          │   4. TwiML Response          │
       │                          │ <─────────────────────────────
       │                          │                              │
       │   5. Deliver Response    │                              │
       │ <─────────────────────────                              │
       │                          │                              │
       │                          │   6. Status Callback         │
       │                          │      /webhook/sms/status     │
       │                          │ ─────────────────────────────>
       │                          │      (delivery confirmation) │
       │                          │                              │
```

### Outbound SMS Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTBOUND SMS FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Gateway Global AI              Twilio                    Customer Phone
       │                          │                              │
       │   1. Send SMS Request    │                              │
       │      POST /Messages      │                              │
       │ ─────────────────────────>                              │
       │      - To: +1234567890   │                              │
       │      - From: +1987654321 │                              │
       │      - Body: "message"   │                              │
       │      - StatusCallback    │                              │
       │                          │                              │
       │   2. Accepted            │                              │
       │ <─────────────────────────                              │
       │      MessageSid: SMxxx   │                              │
       │                          │                              │
       │                          │   3. Deliver SMS             │
       │                          │ ─────────────────────────────>
       │                          │                              │
       │   4. Status Callback     │                              │
       │      /webhook/sms/status │                              │
       │ <─────────────────────────                              │
       │      Status: delivered   │                              │
       │                          │                              │
```

---

## Voice Communication Flow

### Inbound Phone Call (Twilio Number)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INBOUND VOICE CALL FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Customer Phone                Twilio                    Gateway Global AI
       │                          │                              │
       │   1. Call +17028197789   │                              │
       │ ─────────────────────────>                              │
       │                          │                              │
       │                          │   2. Voice Webhook           │
       │                          │      /webhook/voice/kimi     │
       │                          │ ─────────────────────────────>
       │                          │                              │
       │                          │   3. TwiML with              │
       │                          │      MediaStreams            │
       │                          │ <─────────────────────────────
       │                          │                              │
       │   4. Audio Connected     │                              │
       │ <─────────────────────────                              │
       │                          │                              │
       │                          │   5. WebSocket Stream        │
       │                          │      /ws/voice-stream        │
       │                          │ <═══════════════════════════>
       │                          │      (bidirectional audio)   │
       │                          │                              │
       │   6. Real-time           │   7. Kimi-Audio              │
       │      Conversation        │      Processing              │
       │ <─────────────────────────────────────────────────────── │
       │                          │                              │
       │                          │   8. Status Callback         │
       │                          │      /webhook/voice/status   │
       │                          │ ─────────────────────────────>
       │                          │      (call ended)            │
       │                          │                              │
```

### Browser Voice (WebRTC)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BROWSER VOICE FLOW (WebRTC)                             │
└─────────────────────────────────────────────────────────────────────────────┘

  User Browser                  Gateway Server           AI Processing
       │                              │                        │
       │   1. Connect WebSocket       │                        │
       │      /ws/voice-stream        │                        │
       │ ═════════════════════════════>                        │
       │                              │                        │
       │   2. Session Initialized     │                        │
       │ <═════════════════════════════                        │
       │                              │                        │
       │   3. Send Audio Chunks       │                        │
       │      (PCM/mulaw)             │                        │
       │ ═════════════════════════════>                        │
       │                              │                        │
       │                              │   4. Process with      │
       │                              │      Kimi-Audio        │
       │                              │ ───────────────────────>
       │                              │                        │
       │                              │   5. AI Response       │
       │                              │ <───────────────────────
       │                              │                        │
       │   6. Receive Audio           │                        │
       │      Response                │                        │
       │ <═════════════════════════════                        │
       │                              │                        │
```

---

## Webhook Configuration Architecture

### Configuration Hierarchy (Priority Order)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK CONFIGURATION PRIORITY                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │                    HIGHEST PRIORITY                                    │
  │  ┌─────────────────────────────────────────────────────────────────┐  │
  │  │                     TwiML App                                    │  │
  │  │   If phone number is configured with a TwiML App,               │  │
  │  │   the app's webhook URLs take precedence over everything        │  │
  │  └─────────────────────────────────────────────────────────────────┘  │
  │                              │                                         │
  │                              ▼                                         │
  │  ┌─────────────────────────────────────────────────────────────────┐  │
  │  │                  Messaging Service                               │  │
  │  │   If phone number is in a Messaging Service with                │  │
  │  │   inboundRequestUrl set, that URL is used for SMS              │  │
  │  └─────────────────────────────────────────────────────────────────┘  │
  │                              │                                         │
  │                              ▼                                         │
  │  ┌─────────────────────────────────────────────────────────────────┐  │
  │  │                   Phone Number                                   │  │
  │  │   Direct webhook URLs configured on the phone number           │  │
  │  │   (used as fallback if above are not configured)               │  │
  │  └─────────────────────────────────────────────────────────────────┘  │
  │                    LOWEST PRIORITY                                     │
  └───────────────────────────────────────────────────────────────────────┘
```

### Webhook URLs Reference

| Webhook Type | URL Path | Method | Purpose |
|--------------|----------|--------|---------|
| SMS Inbound | `/webhook/sms` | POST | Receive incoming SMS messages |
| SMS Status | `/webhook/sms/status` | POST | Delivery status callbacks |
| Voice Inbound | `/webhook/voice/kimi` | POST | Answer incoming calls (Kimi-Audio) |
| Voice Fallback | `/webhook/voice` | POST | Fallback voice handler |
| Voice Status | `/webhook/voice/status` | POST | Call status callbacks |
| Voice Gather | `/webhook/voice/gather` | POST | DTMF/speech input results |
| Voice Stream | `/ws/voice-stream` | WebSocket | Real-time audio streaming |

---

## Health Check System

### Health Check Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HEALTH CHECK FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  Admin/System                  Gateway Server               Twilio API
       │                              │                          │
       │   1. Trigger Health Check    │                          │
       │      GET /api/twilio/        │                          │
       │      messaging-services/     │                          │
       │      health                  │                          │
       │ ─────────────────────────────>                          │
       │                              │                          │
       │                              │   2. List Services       │
       │                              │      GET /Services       │
       │                              │ ─────────────────────────>
       │                              │                          │
       │                              │   3. Services List       │
       │                              │ <─────────────────────────
       │                              │                          │
       │                              │   4. For each service:   │
       │                              │      - Check inboundURL  │
       │                              │      - Test webhook      │
       │                              │        reachability      │
       │                              │      - List phone        │
       │                              │        numbers           │
       │                              │                          │
       │   5. Health Report           │                          │
       │ <─────────────────────────────                          │
       │      - Services status       │                          │
       │      - Issues found          │                          │
       │      - Warnings              │                          │
       │                              │                          │

  ┌────────────────────────────────────────────────────────────────────────┐
  │                        SMS HEALTH COMMANDS                              │
  │                                                                         │
  │   Admins can text these commands to any Gateway number:                │
  │                                                                         │
  │   • "health check" - Run full system health check                      │
  │   • "fix webhooks" - Auto-repair all webhook configurations            │
  │   • "repair sms"   - Same as fix webhooks                              │
  │                                                                         │
  └────────────────────────────────────────────────────────────────────────┘
```

### Auto-Fix Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTO-FIX FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  Trigger                       Gateway Server               Twilio API
       │                              │                          │
       │   1. POST /api/twilio/       │                          │
       │      fix-all-webhooks        │                          │
       │ ─────────────────────────────>                          │
       │                              │                          │
       │                              │   2. Get current domain  │
       │                              │      (REPLIT_DEV_DOMAIN) │
       │                              │                          │
       │                              │   3. Update Messaging    │
       │                              │      Services            │
       │                              │      - inboundRequestUrl │
       │                              │      - fallbackUrl       │
       │                              │ ─────────────────────────>
       │                              │                          │
       │                              │   4. Update TwiML Apps   │
       │                              │      - voiceUrl          │
       │                              │      - smsUrl            │
       │                              │      - fallbacks         │
       │                              │ ─────────────────────────>
       │                              │                          │
       │                              │   5. Update Phone        │
       │                              │      Numbers             │
       │                              │      - voiceUrl          │
       │                              │      - smsUrl            │
       │                              │      - statusCallback    │
       │                              │ ─────────────────────────>
       │                              │                          │
       │   6. Fix Report              │                          │
       │ <─────────────────────────────                          │
       │      - X services fixed      │                          │
       │      - Y apps fixed          │                          │
       │      - Z numbers fixed       │                          │
       │                              │                          │
```

---

## Setup Process

### New Phone Number Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEW PHONE NUMBER SETUP                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Customer                      Gateway UI                    Backend/Twilio
       │                              │                              │
       │   1. Select "Add Number"     │                              │
       │ ─────────────────────────────>                              │
       │                              │                              │
       │   2. Show Available          │                              │
       │      Numbers                 │                              │
       │ <─────────────────────────────                              │
       │                              │                              │
       │   3. Choose Number           │                              │
       │ ─────────────────────────────>                              │
       │                              │                              │
       │                              │   4. Purchase Number         │
       │                              │      POST /api/twilio/       │
       │                              │      numbers                 │
       │                              │ ─────────────────────────────>
       │                              │                              │
       │                              │   5. Auto-configure          │
       │                              │      Webhooks                │
       │                              │      ┌─────────────────────┐ │
       │                              │      │ • Set voiceUrl      │ │
       │                              │      │ • Set smsUrl        │ │
       │                              │      │ • Set statusCallback│ │
       │                              │      │ • Add to Messaging  │ │
       │                              │      │   Service           │ │
       │                              │      └─────────────────────┘ │
       │                              │                              │
       │   6. Number Ready            │                              │
       │      (webhooks configured)   │                              │
       │ <─────────────────────────────────────────────────────────── │
       │                              │                              │
```

---

## Error Debugging

### Status Callback Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ERROR DEBUGGING CALLBACKS                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Twilio                        Gateway Server               Database/Logs
       │                              │                          │
       │   SMS Status Callback        │                          │
       │   /webhook/sms/status        │                          │
       │ ─────────────────────────────>                          │
       │   - MessageSid: SMxxx        │                          │
       │   - MessageStatus: failed    │                          │
       │   - ErrorCode: 30007         │                          │
       │   - ErrorMessage: "..."      │                          │
       │                              │                          │
       │                              │   Log Error              │
       │                              │ ─────────────────────────>
       │                              │                          │
       │   Voice Status Callback      │                          │
       │   /webhook/voice/status      │                          │
       │ ─────────────────────────────>                          │
       │   - CallSid: CAxxx           │                          │
       │   - CallStatus: failed       │                          │
       │   - ErrorCode: 11200         │                          │
       │                              │                          │
       │                              │   Log Error              │
       │                              │ ─────────────────────────>
       │                              │                          │

  ┌────────────────────────────────────────────────────────────────────────┐
  │                     COMMON ERROR CODES                                  │
  │                                                                         │
  │   SMS Errors:                                                          │
  │   • 30001 - Queue overflow                                             │
  │   • 30002 - Account suspended                                          │
  │   • 30003 - Unreachable destination                                    │
  │   • 30004 - Message blocked                                            │
  │   • 30005 - Unknown destination                                        │
  │   • 30006 - Landline or unreachable carrier                           │
  │   • 30007 - Carrier violation                                          │
  │   • 30008 - Unknown error                                              │
  │                                                                         │
  │   Voice Errors:                                                        │
  │   • 11200 - HTTP retrieval failure (bad webhook URL)                  │
  │   • 11205 - HTTP connection failure                                    │
  │   • 11206 - HTTP protocol violation                                    │
  │   • 11210 - HTTP timeout                                               │
  │   • 50056 - Webhook returned non-200 or no webhook URL                │
  │                                                                         │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Webhook Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/twilio/fix-all-webhooks` | POST | Fix ALL webhooks (Messaging Services, TwiML Apps, Phone Numbers) |
| `/api/twilio/messaging-services/health` | GET | Health check for all messaging services |
| `/api/twilio/messaging-services/auto-fix` | POST | Fix messaging service webhooks |
| `/api/twilio/twiml-apps` | GET | List all TwiML apps |
| `/api/twilio/twiml-apps/:sid` | PATCH | Update TwiML app webhooks |
| `/api/twilio/twiml-apps/auto-fix` | POST | Fix all TwiML app webhooks |
| `/api/twilio/numbers` | GET | List all phone numbers with configs |

### Diagnostic Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telephony/messages` | GET | Recent message logs from Twilio |
| `/api/telephony/simulate-webhook` | POST | Test webhook locally |
| `/api/twilio/account` | GET | Account info and status |
| `/api/twilio/billing` | GET | Billing and usage info |

---

## Troubleshooting Guide

### SMS Not Working Checklist

1. **Check TwiML App Configuration**
   - Phone number may have TwiML App that overrides Messaging Service
   - Verify TwiML App has correct smsUrl set

2. **Check Messaging Service Configuration**
   - Verify inboundRequestUrl is set to current domain
   - Check useInboundWebhookOnNumber setting

3. **Check Phone Number Configuration**
   - If no TwiML App or Messaging Service, check direct webhook URLs

4. **Run Auto-Fix**
   ```bash
   curl -X POST "https://YOUR_DOMAIN/api/twilio/fix-all-webhooks"
   ```

5. **Check Twilio Alerts**
   - Look for error codes, especially 50056 and 11200

### Voice Not Working Checklist

1. **Check TwiML App voiceUrl**
   - Must point to `/webhook/voice/kimi`

2. **Check WebSocket Connection**
   - Verify `/ws/voice-stream` is accessible

3. **Check Kimi-Audio/Replicate**
   - Verify REPLICATE_API_TOKEN is set
