import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Square, Mic, Video, Settings, Activity, 
  Signal, Wifi, Clock, Cpu, HardDrive, Monitor, 
  Volume2, VolumeX, MicOff, VideoOff, RefreshCw,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  BarChart3, Radio, Zap, Layers, Maximize2, Minimize2
} from 'lucide-react';

// ==================== AUDIO VISUALIZER COMPONENT ====================
const AudioVisualizer = ({ isActive, mode = 'waveform', color = '#00d4ff' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const dataArrayRef = useRef(new Uint8Array(128));
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);
      
      // Generate simulated audio data
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        if (isActive) {
          dataArrayRef.current[i] = Math.random() * 255 * (0.5 + Math.sin(Date.now() / 200 + i) * 0.5);
        } else {
          dataArrayRef.current[i] = dataArrayRef.current[i] * 0.95; // Decay
        }
      }
      
      if (mode === 'waveform') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();
        
        const sliceWidth = width / dataArrayRef.current.length;
        let x = 0;
        
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const v = dataArrayRef.current[i] / 128.0;
          const y = (v * height) / 2;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          
          x += sliceWidth;
        }
        
        ctx.stroke();
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
      } else if (mode === 'bars') {
        const barWidth = (width / dataArrayRef.current.length) * 2.5;
        let x = 0;
        
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const barHeight = (dataArrayRef.current[i] / 255) * height;
          
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, `${color}33`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          
          x += barWidth + 1;
        }
      } else if (mode === 'circular') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}33`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const angle = (i / dataArrayRef.current.length) * 2 * Math.PI;
          const amp = (dataArrayRef.current[i] / 255) * radius;
          
          const x1 = centerX + Math.cos(angle) * (radius - 10);
          const y1 = centerY + Math.sin(angle) * (radius - 10);
          const x2 = centerX + Math.cos(angle) * (radius - 10 + amp);
          const y2 = centerY + Math.sin(angle) * (radius - 10 + amp);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, mode, color]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={150} 
      className="w-full h-full rounded-lg"
    />
  );
};

// ==================== VIDEO TEST PATTERN COMPONENT ====================
const VideoTestPattern = ({ pattern = 'colorbars', isStreaming }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const draw = () => {
      if (pattern === 'colorbars') {
        const colors = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff', '#000000'];
        const barWidth = width / colors.length;
        
        colors.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(i * barWidth, 0, barWidth, height);
        });
        
        // Add moving indicator
        if (isStreaming) {
          const time = Date.now() / 1000;
          ctx.fillStyle = '#00ff00';
          ctx.fillRect((time * 100) % width, height - 10, 50, 5);
        }
      } else if (pattern === 'smpte') {
        // SMPTE color bars
        const topColors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
        const barWidth = width / topColors.length;
        
        topColors.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(i * barWidth, 0, barWidth, height * 0.67);
        });
        
        // Bottom bars
        ctx.fillStyle = '#0000c0'; ctx.fillRect(0, height * 0.67, width * 0.125, height * 0.08);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(width * 0.125, height * 0.67, width * 0.125, height * 0.08);
        ctx.fillStyle = '#c000c0'; ctx.fillRect(width * 0.25, height * 0.67, width * 0.125, height * 0.08);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(width * 0.375, height * 0.67, width * 0.125, height * 0.08);
        ctx.fillStyle = '#00c0c0'; ctx.fillRect(width * 0.5, height * 0.67, width * 0.125, height * 0.08);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(width * 0.625, height * 0.67, width * 0.125, height * 0.08);
        ctx.fillStyle = '#c0c000'; ctx.fillRect(width * 0.75, height * 0.67, width * 0.125, height * 0.08);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(width * 0.875, height * 0.67, width * 0.125, height * 0.08);
        
        // Pluge
        ctx.fillStyle = '#000000'; ctx.fillRect(0, height * 0.75, width * 0.2, height * 0.25);
        ctx.fillStyle = '#1d1d1d'; ctx.fillRect(width * 0.2, height * 0.75, width * 0.2, height * 0.25);
        ctx.fillStyle = '#3d3d3d'; ctx.fillRect(width * 0.4, height * 0.75, width * 0.2, height * 0.25);
      } else if (pattern === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(1, '#0000ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Overlay info
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 60);
      ctx.fillStyle = '#00ff00';
      ctx.font = '14px monospace';
      ctx.fillText(`Pattern: ${pattern.toUpperCase()}`, 20, 30);
      ctx.fillText(`Status: ${isStreaming ? 'STREAMING' : 'STANDBY'}`, 20, 50);
      ctx.fillText(`Res: ${width}x${height}`, 20, 70);
    };
    
    draw();
    const interval = setInterval(draw, 1000 / 30);
    return () => clearInterval(interval);
  }, [pattern, isStreaming]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={640} 
      height={360} 
      className="w-full h-full rounded-lg border border-gray-700"
    />
  );
};

// ==================== METRICS GAUGE COMPONENT ====================
const MetricGauge = ({ label, value, unit, min = 0, max = 100, color = '#00d4ff' }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400 text-xs uppercase tracking-wider">{label}</span>
        <span className="text-white font-mono font-bold" style={{ color }}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${Math.min(percentage, 100)}%`, 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      </div>
    </div>
  );
};

// ==================== NETWORK GRAPH COMPONENT ====================
const NetworkGraph = ({ data, color = '#00d4ff' }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }
    
    if (data.length < 2) return;
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    const maxVal = Math.max(...data, 100);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - minVal) / range) * height;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Fill area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}44`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fill();
    
  }, [data, color]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={100} 
      className="w-full h-full rounded bg-gray-900"
    />
  );
};

// ==================== MAIN STREAMING TESTER COMPONENT ====================
const StreamingTester = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-realtime');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [audioMode, setAudioMode] = useState('waveform');
  const [videoPattern, setVideoPattern] = useState('colorbars');
  const [latency, setLatency] = useState(45);
  const [bitrate, setBitrate] = useState(2500);
  const [packetLoss, setPacketLoss] = useState(0.1);
  const [jitter, setJitter] = useState(12);
  const [fps, setFps] = useState(30);
  const [cpuUsage, setCpuUsage] = useState(35);
  const [memoryUsage, setMemoryUsage] = useState(42);
  const [networkHistory, setNetworkHistory] = useState([45, 48, 52, 49, 47, 45, 44, 46, 48, 50]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  
  // Simulation effect
  useEffect(() => {
    if (!isStreaming || isPaused) return;
    
    const interval = setInterval(() => {
      // Simulate metrics variation
      setLatency(prev => Math.max(20, Math.min(100, prev + (Math.random() - 0.5) * 10)));
      setBitrate(prev => Math.max(1000, Math.min(5000, prev + (Math.random() - 0.5) * 200)));
      setPacketLoss(prev => Math.max(0, Math.min(5, prev + (Math.random() - 0.5) * 0.2)));
      setJitter(prev => Math.max(5, Math.min(50, prev + (Math.random() - 0.5) * 5)));
      setFps(prev => Math.max(24, Math.min(60, prev + Math.floor((Math.random() - 0.5) * 3))));
      setCpuUsage(prev => Math.max(10, Math.min(90, prev + (Math.random() - 0.5) * 5)));
      setMemoryUsage(prev => Math.max(20, Math.min(80, prev + (Math.random() - 0.5) * 3)));
      
      // Update network history
      setNetworkHistory(prev => {
        const newHistory = [...prev.slice(1), latency];
        return newHistory;
      });
      
      // Add random logs
      if (Math.random() > 0.95) {
        const messages = [
          'Audio packet received',
          'Video frame decoded',
          'Network jitter detected',
          'Buffer health: optimal',
          'Keyframe requested',
          'Bitrate adaptation: +200kbps'
        ];
        addLog(messages[Math.floor(Math.random() * messages.length)], 'info');
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isStreaming, isPaused, latency]);
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 50));
  };
  
  const handleStart = () => {
    setIsStreaming(true);
    setIsPaused(false);
    addLog('Stream initialized', 'success');
    addLog(`Model loaded: ${selectedModel}`, 'info');
    addLog(`Voice profile: ${selectedVoice}`, 'info');
  };
  
  const handleStop = () => {
    setIsStreaming(false);
    addLog('Stream terminated', 'error');
  };
  
  const models = [
    { id: 'gpt-4o-realtime', name: 'GPT-4o Realtime', latency: 'Low', quality: 'High' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', latency: 'Ultra Low', quality: 'Medium' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', latency: 'Medium', quality: 'Very High' },
    { id: 'gemini-2-flash', name: 'Gemini 2.0 Flash', latency: 'Low', quality: 'High' },
    { id: 'custom-whisper', name: 'Custom Whisper + LLM', latency: 'Variable', quality: 'Custom' }
  ];
  
  const voices = [
    { id: 'alloy', name: 'Alloy', gender: 'Neutral', style: 'Balanced' },
    { id: 'echo', name: 'Echo', gender: 'Male', style: 'Deep' },
    { id: 'fable', name: 'Fable', gender: 'Neutral', style: 'British' },
    { id: 'onyx', name: 'Onyx', gender: 'Male', style: 'Powerful' },
    { id: 'nova', name: 'Nova', gender: 'Female', style: 'Energetic' },
    { id: 'shimmer', name: 'Shimmer', gender: 'Female', style: 'Warm' }
  ];
  
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              StreamLab Pro
            </h1>
            <p className="text-xs text-gray-500">Real-time A/V Testing Environment</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isStreaming ? (isPaused ? 'PAUSED' : 'LIVE') : 'OFFLINE'}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              <span className="text-green-400">Connected</span>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'dashboard' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'models' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span className="font-medium">Models & Voices</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configuration</span>
          </button>
          
          <div className="mt-auto">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Session</span>
                  <span className="text-cyan-400 font-mono">00:14:23</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Packets</span>
                  <span className="text-green-400 font-mono">45.2K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dropped</span>
                  <span className="text-red-400 font-mono">0.01%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-black p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Control Bar */}
              <div className="flex items-center justify-between bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-4">
                  {!isStreaming ? (
                    <button
                      onClick={handleStart}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-all"
                    >
                      <Play className="w-5 h-5" />
                      Start Stream
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-medium transition-all"
                      >
                        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>
                      
                      <button
                        onClick={handleStop}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-all"
                      >
                        <Square className="w-5 h-5" />
                        Stop
                      </button>
                    </>
                  )}
                  
                  <div className="h-8 w-px bg-gray-700 mx-2" />
                  
                  <button 
                    onClick={() => setFullscreen(!fullscreen)}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
                  >
                    {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <button className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-gray-400 hover:text-white">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-gray-400 hover:text-white">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-gray-400 hover:text-white">
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Main Preview Area */}
              <div className={`grid gap-6 ${fullscreen ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {/* Video Preview */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span className="font-medium text-sm">Video Output</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{videoPattern.toUpperCase()}</span>
                      <select 
                        value={videoPattern}
                        onChange={(e) => setVideoPattern(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="colorbars">Color Bars</option>
                        <option value="smpte">SMPTE</option>
                        <option value="gradient">Gradient</option>
                      </select>
                    </div>
                  </div>
                  <div className="aspect-video bg-black relative">
                    <VideoTestPattern pattern={videoPattern} isStreaming={isStreaming && !isPaused} />
                    
                    {/* Overlay Info */}
                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-3 py-2 rounded border border-gray-700">
                      <div className="text-xs text-gray-400">Resolution</div>
                      <div className="text-sm font-mono text-white">1920×1080 @ {fps}fps</div>
                    </div>
                    
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-2 rounded border border-gray-700">
                      <div className="text-xs text-gray-400">Codec</div>
                      <div className="text-sm font-mono text-white">H.264 (Main)</div>
                    </div>
                  </div>
                </div>
                
                {/* Audio Visualization */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span className="font-medium text-sm">Audio Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        value={audioMode}
                        onChange={(e) => setAudioMode(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="waveform">Waveform</option>
                        <option value="bars">Spectrum</option>
                        <option value="circular">Circular</option>
                      </select>
                    </div>
                  </div>
                  <div className="aspect-video bg-black relative p-4">
                    <AudioVisualizer 
                      isActive={isStreaming && !isPaused} 
                      mode={audioMode}
                      color={audioMode === 'waveform' ? '#00d4ff' : audioMode === 'bars' ? '#a855f7' : '#22c55e'}
                    />
                    
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs font-mono">
                      <span className="text-gray-500">20Hz</span>
                      <span className="text-gray-500">1kHz</span>
                      <span className="text-gray-500">20kHz</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                <MetricGauge 
                  label="Latency" 
                  value={latency} 
                  unit="ms" 
                  min={0} 
                  max={200} 
                  color={latency < 50 ? '#22c55e' : latency < 100 ? '#eab308' : '#ef4444'} 
                />
                <MetricGauge 
                  label="Bitrate" 
                  value={bitrate} 
                  unit=" kbps" 
                  min={0} 
                  max={8000} 
                  color="#3b82f6" 
                />
                <MetricGauge 
                  label="Packet Loss" 
                  value={packetLoss} 
                  unit="%" 
                  min={0} 
                  max={5} 
                  color={packetLoss < 0.5 ? '#22c55e' : '#ef4444'} 
                />
                <MetricGauge 
                  label="Jitter" 
                  value={jitter} 
                  unit="ms" 
                  min={0} 
                  max={100} 
                  color={jitter < 30 ? '#22c55e' : '#eab308'} 
                />
              </div>
              
              {/* Network & System Metrics */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <Signal className="w-4 h-4" />
                    Network Latency History
                  </h3>
                  <div className="h-32">
                    <NetworkGraph data={networkHistory} color="#00d4ff" />
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    System Resources
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">CPU Usage</span>
                        <span className="text-white font-mono">{cpuUsage.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                          style={{ width: `${cpuUsage}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Memory</span>
                        <span className="text-white font-mono">{memoryUsage.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                          style={{ width: `${memoryUsage}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Buffer Health</span>
                        <span className="text-green-400 font-mono">Healthy</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: '85%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Logs */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm">Event Log</span>
                  </div>
                  <button 
                    onClick={() => setLogs([])}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="h-48 overflow-auto p-4 font-mono text-xs space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-gray-600 italic">No events recorded...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-gray-500">[{log.timestamp}]</span>
                        <span className={
                          log.type === 'error' ? 'text-red-400' : 
                          log.type === 'success' ? 'text-green-400' : 
                          log.type === 'warning' ? 'text-yellow-400' : 'text-cyan-400'
                        }>
                          {log.type === 'error' ? '✖' : log.type === 'success' ? '✓' : 'ℹ'} {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'models' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Model Configuration</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-cyan-400" />
                    AI Models
                  </h3>
                  <div className="space-y-3">
                    {models.map(model => (
                      <div 
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedModel === model.id 
                            ? 'bg-cyan-500/10 border-cyan-500/50' 
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{model.name}</span>
                          {selectedModel === model.id && <CheckCircle2 className="w-5 h-5 text-cyan-400" />}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {model.latency}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> {model.quality}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-purple-400" />
                    Voice Profiles
                  </h3>
                  <div className="space-y-3">
                    {voices.map(voice => (
                      <div 
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedVoice === voice.id 
                            ? 'bg-purple-500/10 border-purple-500/50' 
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{voice.name}</span>
                          {selectedVoice === voice.id && <CheckCircle2 className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400">
                          <span>{voice.gender}</span>
                          <span>•</span>
                          <span>{voice.style}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-medium mb-4">Streaming Parameters</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Audio Codec</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                      <option>Opus (Recommended)</option>
                      <option>AAC-LC</option>
                      <option>G.711</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Sample Rate</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                      <option>48kHz</option>
                      <option>44.1kHz</option>
                      <option>24kHz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Bitrate</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                      <option>128 kbps</option>
                      <option>256 kbps</option>
                      <option>320 kbps</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Advanced Configuration</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    Network Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">WebRTC ICE Servers</span>
                      <button className="text-cyan-400 text-sm">Configure</button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">TURN Server</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm">Active</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">STUN Server</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm">Active</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-800">
                    <label className="block text-sm text-gray-400 mb-2">Buffer Size</label>
                    <input 
                      type="range" 
                      min="50" 
                      max="500" 
                      defaultValue="200"
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low Latency</span>
                      <span>High Buffer</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-purple-400" />
                    Video Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Resolution</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                        <option>1920×1080 (FHD)</option>
                        <option>1280×720 (HD)</option>
                        <option>3840×2160 (4K)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Frame Rate</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                        <option>30 fps</option>
                        <option>60 fps</option>
                        <option>24 fps</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Keyframe Interval</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                        <option>2 seconds</option>
                        <option>5 seconds</option>
                        <option>10 seconds</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  Debug Options
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                    <input type="checkbox" className="w-4 h-4 accent-cyan-500" defaultChecked />
                    <span className="text-sm">Simulate Packet Loss</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                    <input type="checkbox" className="w-4 h-4 accent-cyan-500" />
                    <span className="text-sm">Force TURN Relay</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                    <input type="checkbox" className="w-4 h-4 accent-cyan-500" defaultChecked />
                    <span className="text-sm">Verbose Logging</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StreamingTester;
