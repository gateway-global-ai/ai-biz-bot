import React, { useState } from 'react';
import { FileCode, Cloud, Mic, Server, Database, Activity, Code, Cpu, Globe } from 'lucide-react';

const CODE_USE_LIVE_API = `// hooks/useLiveApi.ts
// Core logic for managing WebSocket connection and Audio Contexts

export const useLiveApi = (model, voice, systemInstruction, config) => {
  // ... state initialization
  
  const connect = useCallback(async () => {
    // 1. Initialize Audio Contexts (16kHz in, 24kHz out)
    inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
    outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

    // 2. Get Microphone Stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 3. Connect to Gemini SDK
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sessionPromise = ai.live.connect({
      model,
      config: { 
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
        }
      },
      callbacks: {
        onopen: () => {
          // 4. Start processing microphone audio
          // convert float32 -> PCM 16 -> Blob -> Send
          scriptProcessor.onaudioprocess = (e) => {
             const data = e.inputBuffer.getChannelData(0);
             const blob = createBlob(data);
             session.sendRealtimeInput({ media: blob });
          }
        },
        onmessage: (msg) => {
           // 5. Receive Audio from Server
           const audioData = msg.serverContent.modelTurn.parts[0].inlineData.data;
           // Decode Base64 -> Float32 -> Play
           const buffer = await decodeAudioData(decode(audioData), ctx);
           source.start(nextStartTime);
        }
      }
    });
  }, [...]);
  
  return { connect, disconnect, isConnected, ... };
};`;

const CODE_AUDIO_UTILS = `// utils/audioUtils.ts
// Low-level helpers for PCM encoding and Base64 manipulation

export function createBlob(data: Float32Array): Blob {
  // Convert Web Audio API Float32 (-1.0 to 1.0) to PCM Int16
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp and scale
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export async function decodeAudioData(data, ctx, sampleRate) {
  // Convert raw PCM bytes back to AudioBuffer for playback
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export function encode(bytes) { /* ... btoa impl ... */ }
export function decode(base64) { /* ... atob impl ... */ }`;

const CODE_APP_INTEGRATION = `// App.tsx
// High-level integration and UI State Management

const App = () => {
  // 1. Define State for Voice, Model, and Context
  const [selectedVoice, setSelectedVoice] = useState(VoiceName.Zephyr);
  const [model, setModel] = useState('gemini-2.5-flash-...');

  // 2. Invoke the custom hook
  const { isConnected, connect, logs } = useLiveApi(
    model,
    selectedVoice,
    systemInstruction,
    config
  );

  return (
    <div className="app-layout">
       <Header />
       <Tabs>
         <ControlPanel />
         <ArchitectureView />
       </Tabs>
    </div>
  );
};`;

interface FileNode {
  id: string;
  label: string;
  subLabel?: string;
  icon: React.ReactNode;
  code: string;
  description: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  color: string;
}

const ArchitectureView: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('useLiveApi');

  const nodes: FileNode[] = [
    {
      id: 'app',
      label: 'App.tsx',
      subLabel: 'React UI & State',
      icon: <Server size={20} />,
      code: CODE_APP_INTEGRATION,
      description: "Root Component. Handles UI rendering, user configuration (Voice/Model), and orchestrates the application state.",
      x: 20,
      y: 20,
      color: "border-blue-500 text-blue-400 bg-blue-950/40"
    },
    {
      id: 'browser_io',
      label: 'Browser API',
      subLabel: 'AudioContext / MediaStream',
      icon: <Mic size={20} />,
      code: `// Navigator Media Stream & AudioContext
const inputCtx = new AudioContext({ sampleRate: 16000 });
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Output
const outputCtx = new AudioContext({ sampleRate: 24000 });
outputCtx.destination.play();`,
      description: "Native Browser Interfaces. Provides access to the microphone (MediaStream) and handles audio playback (AudioContext).",
      x: 20,
      y: 80,
      color: "border-green-500 text-green-400 bg-green-950/40"
    },
    {
      id: 'useLiveApi',
      label: 'useLiveApi.ts',
      subLabel: 'Custom Hook / Logic',
      icon: <Cpu size={20} />,
      code: CODE_USE_LIVE_API,
      description: "The application brain. Manages the WebSocket connection, buffers audio data, and coordinates input/output streams.",
      x: 50,
      y: 50,
      color: "border-purple-500 text-purple-400 bg-purple-950/40"
    },
    {
      id: 'audioUtils',
      label: 'audioUtils.ts',
      subLabel: 'Helpers',
      icon: <Database size={20} />,
      code: CODE_AUDIO_UTILS,
      description: "Utility functions for audio data transformation. Handles PCM16 <-> Float32 conversion and Base64 encoding.",
      x: 50,
      y: 85,
      color: "border-yellow-500 text-yellow-400 bg-yellow-950/40"
    },
    {
      id: 'sdk',
      label: '@google/genai',
      subLabel: 'Gemini SDK',
      icon: <Cloud size={20} />,
      code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: key });
const session = ai.live.connect({ 
  model: 'gemini-2.5-flash',
  config: { ... } 
});

// Send
session.sendRealtimeInput({ media: blob });

// Receive
session.on('message', (msg) => { ... });`,
      description: "Official Google GenAI SDK. Encapsulates the WebSocket protocol, authentication, and message framing for Gemini Live.",
      x: 80,
      y: 50,
      color: "border-sky-500 text-sky-400 bg-sky-950/40"
    }
  ];

  const activeNode = nodes.find(n => n.id === selectedNode) || nodes[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
      {/* Diagram Area */}
      <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-xl flex flex-col min-h-[500px]">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Activity className="text-blue-400" />
                System Architecture
            </h2>
            <p className="text-xs text-gray-500 mt-1">Interactive Data Flow Diagram</p>
        </div>

        {/* Diagram Container */}
        <div className="flex-1 relative w-full h-full">
            
            {/* SVG Layer for Connectors */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#4b5563" />
                    </marker>
                    {/* Gradient Definition */}
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
                    </linearGradient>
                </defs>
                
                {/* 1. App -> Hook (20,27 -> 44,50) */}
                <path 
                    d="M 20 27 C 20 40, 40 50, 44 50" 
                    stroke="url(#line-gradient)" 
                    strokeWidth="0.5" 
                    fill="none" 
                    markerEnd="url(#arrow)"
                    className="opacity-60"
                    vectorEffect="non-scaling-stroke"
                />

                {/* 2. Browser -> Hook (20,73 -> 44,50) */}
                <path 
                    d="M 20 73 C 20 60, 40 50, 44 50" 
                    stroke="url(#line-gradient)" 
                    strokeWidth="0.5" 
                    fill="none" 
                    markerEnd="url(#arrow)" 
                    className="opacity-60"
                    vectorEffect="non-scaling-stroke"
                />

                {/* 3. Hook <-> Utils (50,58 -> 50,77) */}
                <path 
                    d="M 50 58 L 50 77" 
                    stroke="#4b5563" 
                    strokeWidth="0.5" 
                    fill="none" 
                    strokeDasharray="2"
                    className="opacity-40"
                    vectorEffect="non-scaling-stroke"
                />

                {/* 4. Hook -> SDK (56,50 -> 74,50) */}
                <path 
                    d="M 56 50 L 74 50" 
                    stroke="url(#line-gradient)" 
                    strokeWidth="0.5" 
                    fill="none" 
                    markerEnd="url(#arrow)" 
                    className="opacity-60"
                    vectorEffect="non-scaling-stroke"
                />
                
                {/* 5. SDK -> Cloud (86,50 -> 95,50) */}
                <path 
                    d="M 86 50 L 95 50" 
                    stroke="#3b82f6" 
                    strokeWidth="0.5" 
                    strokeDasharray="2" 
                    fill="none" 
                    className="opacity-30"
                    vectorEffect="non-scaling-stroke"
                />
                <circle cx="95" cy="50" r="1.5" fill="#3b82f6" className="opacity-30" />
            </svg>

            {/* Nodes Layer */}
            {nodes.map((node) => {
                const isSelected = selectedNode === node.id;
                return (
                    <div
                        key={node.id}
                        onClick={() => setSelectedNode(node.id)}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group ${isSelected ? 'z-20 scale-105' : 'z-10 hover:scale-105'}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                        {/* Glow Effect for Selected */}
                        {isSelected && (
                            <div className={`absolute inset-0 rounded-xl blur-lg opacity-40 ${node.color.split(' ')[0].replace('border-', 'bg-')}`} />
                        )}

                        {/* Node Card */}
                        <div className={`
                            relative flex flex-col items-center gap-2 p-4 rounded-xl border backdrop-blur-md min-w-[140px]
                            ${isSelected 
                                ? node.color + ' shadow-[0_0_30px_rgba(0,0,0,0.3)]' 
                                : 'bg-gray-900/80 border-gray-700 text-gray-400 hover:border-gray-500'
                            }
                        `}>
                            <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-black/20' : 'bg-gray-800'}`}>
                                {node.icon}
                            </div>
                            <div className="text-center">
                                <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                    {node.label}
                                </div>
                                {node.subLabel && (
                                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 mt-0.5">
                                        {node.subLabel}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Code Viewer Area */}
      <div className="w-full lg:w-[500px] flex flex-col bg-gray-900 rounded-xl border border-gray-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${activeNode.color.split(' ')[0].replace('border-', 'bg-')}`}></div>
                <span className="font-mono text-sm font-bold text-gray-200">{activeNode.label}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] uppercase text-gray-500 font-bold tracking-wider">
                <Code size={12} />
                Source Viewer
            </div>
        </div>
        
        <div className="p-4 bg-gray-900/50 border-b border-gray-800">
            <p className="text-sm text-gray-400 leading-relaxed">
                {activeNode.description}
            </p>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar bg-gray-950 p-4 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-[10px] text-gray-600 font-mono">Read-only</div>
            </div>
            <pre className="text-xs font-mono leading-relaxed text-gray-300">
                {activeNode.code}
            </pre>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureView;