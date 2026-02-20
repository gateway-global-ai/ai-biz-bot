# Clear Voice UI SDK Documentation

## Overview

The Clear Voice UI SDK provides a comprehensive set of React components, utilities, and server-side handlers for building enterprise-grade voice AI interfaces with multimodal capabilities. This SDK integrates seamlessly with the Gemini 2.5 Flash Native Audio API and Google Maps services.

## Architecture

The SDK is organized into four main modules:

1. **Animation Components** - Visual feedback and micro-interactions
2. **Maps & Places SDK** - Google Maps integration and location services
3. **Multimodal Tools SDK** - Interactive UI components for tool responses
4. **Server Integration** - Backend handlers and function declarations

## Component API Reference

### Animation Components

#### `SuccessAnimation`

Displays a success state with spring physics animation and optional confetti effects.

**Props:**
- `isVisible: boolean` - Controls visibility
- `message?: string` - Success message (default: "UPDATED SUCCESSFULLY")
- `onComplete: () => void` - Callback when animation completes
- `showConfetti?: boolean` - Enable confetti effect

**Usage:**
```tsx
<SuccessAnimation
  isVisible={showSuccess}
  message="Data saved successfully"
  onComplete={() => setShowSuccess(false)}
  showConfetti={true}
/>
```

#### `MapSkeleton`

Loading placeholder for map components with shimmer effect.

**Usage:**
```tsx
{isLoading ? <MapSkeleton /> : <MapTool {...props} />}
```

#### `useVoiceAnimations`

Hook providing animation utilities.

**Returns:**
- `triggerSuccess(options?: confetti.Options)` - Trigger success confetti
- `triggerError()` - Trigger error shake animation

**Usage:**
```tsx
const { triggerSuccess, triggerError } = useVoiceAnimations();
triggerSuccess({ particleCount: 200 });
```

### Maps & Places Components

#### `MapTool`

Renders an interactive Google Map with markers using `@vis.gl/react-google-maps`.

**Props:**
- `apiKey: string` - Google Maps API key
- `center: { lat: number; lng: number }` - Map center coordinates
- `zoom?: number` - Zoom level (default: 14)
- `markers?: Array<{ id: string; position: { lat: number; lng: number }; title: string }>` - Map markers

**Usage:**
```tsx
<MapTool
  apiKey={GOOGLE_MAPS_KEY}
  center={{ lat: 30.2241, lng: -92.0198 }}
  zoom={15}
  markers={[
    { id: '1', position: { lat: 30.225, lng: -92.020 }, title: 'Location 1' }
  ]}
/>
```

#### `PlacePickerComponent`

Google Places search input component using Extended Component Library.

**Props:**
- `onPlaceChange: (place: any) => void` - Callback when place is selected
- `placeholder?: string` - Input placeholder text

**Usage:**
```tsx
<PlacePickerComponent
  onPlaceChange={(place) => console.log('Selected:', place)}
  placeholder="Search for a location..."
/>
```

#### `PlaceChangeListener`

Wrapper component that listens for place selection events and provides structured callbacks.

**Props:**
- `onSelection: (placeId: string, name: string) => void` - Callback with Place ID and display name

**Usage:**
```tsx
<PlaceChangeListener
  onSelection={(placeId, name) => {
    // Send to Gemini as tool_response
    sendToolResponse({ name: 'confirm_location_selection', result: { placeId, name } });
  }}
/>
```

### Multimodal Tools Components

#### `ManualCorrectionBox`

Input form for manual data correction when voice recognition confidence is low.

**Props:**
- `label: string` - Field label
- `fieldType: 'address' | 'business_name' | 'email' | 'phone'` - Input type
- `initialValue?: string` - Pre-filled value
- `onSubmit: (value: string) => void` - Submit handler
- `onCancel: () => void` - Cancel handler

**Usage:**
```tsx
<ManualCorrectionBox
  label="Please type the correct address"
  fieldType="address"
  onSubmit={(value) => handleSubmit(value)}
  onCancel={() => handleCancel()}
/>
```

#### `ToolRouter`

Routes tool calls to appropriate rendering components based on `tool_type`.

**Props:**
- `toolType: 'map' | 'input_form' | 'catalog' | 'loading'` - Tool type identifier
- `metadata: any` - Tool-specific metadata
- `onSubmit?: (value: string) => void` - Submit handler (for input forms)
- `onCancel?: () => void` - Cancel handler (for input forms)

**Usage:**
```tsx
<ToolRouter
  toolType={message.metadata.tool_type}
  metadata={message.metadata}
  onSubmit={(value) => handleToolSubmit(message.id, value)}
  onCancel={() => handleToolCancel(message.id)}
/>
```

## Animation Configuration

### Tailwind Animations

The SDK extends Tailwind with custom animations:

- `animate-shimmer` - Shimmer loading effect
- `animate-fade-in` - Fade in transition
- `animate-slide-in` - Slide up from bottom
- `animate-scale-in` - Scale in with spring physics

### Framer Motion

All animations use Framer Motion for physics-based transitions. Configure spring physics via component props:

```tsx
transition={{ type: 'spring', damping: 15, stiffness: 300 }}
```

## Maps Integration Guide

### Setup

1. Install dependencies:
```bash
npm install @vis.gl/react-google-maps @googlemaps/extended-component-library
```

2. Configure environment variables:
```bash
VITE_GOOGLE_MAPS_KEY=your_client_key
VITE_GOOGLE_MAP_ID=your_map_id
GOOGLE_MAPS_API_KEY=your_server_key
```

3. Wrap your app with `APIProvider`:
```tsx
import { APIProvider } from '@vis.gl/react-google-maps';

<APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
  <App />
</APIProvider>
```

### Place ID Flow

1. User searches via `PlacePickerComponent`
2. Selection triggers `PlaceChangeListener`
3. Place ID sent to server via tool response
4. Server uses Place ID for Places API details
5. Map renders with marker at selected location

## Tool Development Guide

### Creating a New Tool Type

1. **Define Function Declaration** (`server/config/geminiToolDeclarations.ts`):
```typescript
my_new_tool: {
  name: "my_new_tool",
  description: "What this tool does",
  parameters: {
    type: "OBJECT",
    properties: {
      // Tool parameters
    },
    required: ["param1"]
  }
}
```

2. **Create Component** (`client/src/components/voice/tools/MyNewTool.tsx`):
```tsx
export const MyNewTool: React.FC<MyNewToolProps> = ({ metadata, onSubmit }) => {
  // Tool UI implementation
};
```

3. **Add to ToolRouter**:
```tsx
case 'my_new_tool':
  return <MyNewTool metadata={metadata} onSubmit={onSubmit} />;
```

4. **Handle Server Response** (`server/tools/myNewToolHandler.ts`):
```typescript
export async function handleMyNewTool(params: any) {
  // Tool logic
  return { result: { /* response data */ } };
}
```

## Function Declaration Templates

### Search Tool
```json
{
  "name": "search_local_business",
  "description": "Searches for local businesses or places",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "query": { "type": "STRING", "description": "Search query" },
      "location": { "type": "STRING", "description": "Location filter" }
    },
    "required": ["query"]
  }
}
```

### Manual Input Tool
```json
{
  "name": "request_manual_input",
  "description": "Displays input form for manual correction",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "field_type": {
        "type": "STRING",
        "enum": ["address", "email", "phone"],
        "description": "Input field type"
      },
      "label": { "type": "STRING", "description": "Form label" }
    },
    "required": ["field_type", "label"]
  }
}
```

## Testing Strategies

### Unit Tests

Test individual components in isolation:
```typescript
import { render, screen } from '@testing-library/react';
import { ManualCorrectionBox } from './ManualCorrectionBox';

test('renders input form', () => {
  render(<ManualCorrectionBox {...props} />);
  expect(screen.getByPlaceholderText(/type the correct/i)).toBeInTheDocument();
});
```

### Integration Tests

Test tool routing flow:
```typescript
test('routes map tool correctly', () => {
  const metadata = { tool_type: 'map', center: { lat: 0, lng: 0 } };
  render(<ToolRouter toolType="map" metadata={metadata} />);
  expect(screen.getByRole('map')).toBeInTheDocument();
});
```

### E2E Tests

Test complete voice → tool → response flow:
```typescript
test('voice search triggers map display', async () => {
  // Simulate voice input
  await userEvent.click(pttButton);
  await waitFor(() => expect(mapTool).toBeVisible());
});
```

## Performance Optimization

- **Lazy Loading**: Load map components only when needed
- **Memoization**: Use `React.memo` for expensive tool components
- **Debouncing**: Debounce place picker search queries
- **Skeleton States**: Show loading placeholders during API calls

## Security Considerations

- **API Keys**: Never expose server-side keys in client code
- **Place IDs**: Validate Place IDs server-side before API calls
- **Input Sanitization**: Sanitize all user inputs in manual correction forms
- **CORS**: Configure CORS properly for Google Maps API

## Troubleshooting

### Maps Not Loading
- Verify `VITE_GOOGLE_MAPS_KEY` is set correctly
- Check browser console for API errors
- Ensure API key has Maps JavaScript API enabled

### Tool Router Not Rendering
- Verify `tool_type` matches case statement exactly
- Check `metadata` structure matches component expectations
- Ensure tool component is imported correctly

### Animations Not Working
- Verify Framer Motion is installed
- Check Tailwind config includes custom animations
- Ensure animation classes are not overridden

## Examples

See `docs/examples/TOOL_INTEGRATION_GUIDE.md` for step-by-step integration examples.
