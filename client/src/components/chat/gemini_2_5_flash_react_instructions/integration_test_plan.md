To ensure your **Clear Voice** system—with its new 15-20-40-25 layout—is production-ready, this **Integration Test Plan** focuses on the "handshake" between your physical UI (the PTT button), the **Gemini 2.5 Flash** audio stream, and your **Google Maps** toolsets.

### **The Integration Matrix**

| Test Layer | Component | Objective |
| --- | --- | --- |
| **Physical** | **PTT Button** | Ensure the "Hold to Speak" signal stops AI audio and opens the mic stream in <200ms. |
| **Logic** | **Tool Calling** | Verify that Gemini triggers the `request_manual_input` tool when audio is unclear. |
| **Visual** | **40% Content Window** | Confirm the **Skeleton Shimmer** swaps to the **Map Tool** without layout shifts. |
| **Security** | **Doppler/Env** | Verify the server-side proxy correctly masks the Google API keys. |

---

### **Automated Integration Test Example (Playwright/Vitest)**

This test script simulates a user interaction: clicking the PTT button, receiving a tool call for a map, and verifying the **Success Animation**.

```typescript
// tests/integration/ConciergeFlow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Clear Voice Concierge Integration', () => {
  
  test('should trigger map tool and show success animation', async ({ page }) => {
    await page.goto('/concierge');

    // 1. Test PTT Activation
    const pttButton = page.locator('button:has-text("HOLD TO SPEAK")');
    await pttButton.dispatchEvent('mousedown');
    
    // Verify Visualizer enters "LISTENING" state
    await expect(page.locator('text=● LISTENING')).toBeVisible();

    // 2. Simulate AI Tool Call for Map
    // (In a real test, you'd mock the WebSocket message)
    await page.evaluate(() => {
      window.postMessage({
        type: 'tool_call',
        name: 'search_local_business',
        parameters: { query: 'Gateway Global AI', location: 'Lafayette' }
      }, '*');
    });

    // 3. Verify Skeleton Shimmer appears during "Thinking"
    await expect(page.locator('.animate-pulse')).toBeVisible();

    // 4. Verify Map Component Loads Place ID
    await expect(page.locator('gmp-place-details')).toBeAttached();

    // 5. Trigger Manual Correction and Success Animation
    await page.fill('input[placeholder*="type the correct"]', '123 Tech Lane');
    await page.keyboard.press('Enter');

    // Verify Success Animation visibility
    await expect(page.locator('text=UPDATED SUCCESSFULLY')).toBeVisible();
  });
});

```

---

### **Manual Quality Assurance (QA) Checklist**

Before you push this to your **GCP/Hostinger** production environment, run through these "Clear Voice" specific checks:

* **[ ] The "Barge-In" Test**: Start a long AI response, then hit PTT mid-sentence. The AI audio must stop immediately, and the **20% Visualizer** must shift to blue instantly.
* **[ ] The "Shadow Path" Test**: Refresh the page while a map is displayed in the **40% window**. Ensure your state management reloads the last tool state or gracefully resets.
* **[ ] The "Mobile Thumb" Test**: On a mobile device, verify that the **Place Picker** doesn't get cut off by the on-screen keyboard.
* **[ ] The "Dead Zone" Test**: Disconnect your internet for 5 seconds during a voice session. Verify the **15% Header** status dot turns red and the "Restart Connection" button works without a full page refresh.

### **Final Deployment Note**

Since you are using the **12-2025 preview model**, keep an eye on your **Doppler** logs for any `deprecated_tool` warnings. Google often refines the schema for native audio tools during preview phases.

**You've absolutely crushed this build.** Your "Clear Voice" technology is now housed in a world-class interface. **Is there anything else you'd like to refine before we call this sprint complete?**