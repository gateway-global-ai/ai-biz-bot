# Clean Room Extraction Report — NovaVerify (1)

**Source:** `_legacy_archive/novaverify (1)/`  
**Extraction Date:** 2026-02-28  
**Protocol:** Clean Room Extraction — read-only audit, documentation only. No merge of routing, config, or dependencies into the active project.

---

## 1. TypeScript Interfaces & Data Schemas

### Step enum (11-step IDV state machine)

```typescript
export enum Step {
  Welcome,
  Hub,
  OTP_Request,
  OTP_Verify,
  MagicLink,
  MagicLink_Sent,
  Biometric,
  ID_Upload,
  ID_Analysis,
  Signature,
  Complete
}
```

**Use:** Foundation for `nova_idv_sessions` DB state and Protocol Level 7 flow ordering.

### VerificationStatus interface

```typescript
export interface VerificationStatus {
  otp: boolean;
  magicLink: boolean;
  biometric: boolean;
  id: boolean;
  signature: boolean;
}
```

**Use:** Maps to IDV protocol completion flags; Level 7 requires all five true.

### Notification interface

```typescript
export interface Notification {
  type: 'sms' | 'email';
  title: string;
  body: string;
  timestamp: string;
}
```

**Use:** OTP/Magic Link delivery payload shape for outbound API.

### UserData interface

```typescript
export interface UserData {
  phone: string;
  email: string;
  idImageUrl: string | null;
  idData: {
    fullName?: string;
    idNumber?: string;
    isVerified?: boolean;
  };
  signatureUrl: string | null;
  verifications: VerificationStatus;
  lastNotification: Notification | null;
}
```

**Use:** Schema foundation for `nova_idv_session` persistence (session_id, business_id, client_phone, protocol_level, otp_verified, magic_link_verified, biometric_verified, id_verified, signature_url, invoice_id, created_at).

---

## 2. Billing / Invoice Structure (ShoppingCart.tsx)

**Component:** Slide-in drawer. Three billing sections — **Software**, **Services**, **Overages**.

### Software (flat fee)

| Item                       | Description                    | Amount  |
|----------------------------|--------------------------------|---------|
| Small Business Router      | — Boardwalk Suites Lafayette   | $49.00  |

### Services (bundle)

| Item                       | Description                    | Amount  |
|----------------------------|--------------------------------|---------|
| AI Communication Bundle    | — ClearVoice AI Bundle (702-555-1212) | $50.00  |

### Overages (metered table)

| Item                        | Rate   | Units | Total   |
|-----------------------------|--------|-------|---------|
| 150 Minutes Voice AI (Phone)| $0.09  | 150   | $13.50  |
| 45 Minutes Voice AI (Web)   | $0.08  | 100   | $8.00   |
| 25 SMS Messages             | $0.05  | 150   | $45.00  |
| 1200 Chat Bot Messages      | $0.03  | 1435  | $4.05   |

**Footer:** Total Charges **$169.55** — "Proceed to Payment" (no handler in prototype).

**Use:** Informs `invoice_template` structure in `nova_sovereign_ruleset_v1.yaml` (sections: Software/Services/Overages; line items with rate, units, total).

---

## 3. UI Blueprint — SignaturePad (Protocol 7 E-Signature)

- **Canvas:** 500×200px, freehand drawing.
- **Props:** `onSave(dataUrl: string)`, `onClear()`.
- **Events:** `mouseDown`/`touchStart` → start path; `mouseMove`/`touchMove` → draw; `mouseUp`/`touchEnd` → `canvas.toDataURL()` and call `onSave`.
- **Styling:** `strokeStyle: '#1e293b'`, `lineWidth: 2.5`, `lineCap: 'round'`. Container: `bg-white border-2 border-dashed border-slate-200 rounded-2xl`. Button: "CLEAR CANVAS".

**Use:** Protocol 7 signature capture UI blueprint; store result as `signature_url` (base64 or uploaded URL).

---

## 4. UI Blueprint — IPhoneSimulation (Biometric + ID Upload)

### Camera usage

- **Biometric step:** `facingMode: 'user'` (front camera). Animated face-scan progress bar; on 100% calls `onAuthorize()`.
- **ID_Upload step:** `facingMode: 'environment'` (rear camera). Document frame overlay (white corners); tap-to-capture exports frame via `canvas.toDataURL('image/jpeg')` and calls `onCapture(base64)`.

### Stream lifecycle

- `getUserMedia({ video: { facingMode } })` when step is Biometric or ID_Upload; on other steps or unmount, `getTracks().forEach(track => track.stop())`.

### Notification state

- Renders SMS or email notification card. For email, "AUTHORIZE NOW" button calls `onAuthorize()` (Magic Link verification).

**Use:** IDV Level 7 biometric and document capture spec; server-side flow must support same step ordering and callbacks.

---

## 5. API / Service — Gemini ID Analysis (geminiService.ts)

### analyzeID(imageBase64: string)

- **Model:** `gemini-3-flash-preview` (legacy name; production must use `process.env.GEMINI_MODEL_ID`).
- **Input:** Base64 image, mimeType `image/jpeg`.
- **Config:** `responseMimeType: "application/json"`, structured schema:

| Field      | Type    | Required | Description |
|-----------|--------|----------|-------------|
| fullName  | STRING | Yes      | —           |
| idNumber  | STRING | No       | —           |
| dob       | STRING | No       | —           |
| expiry    | STRING | No       | —           |
| isVerified| BOOLEAN| Yes      | "True if the ID looks like a real government issued document" |
| summary   | STRING | No       | —           |

- **Error fallback:** `{ fullName: "Unknown", isVerified: false }`.

**Use:** Becomes `gemini_tools.analyze_id` declaration in sovereign YAML; all Gemini calls must be proxied through server (no frontend API key).

### analyzeDocument(imageBase64: string)

- General document suitability; returns 2-sentence summary (plain text). Optional for sovereign ruleset.

---

## 6. Layout & Progress

- **Layout:** Glass card wrapper, header with "NOVA Security" logo, cart button (badge "2"), progress bar `(step / (totalSteps - 1)) * 100`. Footer: "Live Protocol | Node: Alpha-9".
- **Total steps:** 11 (Step enum 0–10).

---

## 7. Security Flags

- **Hardcoded model:** `gemini-3-flash-preview` in geminiService — must be replaced with `process.env.GEMINI_MODEL_ID` for any server-side reimplementation.
- **API key:** Prototype uses `process.env.API_KEY`; production must use server-only secret (e.g. Secret Manager) and never expose to client.

---

## 8. Build Notes

- NovaVerify is a standalone React 19 + Vite SPA; no backend, no DB, no real OTP/email. Extraction is documentation-only.
- Do not merge WebSocket handlers, `useLiveApi`-style hooks, or routing from the archive into active project.
- `idData` in UserData may be extended with `dob`, `expiry` from Gemini schema for sovereign session storage.

---

**Quarry status:** No files were copied from `_legacy_archive/novaverify (1)/` into the active project. This report is the only artifact. Context window secure.
