import React from 'react';

const HEIGHT_BUCKET_CLASSES = [
  'h-[2px]',
  'h-[4px]',
  'h-[6px]',
  'h-[8px]',
  'h-[10px]',
  'h-[12px]',
  'h-[14px]',
  'h-[16px]',
  'h-[18px]',
  'h-[20px]',
  'h-[22px]',
  'h-[24px]',
  'h-[26px]',
  'h-[28px]',
] as const;

function clampHeightIndex(heightPx: number): number {
  const clamped = Math.min(28, Math.max(2, heightPx));
  return Math.min(
    HEIGHT_BUCKET_CLASSES.length - 1,
    Math.max(0, Math.round((clamped - 2) / 2)),
  );
}

function barHeightClass(params: {
  isAISpeaking: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  aiOutputVolume: number;
  volumeLevel: number;
  animationTick: number;
  index: number;
}): (typeof HEIGHT_BUCKET_CLASSES)[number] {
  const { isAISpeaking, isRecording, isProcessing, aiOutputVolume, volumeLevel, animationTick, index } = params;

  const px = isAISpeaking
    ? aiOutputVolume * 60 * (1 + Math.sin((index + animationTick * 1.2) / 1.8))
    : isRecording
      ? volumeLevel * 150 * (1 + Math.sin((index + animationTick) / 2))
      : isProcessing
        ? 10 + Math.sin((index + animationTick * 0.5) * 0.5) * 8
        : 3;

  return HEIGHT_BUCKET_CLASSES[clampHeightIndex(px)];
}

function barColorClass(params: {
  isAISpeaking: boolean;
  isRecording: boolean;
  isProcessing: boolean;
}): string {
  const { isAISpeaking, isRecording, isProcessing } = params;
  if (isAISpeaking) return 'voice-visualizer-bar--ai';
  if (isRecording) return 'voice-visualizer-bar--recording';
  if (isProcessing) return 'voice-visualizer-bar--processing';
  return 'voice-visualizer-bar--idle';
}

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
    <div className="voice-visualizer-bars flex items-center gap-0.5 h-8" aria-hidden>
      {[...Array(32)].map((_, i) => {
        const colorClass = barColorClass({ isAISpeaking, isRecording, isProcessing });
        const heightClass = barHeightClass({
          isAISpeaking,
          isRecording,
          isProcessing,
          aiOutputVolume,
          volumeLevel,
          animationTick,
          index: i,
        });
        const opacityClass = isAISpeaking || isRecording || isProcessing ? 'opacity-90' : 'opacity-35';

        return (
          <div
            key={i}
            className={`w-0.5 rounded-full transition-all duration-100 ${heightClass} ${opacityClass} ${colorClass}`}
          />
        );
      })}
    </div>
  );
}
