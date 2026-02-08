import React, { useState, useEffect } from 'react';
import { User, Smartphone, Server, Sparkles, MessageCircle, ArrowRight, Code, Zap } from 'lucide-react';

const TWIML_EXAMPLE = `<!-- 2. The Network asks: "What do I do?" -->
<Response>
    <Say>Connecting you to the AI.</Say>
    <Connect>
        <!-- 3. Send audio to our Server -->
        <Stream url="wss://myserver.com/stream" />
    </Connect>
</Response>`;

const SERVER_CODE = `// 4. The Server acts as a bridge
wss.on('connection', (ws) => {
  // When audio comes from the phone...
  ws.on('message', (audioChunk) => {
    // ...pass it to Gemini
    gemini.send(audioChunk);
  });

  // When audio comes from Gemini...
  gemini.on('audio', (audioChunk) => {
    // ...send it back to the phone
    ws.send(audioChunk);
  });
});`;

const GEMINI_CODE = `// 5. The AI Brain (Gemini)
const session = await ai.live.connect({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: "You are a translator. Translate English to Spanish instantly.",
  }
});`;

interface FriendlyNode {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  description: string;
  simpleExplanation: string;
  x: number;
  y: number;
  color: string;
  code?: string;
  codeLabel?: string;
}

const TelephonyView: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('caller');
  const [simStep, setSimStep] = useState(0);

  // Animation loop for the message packet
  useEffect(() => {
    const timer = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 400); // 400 ticks for a full loop
    }, 20);
    return () => clearInterval(timer);
  }, []);

  const nodes: FriendlyNode[] = [
    {
      id: 'caller',
      label: 'The Caller',
      subLabel: 'You / User',
      icon: <User size={32} />,
      x: 10,
      y: 50,
      color: "border-blue-400 text-blue-100 bg-blue-600",
      description: "This is where it starts. A human speaks into a phone.",
      simpleExplanation: "You dial a number and say 'Hello!'"
    },
    {
      id: 'network',
      label: 'Phone Network',
      subLabel: 'Twilio / Carrier',
      icon: <Smartphone size={32} />,
      x: 35,
      y: 50,
      color: "border-green-400 text-green-100 bg-green-600",
      code: TWIML_EXAMPLE,
      codeLabel: 'XML Instructions',
      description: "The system that connects regular phones to the internet.",
      simpleExplanation: "The cell tower catches your voice and turns it into digital code."
    },
    {
      id: 'server',
      label: 'The Server',
      subLabel: 'The Middleman',
      icon: <Server size={32} />,
      x: 60,
      y: 50,
      color: "border-orange-400 text-orange-100 bg-orange-600",
      code: SERVER_CODE,
      codeLabel: 'Bridge Code',
      description: "Your application running in the cloud. It passes messages back and forth.",
      simpleExplanation: "Our computer program catches the audio and rushes it to the AI."
    },
    {
      id: 'ai',
      label: 'Gemini AI',
      subLabel: 'The Brain',
      icon: <Sparkles size={32} />,
      x: 85,
      y: 50,
      color: "border-purple-400 text-purple-100 bg-purple-600",
      code: GEMINI_CODE,
      codeLabel: 'AI Configuration',
      description: "Google's AI model that listens, understands, translates, and speaks.",
      simpleExplanation: "The AI hears you, thinks, translates, and speaks back instantly!"
    }
  ];

  const activeNode = nodes.find(n => n.id === selectedNode) || nodes[0];

  // Helper to calculate bubble position based on simStep
  // Path is 10 -> 35 -> 60 -> 85 (0 to 100 range)
  // We map 0-200 ticks to Forward (10->85), 200-400 to Backward (85->10)
  const getBubblePos = () => {
    const totalDist = 75; // 85 - 10
    if (simStep < 200) {
        // Forward
        const percent = simStep / 200;
        return 10 + (totalDist * percent);
    } else {
        // Backward
        const percent = (simStep - 200) / 200;
        return 85 - (totalDist * percent);
    }
  };
  
  const getBubbleText = () => {
      if (simStep < 66) return "Hello!";
      if (simStep < 133) return "010101...";
      if (simStep < 200) return "Thinking...";
      if (simStep < 266) return "¡Hola!";
      if (simStep < 333) return "010101...";
      return "Audio...";
  };

  const bubbleX = getBubblePos();
  const isThinking = simStep > 180 && simStep < 220; // Pause at the brain

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
      
      {/* Diagram Section */}
      <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl relative overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
         
         <div className="absolute top-6 left-6 z-10">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <MessageCircle className="text-blue-400" />
                How the Call Works
            </h2>
            <p className="text-gray-400 mt-2 text-sm max-w-md">
                Follow the message as it travels from your phone to the AI brain and back.
            </p>
        </div>

        <div className="flex-1 relative w-full h-full flex items-center justify-center">
            
            {/* The "Wire" connecting everything */}
            <div className="absolute top-1/2 left-[10%] right-[15%] h-2 bg-gray-800 rounded-full -translate-y-1/2"></div>
            
            {/* Animated Signal on the wire */}
            <div 
                className="absolute top-1/2 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full -translate-y-1/2 transition-all duration-[50ms] shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                style={{ 
                    left: '10%', 
                    width: '4px',
                    transform: `translateX(${(bubbleX - 10) * (window.innerWidth < 1024 ? 5 : 10)}px) translateY(-50%) scale(1.5)` 
                    // Note: Simplified positioning logic for demo purposes, relying on flex layout below for nodes
                }}
            />

            {/* Speech Bubble Animation */}
            <div 
                className="absolute transition-all duration-[20ms] z-30 flex flex-col items-center"
                style={{ 
                    left: `${bubbleX}%`, 
                    top: '30%',
                    transform: 'translateX(-50%)'
                }}
            >
                <div className={`
                    px-4 py-2 rounded-2xl font-bold text-sm shadow-xl transition-all
                    ${simStep < 200 ? 'bg-white text-blue-900 rounded-bl-none' : 'bg-purple-500 text-white rounded-br-none'}
                    ${isThinking ? 'scale-125 bg-yellow-400 text-yellow-900' : 'scale-100'}
                `}>
                    {isThinking ? <Zap size={20} className="animate-pulse"/> : getBubbleText()}
                </div>
            </div>

            {/* Render Nodes */}
            <div className="absolute inset-0 w-full h-full">
            {nodes.map((node) => {
                const isSelected = selectedNode === node.id;
                return (
                    <div
                        key={node.id}
                        onClick={() => setSelectedNode(node.id)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group z-20"
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                        {/* Glow Behind */}
                        <div className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 ${isSelected ? 'opacity-40 bg-white' : 'opacity-0'}`} />

                        {/* The Node Circle */}
                        <div className={`
                            relative flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 shadow-2xl transition-all
                            ${isSelected ? node.color : 'bg-gray-800 border-gray-700 text-gray-500 hover:scale-110 hover:border-gray-500'}
                        `}>
                            {node.icon}
                        </div>

                        {/* Label below */}
                        <div className={`absolute top-24 left-1/2 -translate-x-1/2 text-center w-32 transition-all ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-2'}`}>
                            <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>{node.label}</div>
                            <div className="text-[10px] uppercase font-bold text-gray-600 mt-1">{node.subLabel}</div>
                        </div>
                    </div>
                );
            })}
            </div>

            {/* Connection Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <line x1="10" y1="50" x2="85" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2" />
            </svg>
        </div>
      </div>

      {/* Info / Story Panel */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6">
        
        {/* Story Card */}
        <div className={`
            flex-1 rounded-2xl p-6 shadow-xl border transition-all duration-500
            ${activeNode.id === 'ai' ? 'bg-purple-900/20 border-purple-500/30' : 'bg-gray-900 border-gray-800'}
        `}>
            <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-full shadow-lg ${activeNode.color}`}>
                    {activeNode.icon}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{activeNode.label}</h3>
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Step Details</div>
                </div>
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/5">
                <h4 className="text-sm font-bold text-blue-300 mb-2 uppercase">Simply Put:</h4>
                <p className="text-lg text-gray-200 font-medium leading-relaxed">
                    "{activeNode.simpleExplanation}"
                </p>
            </div>

            <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Technical Description:</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                    {activeNode.description}
                </p>
            </div>
        </div>

        {/* Code Peek (Collapsed by default visually, but expanded for techies) */}
        {activeNode.code && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden flex flex-col shadow-xl h-[250px] relative group">
                <div className="px-4 py-3 bg-black border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Code size={14} />
                        <span className="text-xs font-mono font-bold uppercase">{activeNode.codeLabel}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    <pre className="text-[10px] font-mono leading-relaxed text-blue-300">
                        {activeNode.code}
                    </pre>
                </div>
                {/* Overlay hinting this is for advanced users */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none opacity-50"></div>
            </div>
        )}
      </div>

    </div>
  );
};

export default TelephonyView;