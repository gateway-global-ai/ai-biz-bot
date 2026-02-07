import React, { useState, useRef, useEffect } from 'react';
import { Mic, Edit2, X, Send } from 'lucide-react';
import { VoiceVisualizerWidget } from '../widgets/VoiceVisualizerWidget';
import { Button } from '@/components/ui/button';

interface PushToTalkInterfaceProps {
  onSendAudio: (audioBlob: Blob, transcript: string) => void;
  onClose: () => void;
  accentColor?: string;
  companyName?: string;
}

/**
 * Push-to-Talk Interface Component
 * - Records audio only while PTT button is pressed
 * - Displays visualizer during recording
 * - Shows transcription in real-time
 * - 1-second edit window after release
 * - Auto-sends to AI after edit window
 */
export const PushToTalkInterface: React.FC<PushToTalkInterfaceProps> = ({
  onSendAudio,
  onClose,
  accentColor = '#8b5cf6',
  companyName = 'AI Biz Bot',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showEditWindow, setShowEditWindow] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const editTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize audio when component mounts
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (editTimerRef.current) {
        clearTimeout(editTimerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup audio context and analyser for visualizer
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
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        handleRecordingStop();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('Listening...');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAnalyser(null);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    // Simulate transcription (in real implementation, this would call an API)
    // For now, we'll show a placeholder
    const mockTranscript = 'Your voice message was recorded';
    setTranscript(mockTranscript);
    setEditText(mockTranscript);
    
    // Show edit window for 1 second
    setShowEditWindow(true);
    
    editTimerRef.current = setTimeout(() => {
      if (!isEditing) {
        // Auto-send after 1 second if not editing
        handleSend(audioBlob, mockTranscript);
      }
    }, 1000);
  };

  const handleEditClick = () => {
    if (editTimerRef.current) {
      clearTimeout(editTimerRef.current);
    }
    setIsEditing(true);
    setShowEditWindow(false);
  };

  const handleSend = (audioBlob: Blob, text: string) => {
    onSendAudio(audioBlob, text);
    setTranscript('');
    setEditText('');
    setShowEditWindow(false);
    setIsEditing(false);
  };

  const handleManualSend = () => {
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      handleSend(audioBlob, editText);
    }
  };

  const handlePTTPress = () => {
    setIsPressing(true);
    startRecording();
  };

  const handlePTTRelease = () => {
    setIsPressing(false);
    stopRecording();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Voice Chat with {companyName}
          </h2>
          <p className="text-slate-400 text-sm">
            Hold the button to talk, release to send
          </p>
        </div>

        {/* Visualizer */}
        <div className="mb-8 flex items-center justify-center min-h-[120px]">
          {isRecording ? (
            <VoiceVisualizerWidget
              analyser={analyser}
              isActive={isRecording}
              accentColor={accentColor}
              style="bars"
            />
          ) : (
            <div className="text-slate-500 text-center">
              <Mic className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ready to record</p>
            </div>
          )}
        </div>

        {/* Transcription Display */}
        <div className="mb-8 min-h-[100px] bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-slate-900 text-white rounded p-2 min-h-[60px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Edit your message..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(transcript);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualSend}
                  size="sm"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p className="text-white text-lg">
                {transcript || 'Your transcription will appear here...'}
              </p>
              {showEditWindow && transcript && (
                <button
                  onClick={handleEditClick}
                  className="absolute top-0 right-0 text-slate-400 hover:text-white transition-colors"
                  title="Edit message"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* PTT Button */}
        <div className="flex justify-center">
          <button
            onMouseDown={handlePTTPress}
            onMouseUp={handlePTTRelease}
            onTouchStart={handlePTTPress}
            onTouchEnd={handlePTTRelease}
            className={`
              relative w-32 h-32 rounded-full transition-all duration-200
              ${isPressing ? 'scale-95' : 'scale-100'}
              ${isRecording ? 'shadow-2xl' : 'shadow-lg'}
            `}
            style={{
              backgroundColor: isRecording ? accentColor : '#334155',
              boxShadow: isRecording ? `0 0 40px ${accentColor}80` : 'none',
            }}
          >
            <Mic className={`w-16 h-16 mx-auto text-white ${isRecording ? 'animate-pulse' : ''}`} />
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-slate-400 text-sm font-medium">
                {isRecording ? 'Release to send' : 'Hold to talk'}
              </span>
            </div>
          </button>
        </div>

        {/* Edit window countdown indicator */}
        {showEditWindow && !isEditing && (
          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm animate-pulse">
              Sending in 1 second... Click the edit icon to modify
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PushToTalkInterface;
