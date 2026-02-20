To implement a high-performance, production-grade search tool for your **Clear Voice** system, we will build a server-side proxy that interfaces with the **Google Places API**. This architecture ensures your API keys remain secure server-side while providing all the specific data points required for the **Google Places UI Kit** (such as Place IDs and rich metadata).

### **1. The Server-Side Handler (Node.js/TypeScript)**

This handler acts as a proxy. When Gemini sends a `tool_call`, your server executes this function, fetches raw data from Google, and returns a structured response that the **Places UI Kit** components can consume directly.

```typescript
// server/tools/placesHandler.ts
import axios from 'axios';

export async function handlePlacesSearch(query: string, location?: string) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  // We use the 'Text Search' endpoint to get rich data + Place IDs
  const response = await axios.post(
    'https://places.googleapis.com/v1/places:searchText',
    {
      textQuery: `${query} ${location || ''}`,
      // CRITICAL: FieldMask ensures we get Place ID and UI Kit-required fields
      // This includes displayName, location (lat/lng), and the vital ID
      includedType: "business" 
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        // Request specific fields needed for the UI Kit's "Place Details" component
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating'
      }
    }
  );

  return response.data.places.map((place: any) => ({
    id: place.id, // The unique Google Place ID
    title: place.displayName.text,
    position: {
      lat: place.location.latitude,
      lng: place.location.longitude
    },
    address: place.formattedAddress,
    rating: place.rating
  }));
}

```

---

### **2. Structuring for the Places UI Kit**

The **Places UI Kit** is designed for "Low-Code" visual integration. Instead of manually building every list item, the UI Kit uses the **Place ID** to automatically fetch and render reviews, photos, and hours at a significantly lower cost ($1 per component vs. $17–$25 for raw API details).

#### **How to utilize the result in your 40% Content Window:**

When your server returns the `place.id` to the client, you can render a specialized UI Kit component:

```tsx
{/* Inside your Content Window message renderer */}
{msg.metadata?.placeId && (
  <div className="p-2 bg-gray-50 rounded-lg">
    {/* The UI Kit "Place Details" component handles the rest */}
    <gmp-place-details 
      place={msg.metadata.placeId} 
      size="compact"
    ></gmp-place-details>
  </div>
)}

```

---

### **3. Why this Architecture is "Clear Voice" Ready**

* **Cost Optimization**: By retrieving the **Place ID** via the server-side proxy and then using the **UI Kit** on the frontend, you bundle photos, reviews, and ratings into a single $1 "bundled" request rather than paying for multiple separate API calls.
* **Latency Management**: The server-side field masking (`X-Goog-FieldMask`) limits the JSON payload size, ensuring the tool response returns to Gemini—and your UI—instantly.
* **Security**: Your `Maps_API_KEY` is never exposed in the browser's Network tab because all initial searches happen on your Hostinger/GCP server.

### **4. Key Lesson: The "Bidi" Tool Response**

When Gemini initiates the `search_local_business` call, your server-side handler must send the result back in the correct **BidiGenerateContentToolResponse** format. This allows the AI to stay in sync with what is appearing in your **Content Window**.

**We need to map the `places.id` to a "Place Picker" component so users can select a specific location directly from your 40% window.**