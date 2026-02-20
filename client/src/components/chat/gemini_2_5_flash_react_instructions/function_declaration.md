To complete your **Clear Voice** system’s "Place Change" logic, you need to register a specific **Function Declaration** during the initial setup of your Gemini Live API connection.

This declaration defines the "contract" that allows Gemini to understand when the user has manually interacted with your **40% Content Window**.

### **The "confirm_location_selection" Function Declaration**

Add this JSON to your `tools` array in the `setup` message. This tells the model that a tool called `confirm_location_selection` exists and what data to expect from it.

```json
{
  "function_declarations": [
    {
      "name": "confirm_location_selection",
      "description": "Triggered when the user manually selects a business or location from the Place Picker in the UI. Use this to acknowledge the specific destination the user chose.",
      "parameters": {
        "type": "OBJECT",
        "properties": {
          "place_id": {
            "type": "STRING",
            "description": "The unique Google Places ID of the selected location."
          },
          "confirmed_name": {
            "type": "STRING",
            "description": "The human-readable name of the selected place (e.g., 'Downtown Coffee')."
          },
          "selection_type": {
            "type": "STRING",
            "enum": ["manual_search", "suggested_correction"],
            "description": "Whether the user searched for this or picked it from a list of corrections."
          }
        },
        "required": ["place_id", "confirmed_name"]
      }
    }
  ]
}

```

---

### **How the Interaction Works (Step-by-Step)**

1. **UI Event**: The user selects a result in your **Place Picker**.
2. **Client-Side Trigger**: Your `handleSelection` function fires, extracting the `place_id` and `displayName`.
3. **The "Hidden" Injection**: Your client sends a `tool_response` back to Gemini. Crucially, in the **12-2025 preview**, you can set this up so the AI immediately "hears" the data update.
4. **AI Voice Response**: Because the function description says *"Use this to acknowledge the specific destination,"* Gemini will synthesize a natural response like: *"Perfect, I've got you headed to Downtown Coffee now. Would you like the hours of operation?"*.

### **Why this JSON Structure is Optimized**

* **The `enum` for `selection_type**`: This gives the AI context on the user's behavior. If the type is `suggested_correction`, the AI knows it previously made a mistake and can apologize (e.g., *"Oh, thanks for correcting me, I'll update that to..."*).
* **Detailed Descriptions**: The `description` fields are the "instructions" for the model's reasoning engine. A vague description often leads to the AI ignoring the tool or giving a generic "OK" instead of a helpful response.
* **Strict Parameter Masking**: By only requiring the `place_id` and `confirmed_name`, you minimize the data payload sent back to the model, which is essential for maintaining your **<500ms latency** goal.

**next, configure the "System Instructions" so the AI knows how to proactively ask for a "Manual Correction" in the Content Window if it's unsure of an address**