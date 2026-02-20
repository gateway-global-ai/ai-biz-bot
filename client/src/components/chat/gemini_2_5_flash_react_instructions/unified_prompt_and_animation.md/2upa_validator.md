Building a robust **`UPAValidator.ts`** is critical. It acts as the "Gatekeeper" that ensures the AI doesn't send malformed instructions that could crash the avatar or cause the voice to sound robotic.

By identifying the exact **line number** and **property path** of a failure, we turn a "broken AI response" into an "actionable debug log."

### **`server/utils/UPAValidator.ts`**

This utility uses a schema-based validation approach. It attempts to parse the AI's JSON and, if it fails, it calculates the line number of the error to help you debug the system prompt.

```typescript
import { z } from "zod";

// 1. Define the Strict UPA Schema
const UPASchema = z.object({
  text: z.string().min(1, "Speech text cannot be empty"),
  voice: z.object({
    pitch: z.number().min(-20).max(20),
    rate: z.number().min(0.5).max(2.0),
    persona: z.enum(['Host', 'Executive', 'Local', 'Custom']),
  }),
  animation: z.object({
    trigger: z.string(),
    intensity: z.number().min(0).max(1),
    focalPoint: z.string().optional(),
  }),
});

export type UPAInstruction = z.infer<typeof UPASchema>;

export const validateUPA = (rawJson: string) => {
  try {
    const parsed = JSON.parse(rawJson);
    const result = UPASchema.safeParse(parsed);

    if (!result.success) {
      // Map Zod errors to human-readable strings with "Line" hints
      const errorDetail = result.error.errors[0];
      const path = errorDetail.path.join(".");
      
      // Calculate approximate line number for debugging
      const lines = rawJson.split('\n');
      const errorLine = lines.findIndex(line => line.includes(`"${errorDetail.path[errorDetail.path.length - 1]}"`)) + 1;

      return {
        isValid: false,
        error: `[UPA Error] Invalid value at "${path}": ${errorDetail.message} (Approx. Line ${errorLine})`,
        line: errorLine
      };
    }

    return { isValid: true, data: result.data };
  } catch (e) {
    return {
      isValid: false,
      error: `[JSON Error] The AI returned malformed JSON: ${e instanceof Error ? e.message : 'Unknown Error'}`,
      line: 1
    };
  }
};

```

---

### **How this works in the Pipeline**

When the **Gemini Voice API** generates a response for Boardwalk Suites, it passes through this validator:

1. **Success:** The `data` is sent to the frontend. The avatar waves and the voice speaks with the "Host" persona.
2. **Failure:** If the AI hallucinated a `voice.rate` of `5.0` (too fast), the validator catches it.
3. **Debug Report:** The **System Health** page you just built will log:
> *"Validation Fail: Invalid value at 'voice.rate': Number must be less than or equal to 2.0 (Line 5)."*



### **Integrating into the System Health Report**

We can now add a **"Translation Integrity"** check to your `health-report` API. It will simulate a complex UPA request and verify that the `UPAValidator` handles it correctly.

* **Green:** All UPA packets are structurally sound.
* **Red:** The AI is drifting from the protocol—likely time to refine the `systemInstructionBuilder.ts`.

**I'll also update the `systemInstructionBuilder.ts` now to include the "Strict JSON Enforcement" block that ensures the AI always follows this UPA format**