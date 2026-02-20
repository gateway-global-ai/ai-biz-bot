import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { usePersistentMapTheme } from './usePersistentMapTheme';
import { MAP_IDS } from '../../../config/mapIds';

interface MapToolProps {
  apiKey: string;
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ 
    id: string; 
    position: { lat: number; lng: number }; 
    title: string;
  }>;
  mapId?: string; // Optional: if not provided, uses persistent theme hook
}

export const MapTool: React.FC<MapToolProps> = ({ 
  apiKey, 
  center, 
  zoom = 14, 
  markers = [],
  mapId: providedMapId
}) => {
  // Use persistent theme hook if mapId not explicitly provided
  const { activeMapId } = usePersistentMapTheme();
  const mapId = providedMapId || activeMapId;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-100 relative">
      <APIProvider apiKey={apiKey}>
        <AnimatePresence mode="wait">
          <motion.div
            key={mapId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <Map
              defaultCenter={center}
              defaultZoom={zoom}
              mapId={mapId}
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
          </motion.div>
        </AnimatePresence>
      </APIProvider>
    </div>
  );
};
