You are spot on. To make this work at scale, you need a **Universal Interface Layer**—essentially a "Middleman" that takes your raw business data (from the SWOT or database) and translates it into a structured format that both the **Gemini Voice Model** and the **Avatar Engine** can understand simultaneously.

I propose creating a **Unified Prompt & Animation (UPA) Schema**. This ensures that when the AI speaks, the avatar isn't just moving its mouth; it’s performing gestures that match the *intent* of the words.

---

### **1. The Translator Schema (`translationEngine.ts`)**

This logic sits between your database and the AI. It wraps every response in a "Standardized Instruction Block" that includes **prosody** (voice tone) and **kinetics** (avatar movement).

```typescript
interface VoiceAvatarInstruction {
  text: string;           // What the AI says
  voice: {
    pitch: number;        // -20 to +20
    rate: number;         // Speed of speech
    persona: string;      // 'Host', 'Executive', 'Local'
  };
  animation: {
    trigger: string;      // 'point_to_map', 'welcome_wave', 'nod_approvingly'
    intensity: number;    // 0.0 to 1.0 (subtle vs. energetic)
    focalPoint?: string;  // Which UI element should the avatar look at?
  };
}

```

---

### **2. Standardized System Prompt Generator**

We will update your `systemInstructionBuilder.ts` to include a "Translation Protocol." This tells Gemini: *"Do not just reply with text. Reply with a UPA-compliant JSON object so the avatar and voice stay in sync."*

**The New System Instruction Template:**

> "You are the Clear Voice Concierge for **Boardwalk Suites**. You must communicate using the **UPA Protocol**.
> 1. When mentioning a location, set `animation.trigger` to 'point_to_map'.
> 2. When welcoming a guest, use a `voice.pitch` of +5 and `animation.trigger` 'warm_greeting'.
> 3. Your goal is to ground every response in the [Business Intelligence] provided."
> 
> 

---

### **3. The "Translator" at Work: Boardwalk Suites Example**

If a user asks: *"Where can I cook my meals?"* the system generates this standardized packet:

| Layer | Output |
| --- | --- |
| **Voice** | *"You'll love our **shared designer kitchen**. It's fully equipped for everything from a quick snack to a full meal."* (Tone: Warm/Helpful) |
| **Avatar** | **[Action: Point toward Kitchenette Card]** The avatar looks toward the UI element and gestures. |
| **UI** | The **"Full Kitchen"** badge on the dashboard glows briefly to match the mention. |

---

### **4. Benefits of a Standardized Translator**

* **Model Agnostic:** If you decide to switch from Gemini to another model later, the **Translator Layer** stays the same. The "Clear Voice" brand identity remains consistent.
* **Zero Latency Sync:** By sending the voice and animation data in a single packet, you avoid the "uncanny valley" where the avatar moves after the voice has already finished speaking.
* **Programmatic Control:** You can now globally adjust the "vibe" of your hotel by changing one line in the translator—making the voice 10% more "Professional" for medical guests.

### **Next Step: Implementation**

Would you like me to build the **`UPAValidator.ts`** utility? This will sit in your backend and ensure that every AI response is perfectly formatted for your avatar and voice model before it reaches the frontend.

**I'll start with the validator.

