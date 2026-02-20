/**
 * TourRunner Component
 *
 * Orchestrates cinematic map tours by parsing YAML tour specifications and
 * coordinating camera movements with AI narration.
 *
 * Spec: client/src/components/chat/gemini_2_5_flash_react_instructions/tour_guide/tour_runner.md
 */

import React, { useEffect, useState } from 'react';
import * as yaml from 'js-yaml';
import { useMap } from '@vis.gl/react-google-maps';
import { useCinematicTouchdown } from '../maps/cinematicTouchdown';
import { startDwellRotation } from '../maps/dwellRotation';

export interface TourSegment {
  name: string;
  coords: { lat: number; lng: number };
  zoom?: number; // Optional target zoom level for this segment
  narrative: string;
  dwell_time?: number; // in seconds
}

export interface TourSpec {
  tour_id?: string;
  total_duration?: string;
  segments: TourSegment[];
}

interface TourRunnerProps {
  yamlUrl?: string;
  tourSpec?: TourSpec; // Alternative: pass spec directly
  onTriggerSpeech: (text: string) => void;
  onTourComplete?: () => void;
  onSegmentChange?: (segment: TourSegment, index: number) => void;
}

export const TourRunner: React.FC<TourRunnerProps> = ({
  yamlUrl,
  tourSpec: providedSpec,
  onTriggerSpeech,
  onTourComplete,
  onSegmentChange,
}) => {
  const map = useMap();
  const cinematicTouchdown = useCinematicTouchdown();
  const [segments, setSegments] = useState<TourSegment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [dwellCleanup, setDwellCleanup] = useState<(() => void) | null>(null);

  // Load and parse YAML spec
  useEffect(() => {
    if (providedSpec) {
      setSegments(providedSpec.segments);
      return;
    }

    if (!yamlUrl) return;

    fetch(yamlUrl)
      .then((res) => res.text())
      .then((text) => {
        const data = yaml.load(text) as TourSpec;
        setSegments(data.segments || []);
      })
      .catch((error) => {
        console.error('[TourRunner] Failed to load tour spec:', error);
      });
  }, [yamlUrl, providedSpec]);

  // Tour sequencer: runs each segment in sequence
  useEffect(() => {
    if (!map || currentIndex === -1 || currentIndex >= segments.length || !isRunning) {
      return;
    }

    const runSegment = async () => {
      const segment = segments[currentIndex];
      onSegmentChange?.(segment, currentIndex);

      // PHASE A: Cinematic Touchdown + Narrative
      await new Promise<void>((resolve) => {
        cinematicTouchdown(
          segment.coords,
          5000, // 5 second descent
          {
            endZoom: segment.zoom, // Use segment zoom if provided
            aiHook: segment.narrative,
            onTriggerSpeech,
            onComplete: () => resolve(),
          }
        );
      });

      // PHASE B: Dwell Time (360-degree rotation)
      const dwellDuration = (segment.dwell_time || 5) * 1000;
      const cleanup = startDwellRotation(map, dwellDuration / 1000);
      setDwellCleanup(cleanup);

      setTimeout(() => {
        cleanup?.();
        setDwellCleanup(null);

        if (currentIndex < segments.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsRunning(false);
          onTourComplete?.();
        }
      }, dwellDuration);
    };

    runSegment();
  }, [currentIndex, map, segments, isRunning, cinematicTouchdown, onTriggerSpeech, onTourComplete, onSegmentChange]);

  // Start tour when segments are loaded
  useEffect(() => {
    if (segments.length > 0 && currentIndex === -1 && !isRunning) {
      setIsRunning(true);
      setCurrentIndex(0);
    }
  }, [segments, currentIndex, isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dwellCleanup?.();
    };
  }, [dwellCleanup]);

  return null; // This is a logic-only component
};
