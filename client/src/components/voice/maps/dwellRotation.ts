/**
 * Dwell Rotation Utility
 *
 * Rotates the camera 360 degrees around the current center during tour "dwell time".
 * Creates a professional "fly-around" effect for panoramic views.
 */

import { Map } from '@vis.gl/react-google-maps';

/**
 * Starts a 360-degree rotation animation around the current map center.
 * @param map - The Google Map instance from useMap()
 * @param durationSeconds - How long the full rotation should take (default 30 seconds)
 * @returns Cleanup function to stop the rotation
 */
export function startDwellRotation(
  map: Map | null,
  durationSeconds: number = 30
): (() => void) | null {
  if (!map) {
    console.warn('[DwellRotation] Map instance not available');
    return null;
  }

  let startTimestamp: number | null = null;
  let animationFrameId: number | null = null;

  const animate = (timestamp: number) => {
    if (!startTimestamp) startTimestamp = timestamp;

    // Calculate progress (0 to 1) based on duration
    const elapsed = (timestamp - startTimestamp) / 1000;
    const progress = (elapsed / durationSeconds) % 1;

    // Update the heading (0 to 360 degrees)
    const currentHeading = map.getHeading() || 0;
    map.moveCamera({
      heading: progress * 360,
    });

    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);

  // Return cleanup function to stop the rotation
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}
