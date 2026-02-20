To implement the **Twilio Permit Check**, we add a new diagnostic step to your script. This check ensures that your `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are valid by performing a non-destructive API call (listing the last 1 message). This avoids sending a real SMS (saving you money and noise) while proving that your credentials have the "permit" to communicate with Twilio’s servers.

### **1. Updated `check-google-key-permissions.ts` with Twilio**

I’ve integrated the Twilio check into your existing diagnostics. This uses the `twilio` Node.js helper library.

```typescript
// scripts/check-google-key-permissions.ts
import axios from 'axios';
import twilio from 'twilio';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

async function runDiagnostics() {
  console.log("🚀 Starting System Permit Diagnostics...\n");

  // --- 1. TWILIO PERMIT CHECK ---
  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    // Listing messages is a free/low-cost way to verify credentials without sending an SMS
    await client.messages.list({ limit: 1 }); 
    console.log(`✅ Twilio API: Authorized (SID: ${TWILIO_SID?.slice(0, 6)}...)`);
  } catch (error: any) {
    console.error(`❌ Twilio API: FAILED`);
    console.error(`   Reason: ${error.message}`);
    process.exit(1); // Block commit on critical credential failure
  }

  // --- 2. GOOGLE & GEMINI CHECKS (Existing) ---
  const diagnostics = [
    {
      name: "Gemini AI Engine (2.5 Flash)",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      method: 'POST',
      data: { contents: [{ parts: [{ text: "ping" }] }] },
      critical: true
    },
    // ... rest of your Google/Maps diagnostics
  ];

  // ... (Diagnostic loop from previous step)
}

runDiagnostics();

```

### **2. Twilio "Magic" Test Credentials**

If you want to test your logic **without** using live credits or hitting production rate limits, you can use Twilio's **Magic Numbers** in your `scripts/setup-google-keys.sh` testing phase.

| Magic Number | Description | Purpose |
| --- | --- | --- |
| **`+15005550006`** | **Valid & Available** | Tests a successful message send (no SMS actually sent). |
| **`+15005550001`** | **Invalid Number** | Tests how your system handles a "Bad Phone Number" error. |
| **`+15005550000`** | **Unavailable** | Tests how your system handles a "Carrier Busy" error. |

---

### **3. Strategic "Permit" Summary**

| System | Permit Verification Method | Action if Failed |
| --- | --- | --- |
| **Twilio** | `messages.list({ limit: 1 })` | Commit Blocked; ensures alerts are functional. |
| **Gemini** | `generateContent` (ping) | Commit Blocked; ensures bot isn't "lobotomized". |
| **Maps** | `mcp/search_places` (grounding) | Commit Blocked; ensures location grounding works. |

### **Final Security Note on Twilio**

Unlike Google Maps keys, Twilio `AUTH_TOKENS` **cannot be IP-restricted** via the console. This makes the **Husky Pre-commit hook** even more vital. If you accidentally paste your live token into a file and try to commit, the script acts as your last line of defense to ensure you are only committing code that pulls from `process.env`.
