import React from 'react';
import { VoiceName } from '../types';
import { Code, Copy } from 'lucide-react';

interface CodeBlockProps {
  voice: VoiceName;
  model: string;
  systemInstruction: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ voice, model, systemInstruction }) => {
  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-2 text-blue-400">
          <Code size={16} />
          <span className="text-xs font-mono font-bold">SDK IMPLEMENTATION</span>
        </div>
        <button 
          className="p-1.5 hover:bg-gray-800 rounded-md text-gray-500 hover:text-gray-300 transition-colors"
          title="Copy Code"
        >
          <Copy size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs md:text-sm leading-relaxed">
        <pre className="text-gray-300">
          <span className="text-purple-400">import</span> {`{ GoogleGenAI, Modality }`} <span className="text-purple-400">from</span> <span className="text-green-400">"@google/genai"</span>;
          {'\n\n'}
          <span className="text-blue-400">const</span> ai = <span className="text-purple-400">new</span> <span className="text-yellow-300">GoogleGenAI</span>({`{ apiKey: process.env.API_KEY }`});
          {'\n\n'}
          <span className="text-gray-500">// System instruction generated from Mixing Board controls</span>
          {'\n'}
          <span className="text-blue-400">const</span> instruction = <span className="text-green-400">`{systemInstruction.split('\n').map(line => line.trim()).filter(Boolean).join(' ')}`</span>;
          {'\n\n'}
          <span className="text-blue-400">const</span> session = <span className="text-purple-400">await</span> ai.live.<span className="text-blue-300">connect</span>({`{`}
          {'\n'}  <span className="text-sky-300">model</span>: <span className="text-green-400">"{model}"</span>,
          {'\n'}  <span className="text-sky-300">config</span>: {`{`}
          {'\n'}    <span className="text-sky-300">responseModalities</span>: [Modality.AUDIO],
          {'\n'}    <span className="text-sky-300">speechConfig</span>: {`{`}
          {'\n'}      <span className="text-sky-300">voiceConfig</span>: {`{`} 
          {'\n'}        <span className="text-sky-300">prebuiltVoiceConfig</span>: {`{`} 
          {'\n'}          <span className="text-sky-300">voiceName</span>: <span className="text-green-400">"{voice}"</span> 
          {'\n'}        {`}`} 
          {'\n'}      {`}`}
          {'\n'}    {`}`},
          {'\n'}    <span className="text-sky-300">systemInstruction</span>: instruction,
          {'\n'}  {`}`},
          {'\n'}  <span className="text-sky-300">callbacks</span>: {`{`}
          {'\n'}    <span className="text-yellow-200">onopen</span>: () ={`>`} console.log(<span className="text-green-400">"Session started"</span>),
          {'\n'}    <span className="text-yellow-200">onmessage</span>: (msg) ={`>`} handleAudio(msg),
          {'\n'}    <span className="text-yellow-200">onclose</span>: () ={`>`} console.log(<span className="text-green-400">"Session closed"</span>),
          {'\n'}    <span className="text-yellow-200">onerror</span>: (err) ={`>`} console.error(err),
          {'\n'}  {`}`}
          {'\n'}{`}`});
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;