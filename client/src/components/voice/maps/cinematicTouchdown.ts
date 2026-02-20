import { useMap } from '@vis.gl/react-google-maps';
import { useCallback } from 'react';

/**
 * Cinematic Touchdown Hook for @vis.gl/react-google-maps
 * 
 * Provides a hook that executes a cinematic descent to a target location
 * with coordinated tilt, zoom, and heading. Uses quadratic easing for a
 * "slow-down as you land" effect.
 * 
 * Enhanced version supports narrative triggers at zoom level 15 ("breaking clouds")
 * to coordinate AI speech with camera movement.
 * 
 * @returns Function to trigger touchdown animation with optional narrative callback
 */
export function useCinematicTouchdown() {
  const map = useMap();

  return useCallback((
    target: { lat: number; lng: number },
    durationMs = 5000,
    options?: {
      endZoom?: number; // Optional target zoom (defaults to 18)
      aiHook?: string;
      onTriggerSpeech?: (text: string) => void;
      onComplete?: () => void;
    }
  ) => {
    if (!map) {
      console.warn('[CinematicTouchdown] Map instance not available');
      return;
    }

    // Get current camera state using Google Maps API methods
    const startZoom = map.getZoom() || 4;
    const startTilt = map.getTilt() || 0;
    const startHeading = map.getHeading() || 0;
    const startCenter = map.getCenter();
    
    if (!startCenter) {
      console.warn('[CinematicTouchdown] Map center not available');
      return;
    }
    
    // Final "Touchdown" values
    const endZoom = options?.endZoom ?? 18; // Use provided zoom or default to 18
    const endTilt = 65;    // High tilt for 3D perspective
    const endHeading = 45; // Slight rotation for visual depth
    
    let startTimestamp: number | null = null;
    let hasSpoken = false;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp!) / durationMs, 1);
      
      // Quadratic Easing (Slow-down as you land)
      const ease = 1 - (1 - progress) * (1 - progress);

      const currentLat = startCenter.lat();
      const currentLng = startCenter.lng();
      
      const currentZoom = startZoom + (endZoom - startZoom) * ease;
      
      // TRIGGER SPEECH: Start narrating as we break the 'cloud layer' (zoom 15)
      if (currentZoom > 15 && !hasSpoken && options?.aiHook && options?.onTriggerSpeech) {
        options.onTriggerSpeech(options.aiHook);
        hasSpoken = true;
      }
      
      map.moveCamera({
        center: {
          lat: currentLat + (target.lat - currentLat) * ease,
          lng: currentLng + (target.lng - currentLng) * ease,
        },
        zoom: currentZoom,
        tilt: startTilt + (endTilt - startTilt) * ease,
        heading: startHeading + (endHeading - startHeading) * ease,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        options?.onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [map]);
}
