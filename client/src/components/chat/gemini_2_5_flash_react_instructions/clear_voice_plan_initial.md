Clear Voice UI SDK Implementation Plan

Overview

Based on the comprehensive instruction files in client/src/components/chat/gemini_2_5_flash_react_instructions/, we will implement a complete UI SDK that transforms the current ConciergePanel into a professional, enterprise-grade voice AI interface with animations, Google Maps integration, and multimodal tool support.

Architecture Diagram

graph TD
    ConciergePanel[ConciergePanel Component]
    
    subgraph SDK [Clear Voice UI SDK]
        AnimationSDK[Animation Components]
        MapSDK[Maps & Places SDK]
        ToolSDK[Multimodal Tools SDK]
        UtilSDK[Utilities & Hooks]
    end
    
    subgraph Animations [Animation Layer]
        SuccessAnim[SuccessAnimation]
        SkeletonShimmer[MapSkeleton]
        FramerMotion[Framer Motion Configs]
        ConfettiEffect[Confetti Effects]
    end
    
    subgraph Maps [Maps Integration]
        MapTool[MapTool Component]
        PlacePicker[PlacePickerComponent]
        PlaceListener[PlaceChangeListener]
        PlaceDetails[Place Details Display]
    end
    
    subgraph Tools [Multimodal Tools]
        ManualInput[ManualCorrectionBox]
        CatalogView[CatalogDisplay]
        FormRenderer[Dynamic Forms]
        ToolRouter[Tool Type Router]
    end
    
    subgraph Server [Server Integration]
        PlacesHandler[placesHandler.ts]
        ToolExecutor[Tool Execution Logic]
        FunctionDecl[Function Declarations]
    end
    
    ConciergePanel --> SDK
    AnimationSDK --> Animations
    MapSDK --> Maps
    ToolSDK --> Tools
    
    Maps --> Server
    Tools --> Server
    
    FramerMotion -.->|enhances| SuccessAnim
    FramerMotion -.->|enhances| ManualInput
    
    MapTool -->|uses| PlacePicker
    PlacePicker -->|triggers| PlaceListener
    PlaceListener -->|sends to| ToolExecutor

Phase 1: Foundation Setup

1.1 Install Required Dependencies

Add missing packages to support the full feature set:

npm install @vis.gl/react-google-maps @googlemaps/extended-component-library canvas-confetti
npm install --save-dev @types/canvas-confetti

Files to modify:





[package.json](package.json) - Add new dependencies

1.2 Extend Tailwind Configuration

Add custom animations for shimmer effects, spring physics, and micro-interactions:

File: [tailwind.config.ts](tailwind.config.ts)

// Add to theme.extend.keyframes:
keyframes: {
  shimmer: {
    '100%': { transform: 'translateX(100%)' },
  },
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'slide-in-from-bottom': {
    '0%': { transform: 'translateY(100%)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  'scale-in': {
    '0%': { transform: 'scale(0.8)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
}

// Add to theme.extend.animation:
animation: {
  shimmer: 'shimmer 2s infinite',
  'fade-in': 'fade-in 0.5s ease-out',
  'slide-in': 'slide-in-from-bottom 0.3s ease-out',
  'scale-in': 'scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
}

Phase 2: Animation SDK

2.1 Success Animation Component

Create a reusable success animation with spring physics and confetti effects.

File: client/src/components/voice/animations/SuccessAnimation.tsx (NEW)

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface SuccessAnimationProps {
  isVisible: boolean;
  message?: string;
  onComplete: () => void;
  showConfetti?: boolean;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  isVisible,
  message = 'UPDATED SUCCESSFULLY',
  onComplete,
  showConfetti = false
}) => {
  useEffect(() => {
    if (isVisible && showConfetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });
    }
  }, [isVisible, showConfetti]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 rounded-xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2"
          >
            <CheckCircle className="text-green-600 w-10 h-10" />
          </motion.div>
          <span className="text-sm font-bold text-green-700 tracking-tight">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

2.2 Skeleton Shimmer Component

File: client/src/components/voice/animations/MapSkeleton.tsx (NEW)

export const MapSkeleton = () => {
  return (
    <div className="w-full h-full p-4 space-y-4 animate-fade-in">
      {/* Map Placeholder */}
      <div className="w-full h-32 bg-gray-200 rounded-xl overflow-hidden relative">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" 
          style={{ transform: 'skewX(-20deg)' }} 
        />
      </div>

      {/* Title Placeholder */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded-md w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded-md w-1/2 animate-pulse" />
      </div>

      {/* Rating Placeholder */}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-gray-100 rounded-full animate-pulse" />
        ))}
      </div>
    </div>
  );
};

2.3 Animation Utilities Hook

File: client/src/components/voice/animations/useVoiceAnimations.ts (NEW)

import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export const useVoiceAnimations = () => {
  const triggerSuccess = useCallback((options?: confetti.Options) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
      ...options
    });
  }, []);

  const triggerError = useCallback(() => {
    // Shake animation via class manipulation
    const element = document.querySelector('[data-shake-target]');
    if (element) {
      element.classList.add('animate-shake');
      setTimeout(() => element.classList.remove('animate-shake'), 500);
    }
  }, []);

  return { triggerSuccess, triggerError };
};

Phase 3: Maps & Places SDK

3.1 Core MapTool Component

File: client/src/components/voice/maps/MapTool.tsx (NEW)

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface MapToolProps {
  apiKey: string;
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ 
    id: string; 
    position: { lat: number; lng: number }; 
    title: string;
  }>;
}

export const MapTool: React.FC<MapToolProps> = ({ 
  apiKey, 
  center, 
  zoom = 14, 
  markers = [] 
}) => {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-100">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId={process.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'}
          gestureHandling="greedy"
          disableDefaultUI={true}
        >
          {markers.map((marker) => (
            <AdvancedMarker 
              key={marker.id} 
              position={marker.position} 
              title={marker.title}
            >
              <Pin 
                background="#4F46E5" 
                borderColor="#312E81" 
                glyphColor="#EEF2FF" 
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
};

3.2 Place Picker Component

File: client/src/components/voice/maps/PlacePickerComponent.tsx (NEW)

import { useRef, useEffect } from 'react';
import '@googlemaps/extended-component-library/place_picker.js';

interface PlacePickerProps {
  onPlaceChange: (place: any) => void;
  placeholder?: string;
}

export const PlacePickerComponent: React.FC<PlacePickerProps> = ({ 
  onPlaceChange, 
  placeholder = "Search for a location..." 
}) => {
  const pickerRef = useRef<any>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    const handleChange = () => {
      onPlaceChange(picker.value);
    };

    picker.addEventListener('gmpx-placechange', handleChange);
    return () => picker.removeEventListener('gmpx-placechange', handleChange);
  }, [onPlaceChange]);

  return (
    <div className="w-full p-2 bg-white border-b border-gray-200">
      <gmpx-place-picker
        ref={pickerRef}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </div>
  );
};

3.3 Place Change Listener

File: client/src/components/voice/maps/PlaceChangeListener.tsx (NEW)

import { useEffect, useRef } from 'react';
import '@googlemaps/extended-component-library/place_picker.js';

interface PlaceChangeListenerProps {
  onSelection: (placeId: string, name: string) => void;
}

export const PlaceChangeListener: React.FC<PlaceChangeListenerProps> = ({ 
  onSelection 
}) => {
  const pickerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    const handlePlaceChange = (e: any) => {
      const selectedPlace = (picker as any).value;
      
      if (selectedPlace?.id) {
        console.log(`[PlacePicker] Selected: ${selectedPlace.displayName}`);
        onSelection(selectedPlace.id, selectedPlace.displayName);
      }
    };

    picker.addEventListener('gmpx-placechange', handlePlaceChange);
    return () => picker.removeEventListener('gmpx-placechange', handlePlaceChange);
  }, [onSelection]);

  return (
    <div className="w-full bg-gray-50 p-2 rounded-lg border border-gray-200">
      <gmpx-place-picker 
        ref={pickerRef} 
        placeholder="Type to search or correct location..."
        style={{ width: '100%' }}
      />
    </div>
  );
};

Phase 4: Multimodal Tools SDK

4.1 Manual Correction Box

File: client/src/components/voice/tools/ManualCorrectionBox.tsx (NEW)

import { useState, useEffect, useRef } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ManualCorrectionBoxProps {
  label: string;
  fieldType: 'address' | 'business_name' | 'email' | 'phone';
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const ManualCorrectionBox: React.FC<ManualCorrectionBoxProps> = ({
  label,
  fieldType,
  initialValue = '',
  onSubmit,
  onCancel
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSubmit(value);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={16} className="text-blue-600" />
        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeydown}
          placeholder={`Please type the correct ${fieldType.replace('_', ' ')}...`}
          className="w-full h-12 px-4 pr-24 bg-white border-2 border-blue-200 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
        />
        
        <div className="absolute right-1.5 top-1.5 bottom-1.5 flex gap-1">
          <button
            onClick={onCancel}
            className="px-2 hover:bg-gray-100 rounded-md text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => onSubmit(value)}
            className="px-3 bg-blue-600 text-white rounded-md flex items-center gap-1 text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Check size={16} />
            SAVE
          </button>
        </div>
      </div>
      
      <p className="text-[10px] text-blue-400 mt-2 italic">
        Press Enter to confirm or ESC to cancel.
      </p>
    </motion.div>
  );
};

4.2 Tool Router Component

File: client/src/components/voice/tools/ToolRouter.tsx (NEW)

import { MapTool } from '../maps/MapTool';
import { ManualCorrectionBox } from './ManualCorrectionBox';
import { MapSkeleton } from '../animations/MapSkeleton';

interface ToolRouterProps {
  toolType: 'map' | 'input_form' | 'catalog' | 'loading';
  metadata: any;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
}

export const ToolRouter: React.FC<ToolRouterProps> = ({
  toolType,
  metadata,
  onSubmit,
  onCancel
}) => {
  switch (toolType) {
    case 'loading':
      return <MapSkeleton />;
      
    case 'map':
      return (
        <MapTool
          apiKey={process.env.VITE_GOOGLE_MAPS_KEY || ''}
          center={metadata.center}
          zoom={metadata.zoom}
          markers={metadata.markers}
        />
      );
      
    case 'input_form':
      return (
        <ManualCorrectionBox
          label={metadata.label}
          fieldType={metadata.fieldType}
          initialValue={metadata.initialValue}
          onSubmit={onSubmit!}
          onCancel={onCancel!}
        />
      );
      
    case 'catalog':
      return (
        <div className="grid grid-cols-2 gap-2">
          {metadata.items?.slice(0, 4).map((item: any, idx: number) => (
            <div key={idx} className="bg-white p-2 rounded-lg border border-gray-200 text-xs">
              <p className="font-medium text-gray-800">{item.name}</p>
              <p className="text-gray-500">${item.price}</p>
            </div>
          ))}
        </div>
      );
      
    default:
      return null;
  }
};

Phase 5: Server-Side Integration

5.1 Places Handler

File: server/tools/placesHandler.ts (NEW)

import axios from 'axios';

export async function handlePlacesSearch(query: string, location?: string) {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  const response = await axios.post(
    'https://places.googleapis.com/v1/places:searchText',
    {
      textQuery: `${query} ${location || ''}`,
      includedType: "business"
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating'
      }
    }
  );

  return response.data.places.map((place: any) => ({
    id: place.id,
    title: place.displayName.text,
    position: {
      lat: place.location.latitude,
      lng: place.location.longitude
    },
    address: place.formattedAddress,
    rating: place.rating
  }));
}

5.2 Gemini Function Declarations

File: server/config/geminiToolDeclarations.ts (NEW)

export const TOOL_DECLARATIONS = {
  search_local_business: {
    name: "search_local_business",
    description: "Searches for local businesses or places based on user criteria. Use this tool whenever a user asks to see locations, find a business, or view a map.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The type of business or specific name to search for (e.g., 'coffee shops', 'Gateway Global AI office')."
        },
        location: {
          type: "STRING",
          description: "The specific city, neighborhood, or area to search in (e.g., 'Downtown Lafayette', 'near me')."
        },
        zoom_level: {
          type: "NUMBER",
          description: "The suggested map zoom level (1-20). Use 14 for neighborhoods, 18 for specific buildings."
        }
      },
      required: ["query"]
    }
  },
  
  request_manual_input: {
    name: "request_manual_input",
    description: "Displays a text input box in the 40% Content Window for the user to manually type sensitive or unclear information.",
    parameters: {
      type: "OBJECT",
      properties: {
        field_type: {
          type: "STRING",
          enum: ["address", "business_name", "email", "phone"],
          description: "The specific type of information the user needs to correct."
        },
        label: {
          type: "STRING",
          description: "The text label to display above the input box (e.g., 'Please type the address here')."
        }
      },
      required: ["field_type", "label"]
    }
  },
  
  confirm_location_selection: {
    name: "confirm_location_selection",
    description: "Triggered when the user manually selects a business or location from the Place Picker in the UI.",
    parameters: {
      type: "OBJECT",
      properties: {
        place_id: {
          type: "STRING",
          description: "The unique Google Places ID of the selected location."
        },
        confirmed_name: {
          type: "STRING",
          description: "The human-readable name of the selected place."
        },
        selection_type: {
          type: "STRING",
          enum: ["manual_search", "suggested_correction"],
          description: "Whether the user searched for this or picked it from a list of corrections."
        }
      },
      required: ["place_id", "confirmed_name"]
    }
  }
};

5.3 System Instructions

File: server/config/geminiSystemInstructions.ts (NEW)

export const SYSTEM_INSTRUCTIONS = {
  text: `### PERSONA
You are the Gateway Global AI assistant. You are helpful, professional, and efficient.

### OPERATIONAL RULES
1. **Low Confidence Handling**: If you are unsure about a specific address, business name, or location provided by the user via voice, do NOT keep guessing.
2. **Proactive Manual Correction**: Instead of asking the user to repeat themselves a third time, unmistakably trigger the request_manual_input tool.
3. **Voice-Visual Coordination**: When triggering a visual tool in the Content Window, speak a polite transition such as, 'I want to make sure I get that exactly right. I've pulled up a search box in the window below so you can type it in for me.'

### TOOL USAGE
- Use search_local_business when the user asks for locations.
- Use request_manual_input specifically for high-accuracy data entry like addresses, emails, or phone numbers if the audio is unclear.
- Use confirm_location_selection when the user picks a place from the UI.`
};

Phase 6: Update ConciergePanel

6.1 Integrate Tool Router

Modify [client/src/components/chat/ConciergePanel.tsx](client/src/components/chat/ConciergePanel.tsx) to use the new SDK components:

import { ToolRouter } from '../voice/tools/ToolRouter';
import { SuccessAnimation } from '../voice/animations/SuccessAnimation';
import { useVoiceAnimations } from '../voice/animations/useVoiceAnimations';

// Inside the 40% Content Window render:
{messages.map((msg) => {
  const hasTool = msg.metadata?.tool_type;
  
  return (
    <div key={msg.id}>
      {hasTool ? (
        <ToolRouter
          toolType={msg.metadata.tool_type}
          metadata={msg.metadata}
          onSubmit={(value) => handleToolSubmit(msg.id, value)}
          onCancel={() => handleToolCancel(msg.id)}
        />
      ) : (
        // Standard message bubble
      )}
    </div>
  );
})}

Phase 7: Documentation & Examples

7.1 SDK Documentation

File: docs/CLEAR_VOICE_UI_SDK.md (NEW)

Create comprehensive documentation covering:





Component API references



Animation configuration options



Maps integration guide



Tool development guide



Function declaration templates



Testing strategies

7.2 Integration Examples

File: docs/examples/TOOL_INTEGRATION_GUIDE.md (NEW)

Provide step-by-step examples:





Adding a new tool type



Creating custom animations



Extending map markers



Building catalog displays

7.3 Mermaid Integration Flow

File: docs/diagrams/TOOL_INTEGRATION_FLOW.md (NEW)

sequenceDiagram
    participant User
    participant UI as ConciergePanel
    participant Client as GeminiStreamingClient
    participant Server as Node.js Server
    participant Gemini as Gemini 2.5 API
    participant Google as Google Places API
    
    User->>UI: Speaks "Show me coffee shops"
    UI->>Client: Start audio stream
    Client->>Server: WebSocket audio frames
    Server->>Gemini: realtime_input
    Gemini->>Server: tool_call: search_local_business
    Server->>Google: searchText API call
    Google-->>Server: Place IDs + coordinates
    Server->>Client: tool_response with map data
    Client->>UI: Render MapTool in 40% window
    UI->>User: Display map + AI voice response
    
    alt User selects location
        User->>UI: Click place in Place Picker
        UI->>Client: confirm_location_selection
        Client->>Server: tool_response
        Server->>Gemini: Location confirmed
        Gemini->>Server: Acknowledgment response
        Server->>Client: Voice + text response
        Client->>UI: Show success animation
    end

Phase 8: Environment Configuration

8.1 Add Environment Variables

File: .env.template

# Google Maps Configuration
VITE_GOOGLE_MAPS_KEY=your_client_side_key_here
VITE_GOOGLE_MAP_ID=your_map_id_here
GOOGLE_MAPS_API_KEY=your_server_side_key_here

# Feature Flags
VITE_ENABLE_CONFETTI=true
VITE_ENABLE_PLACE_PICKER=true

Success Metrics





All animation components render without performance degradation



Map tools load in <2 seconds with skeleton shimmer



Tool routing correctly handles all metadata types



Server-side Places API integration returns results in <500ms



Success animations trigger on tool completion



Place Picker correctly fires selection events

Testing Strategy





Unit tests for each SDK component



Integration test for tool routing flow



E2E test for complete voice → map → selection flow



Performance benchmarks for animations



Visual regression tests for UI components

