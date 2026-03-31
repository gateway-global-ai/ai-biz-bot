import React from 'react';
import { BRAND } from '@/config/brand';

export function VoiceVisualizerBars({
  isAISpeaking,
  isRecording,
  isProcessing,
  animationTick,
  volumeLevel,
  aiOutputVolume,
}: {
  isAISpeaking: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  animationTick: number;
  volumeLevel: number;
  aiOutputVolume: number;
}) {
  return (
    <div className="flex items-center gap-0.5 h-8" aria-hidden>
      {[...Array(32)].map((_, i) => {
        const barColor = isAISpeaking
          ? BRAND.greenLight
          : isRecording
          ? BRAND.green
          : isProcessing
          ? BRAND.greenLight
          : '#475569';
        return (
          <div
            key={i}
            className="w-0.5 rounded-full transition-all duration-100"
            style={{
              backgroundColor: barColor,
              height: isAISpeaking
                ? `${Math.min(28, Math.max(2, aiOutputVolume * 60 * (1 + Math.sin((i + animationTick * 1.2) / 1.8))))}px`
                : isRecording
                ? `${Math.min(28, Math.max(2, volumeLevel * 150 * (1 + Math.sin((i + animationTick) / 2))))}px`
                : isProcessing
                ? `${10 + Math.sin((i + animationTick * 0.5) * 0.5) * 8}px`
                : '3px',
              opacity: isAISpeaking || isRecording || isProcessing ? 0.9 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}
