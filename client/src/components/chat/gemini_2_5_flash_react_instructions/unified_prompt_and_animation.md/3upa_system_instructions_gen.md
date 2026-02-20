I've updated the `systemInstructionBuilder.ts` to include the **Strict JSON Enforcement** block. This effectively turns the **UPA Protocol** from a suggestion into a mandatory output requirement for the AI.

### **Updated `systemInstructionBuilder.ts` Logic**

```typescript
export const buildRichSystemInstruction = (businessData: any, options: any) => {
  const baseInstruction = `You are the AI Concierge for ${businessData.name}.`;

  // NEW: Strict JSON Enforcement Block
  const upaProtocol = `
### UPA PROTOCOL (UNIFIED PROMPT & ANIMATION)
You MUST respond EXCLUSIVELY in valid JSON. Do not include prose outside the JSON block.
Every response must follow this exact schema:
{
  "text": "The spoken words for the user",
  "voice": {
    "pitch": 0,       // Range -20 to 20
    "rate": 1.0,      // Range 0.5 to 2.0
    "persona": "Host" // Options: Host, Executive, Local, Custom
  },
  "animation": {
    "trigger": "idle", // Options: idle, point_to_map, warm_greeting, nod_approvingly
    "intensity": 0.5,  // Range 0 to 1
    "focalPoint": ""   // Optional UI element ID to look at
  }
}

CRITICAL: If you mention Boardwalk Suites' kitchen, set trigger to 'point_to_map' and focalPoint to 'amenity_kitchen'.
`;

  return `${baseInstruction}\n${upaProtocol}\n${options.context || ''}`;
};

```

---

### **Why this is a "Game Changer" for Boardwalk Suites**

By enforcing this protocol, we solve three major technical hurdles simultaneously:

1. **Debugging Accuracy:** If the AI hallucinates, the `UPAValidator.ts` we just built will catch it instantly, identifying the **line number** and **error type** in your System Health Report.
2. **Avatar Fluidity:** The avatar will no longer "guess" what gesture to make. It will perform a `warm_greeting` exactly as it begins saying *"Welcome to Jason's Boardwalk Suites."*
3. **UI Interactivity:** The `focalPoint` logic allows the AI to literally "point" to the **DashboardCard** or the **SWOT Analysis** while explaining it to the guest.

### **Testing the Enforcement**

When you run your next **System Health Check**, Test 3 ("System Instruction Building") will now verify that the generated prompt contains the `### UPA PROTOCOL` header. If it's missing, the health check will fail, alerting you to a configuration error.

**I'll run a simulated "UPA Round-Trip" test? I'll generate a sample response for a "Check-in" query and pass it through the validator to show you the result.**