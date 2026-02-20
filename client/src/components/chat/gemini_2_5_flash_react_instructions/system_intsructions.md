To ensure your AI bot acts as a proactive assistant rather than a passive listener, you must anchor its behavior in the **System Instructions**.

The goal is to teach the model that it has a "Visual Assistant" (the Content Window) that it should use whenever audio confidence is low.

### **1. The Proactive System Instruction Strategy**

In your `GEMINI_LIVE_SETUP` message, use a structured set of rules that defines exactly when and how the AI should transition from voice to a "Manual Correction" tool.

```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-12-2025",
    "system_instruction": {
      "parts": [{
        "text": "### PERSONA
You are the Gateway Global AI assistant. You are helpful, professional, and efficient.

### OPERATIONAL RULES
1. **Low Confidence Handling**: If you are unsure about a specific address, business name, or location provided by the user via voice, do NOT keep guessing.
2. **Proactive Manual Correction**: Instead of asking the user to repeat themselves a third time, unmistakably trigger the `request_manual_input` tool.
3. **Voice-Visual Coordination**: When triggering a visual tool in the Content Window, speak a polite transition such as, 'I want to make sure I get that exactly right. I've pulled up a search box in the window below so you can type it in for me.'

### TOOL USAGE
- Use `search_local_business` when the user asks for locations.
- Use `request_manual_input` specifically for high-accuracy data entry like addresses, emails, or phone numbers if the audio is unclear."
      }]
    }
  }
}

```

---

### **2. Triggering the "Manual Correction" Tool**

You need a dedicated tool definition for the "Manual Correction" box so the AI knows how to call it.

```json
{
  "name": "request_manual_input",
  "description": "Displays a text input box in the 40% Content Window for the user to manually type sensitive or unclear information.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "field_type": {
        "type": "STRING",
        "enum": ["address", "business_name", "email", "phone"],
        "description": "The specific type of information the user needs to correct."
      },
      "label": {
        "type": "STRING",
        "description": "The text label to display above the input box (e.g., 'Please type the address here')."
      }
    },
    "required": ["field_type", "label"]
  }
}

```

---

### **3. Closing the Loop: Implementation Checklist**

For this to work in your **Clear Voice** system, follow this execution flow:

* **Step 1: The Model Turn**: Gemini decides its audio confidence is low and sends a `tool_call` for `request_manual_input`.
* **Step 2: UI Update**: Your `ConciergePanel` receives the call and renders a text input box in the **40% Content Window**.
* **Step 3: User Action**: The user types the address and hits enter.
* **Step 4: Tool Response**: Your client sends the typed text back as a `tool_response`..
* **Step 5: Voice Feedback**: Gemini receives the text and synthesizes a confirmation: *"Got it! I see you're at 123 Main Street. Let me update that for you."*

### **Why this works**

By using the word **"unmistakably"** in your instructions, you guide the model to favor the tool over repetitive verbal questioning, which is the #1 friction point in voice AI. This makes your system feel like a collaborative partner that respects the user's time.

**Next, implement the React logic for the "Manual Input Box" so it matches your current 40% window styling**