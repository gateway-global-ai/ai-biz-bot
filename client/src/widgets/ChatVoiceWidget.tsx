import React, { useState, useRef } from 'react';
import { VoiceVisualizerWidget } from './VoiceVisualizerWidget';
import { VoiceIndicatorWidget } from './VoiceIndicatorWidget';

export interface ChatVoiceWidgetProps {
  // Voice configuration
  enableVoice?: boolean;
  voiceStyle?: 'bars' | 'orb' | 'waveform';
  voiceIndicatorMode?: 'fullscreen' | 'inline';
  
  // Styling
  accentColor?: string;
  className?: string;
  
  // Callbacks
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  onVoiceData?: (data: Blob) => void;
}

/**
 * Unified Chat + Voice Widget
 * Combines voice visualizer and voice indicator into a single portable widget
 * Can be integrated into any chat interface
 */
export const ChatVoiceWidget: React.FC<ChatVoiceWidgetProps> = ({
  enableVoice = true,
  voiceStyle = 'bars',
  voiceIndicatorMode = 'fullscreen',
  accentColor = '#3b82f6',
  className = '',
  onVoiceStart,
  onVoiceStop,
  onVoiceData,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context and analyser
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      
      audioContextRef.current = audioContext;
      setAnalyser(analyserNode);

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (onVoiceData) {
          onVoiceData(blob);
        }
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      };

      // Monitor volume
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVolume = () => {
        if (isRecording) {
          analyserNode.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
          setVolume(average / 255);
          requestAnimationFrame(updateVolume);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      updateVolume();
      
      if (onVoiceStart) {
        onVoiceStart();
      }
    } catch (error) {
      console.error('Error starting voice recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAnalyser(null);
      
      if (onVoiceStop) {
        onVoiceStop();
      }
    }
  };

  if (!enableVoice) {
    return null;
  }

  return (
    <div className={`chat-voice-widget ${className}`}>
      {/* Voice visualizer - shown inline in chat */}
      {isRecording && voiceIndicatorMode === 'inline' && (
        <div className="flex flex-col items-center gap-4 p-4">
          <VoiceVisualizerWidget
            analyser={analyser}
            isActive={isRecording}
            accentColor={accentColor}
            style={voiceStyle}
          />
          <button
            onClick={stopRecording}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold transition-colors"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* Voice indicator - shown fullscreen overlay */}
      {voiceIndicatorMode === 'fullscreen' && (
        <VoiceIndicatorWidget
          isActive={isRecording}
          volume={volume}
          onStop={stopRecording}
          accentColor={accentColor}
        />
      )}

      {/* Voice control button */}
      {!isRecording && (
        <button
          onClick={startRecording}
          className="p-3 rounded-full hover:bg-gray-100 transition-colors"
          title="Start voice input"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
            style={{ color: accentColor }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatVoiceWidget;
