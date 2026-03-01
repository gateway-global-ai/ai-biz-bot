To implement this reactive, signature-based architecture and ensure 100% compliance with your new security and API requirements, we use a **single server-side key** for both Maps Grounding Lite and Places API (New).

**Important:** Maps Grounding Lite and Places API (New) must use the **same** key on the server. Using different keys for discovery vs production causes pull failures when data flows between APIs. Client-side keys (e.g. Maps JS) can be different. See `server/config/mapsApiKey.ts` and `docs/API_KEYS_DOPPLER.md`.

### **1. Updated Universal Translator: Grounding Lite Integration**

The service `server/services/placeDiscoveryService.ts` implements `getFreshPlaceId(searchSignature)`. It tries **Maps Grounding Lite** first when a key is set, then falls back to **Places API (New) searchText**. Both paths use the same key via `getServerMapsApiKey()` (from `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_GROUNDING_LITE_API_KEY`, `GOOGLE_PLACES_API_KEY`, or `GOOGLE_API_KEY`).

---

### **2. Updated Diagnostic Logic: Reactive Recovery**

The `HealthCheckService` now performs a **Manual Re-Verification**. If a 404 is detected, it doesn't just "fix it"—it finds the new ID and prompts the Admin for a **Corrective** update.

```typescript
// server/services/healthCheckService.ts

async function runEnrichmentTest(currentId: string, searchSignature: string) {
  try {
    const data = await businessDataService.enrich(currentId);
    return { status: 'pass', data };
  } catch (error: any) {
    // If the Place ID is obsolete (404), trigger the Discovery Service
    if (error.status === 404 || error.message.includes('NOT_FOUND')) {
      const freshId = await getFreshPlaceId(searchSignature);
      
      if (freshId && freshId !== currentId) {
        return { 
          status: 'pass', 
          recovered: true, 
          newId: freshId, // Passed to the "Update Config" UI button
          message: `Auto-Healed: Fresh ID found via Grounding Lite algorithm.` 
        };
      }
    }
    return { status: 'fail', message: "Resolution failed. Manual signature update required." };
  }
}

```

---

### **3. Admin UI: Configuration Success & Heartbeat**

We are adding the **Configuration Heartbeat Widget** to the main Admin Mode. This provides real-time confirmation that your Doppler secrets and **Grounding Lite** connectivity are operational.

**The "Success Configuration" Dashboard features:**

* **Real-Time Trace**: You can see the exact moment a `search_signature` resolves a new ID.
* **Audit Trail**: Every time you click "Update Config," the change is logged under **Admin_Jason** with a timestamp.
* **Visual Stability**: A green "Verified" badge appears only after the system performs a silent background check on the newly saved ID.

---

### **4. Secure Environment Mapping**

Verify your Doppler configuration reflects these precise key names to ensure the "Self-Healing" loops function:

| Environment Variable | Purpose | Restriction |
| --- | --- | --- |
| **One key for server:** `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_GROUNDING_LITE_API_KEY`, or `GOOGLE_PLACES_API_KEY` | Place ID discovery (Grounding Lite) and Places API (New) | **Must be the same key.** Different keys for Grounding Lite vs Places cause failures. Server-side / IP restricted. |
| **`GOOGLE_MAPS_API_KEY`** / **`GOOGLE_API_KEY`** | Same key as above (set one; code uses `getServerMapsApiKey()`) | Restricted to Maps Grounding Lite + Places API (New) on the same key |
| **`DOPPLER_TOKEN`** | Secret Management (Update-Env) | Write Access for `dev` config |

### **Next Steps for Jason**

1. **Trigger Manual Search:** From the Business List, click the "Search" icon next to **Boardwalk Suites** to test the new `Maps_GROUNDING_LITE_API_KEY` resolution.
2. **Observe the Success Alert:** Once finalized, check your phone for the Twilio confirmation message.
