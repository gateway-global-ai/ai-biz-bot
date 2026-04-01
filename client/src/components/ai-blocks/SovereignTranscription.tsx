/**
 * SovereignTranscription — AI block wrapper
 *
 * Governed wrapper for the transcription canvas view.
 * Renders a live voice-to-text transcript display with
 * speaker attribution and timestamp metadata.
 *
 * SDK reference: shadcn.io/ai/transcription
 * Registry: gateway-sdk-manifest.yaml → ai-transcription
 */

import { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { ICON_SIZES } from '@/config/brand';

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface SovereignTranscriptionProps {
  entries: TranscriptEntry[];
  isListening: boolean;
  className?: string;
}

export function SovereignTranscription({
  entries,
  isListening,
  className,
}: SovereignTranscriptionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className={`flex flex-col h-full bg-white ${className ?? ''}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        {isListening ? (
          <Mic size={ICON_SIZES.canvasControl} className="text-emerald-500 animate-pulse" />
        ) : (
          <MicOff size={ICON_SIZES.canvasControl} className="text-slate-400" />
        )}
        <span className="text-sm font-semibold text-slate-800">Live Transcription</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-8">
            Start speaking to see live transcription...
          </p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-0.5">
              {entry.speaker === 'user' ? 'You' : 'Agent'}
            </span>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                entry.speaker === 'user'
                  ? 'bg-emerald-50 text-slate-800 border border-emerald-200/50'
                  : 'bg-slate-50 text-slate-800 border border-slate-200/50'
              } ${!entry.isFinal ? 'opacity-60' : ''}`}
            >
              {entry.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
