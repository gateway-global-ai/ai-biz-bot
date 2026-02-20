Designing the "Search Tool" for your **Clear Voice** system requires more than just a function; it requires a **contract** between the AI and your new 40% Content Window. When the model "calls" this tool, it isn't just asking for data—it is triggering a visual event in your interface.

To support your **`@vis.gl/react-google-maps`** implementation, the tool must provide structured data that the React component can consume immediately.

### **1. The "Search Tool" Function Declaration**

This is the JSON schema you send in the `setup` message of your WebSocket connection. Note the use of detailed descriptions; this is how Gemini knows **when** to use the tool.

```json
{
  "name": "search_local_business",
  "description": "Searches for local businesses or places based on user criteria. Use this tool whenever a user asks to see locations, find a business, or view a map.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "query": {
        "type": "STRING",
        "description": "The type of business or specific name to search for (e.g., 'coffee shops', 'Gateway Global AI office')."
      },
      "location": {
        "type": "STRING",
        "description": "The specific city, neighborhood, or area to search in (e.g., 'Downtown Lafayette', 'near me')."
      },
      "zoom_level": {
        "type": "NUMBER",
        "description": "The suggested map zoom level (1-20). Use 14 for neighborhoods, 18 for specific buildings."
      }
    },
    "required": ["query"]
  }
}

```

---

### **2. Structuring the Tool Response**

When your server executes the search (using the Google Places API), the data you send back to Gemini must match the "Expected Interface" of your **MapTool** component.

**The Goal:** The response should be "UI-Ready" so your React component doesn't have to do extra processing.

```json
{
  "result": {
    "areaName": "Downtown Lafayette",
    "center": { "lat": 30.2241, "lng": -92.0198 },
    "zoom": 15,
    "locations": [
      { "id": "loc_1", "title": "Main Office", "position": { "lat": 30.225, "lng": -92.020 } },
      { "id": "loc_2", "title": "Branch A", "position": { "lat": 30.223, "lng": -92.018 } }
    ]
  }
}

```

---

### **3. Strategic "Bidi" (Bi-Directional) Logic**

For your **Clear Voice** system to feel high-end, you need to handle the tool call as a **non-blocking** event.

1. **The User Speaks**: "Can you show me where your offices are in Lafayette?"
2. **The AI Thinks**: It identifies the `search_local_business` intent.
3. **The Voice Acknowledgement**: Gemini starts speaking: *"Sure! Let me pull up those Lafayette locations for you on the map..."*.
4. **The Tool Call**: Simultaneously, the WebSocket sends the `search_local_business` JSON to your server.
5. **The UI Trigger**: Your `ConciergePanel` receives the call and **instantly** updates the 40% Content Window with a "Loading Map..." state before the AI even finishes its sentence.

### **4. Key Lesson: Why "Required" Matters**

Notice in the schema that only `query` is required. This allows the model to be flexible. If the user says "Find coffee," the AI can infer the location from the user's profile or previous messages without the search failing.

**We need to create the "Server-Side Handler" that actually takes this query and calls the Google Places API to get the coordinates?**