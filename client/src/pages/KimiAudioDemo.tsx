import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mic, AudioWaveform, Zap, Globe, MessageSquare, Volume2, Clock } from "lucide-react";

export default function KimiAudioDemo() {
  const [isPlaying, setIsPlaying] = useState(false);

  const features = [
    {
      icon: AudioWaveform,
      title: "Real-Time Voice AI",
      description: "Kimi-Audio processes your voice in real-time with ~300ms latency for natural conversations",
    },
    {
      icon: MessageSquare,
      title: "Multi-Turn Conversations",
      description: "Maintains context across the entire call for coherent, flowing dialogue",
    },
    {
      icon: Zap,
      title: "256K Context Window",
      description: "Powered by Kimi 2.5 with massive context for complex discussions",
    },
    {
      icon: Globe,
      title: "Twilio Integration",
      description: "Call from any phone worldwide via Twilio's global network",
    },
  ];

  const useCases = [
    { title: "Customer Support", description: "AI handles inquiries 24/7 with natural conversation" },
    { title: "Task Assistants", description: "Submit tasks by voice, get progress updates via SMS" },
    { title: "Information Hotlines", description: "Answer questions about products, services, or topics" },
    { title: "Appointment Scheduling", description: "Voice-based booking and calendar management" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
            Kimi-Audio Integration
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Voice AI Conversations
          </h1>
          <p className="text-xl text-purple-200/80 max-w-2xl mx-auto">
            Experience real-time AI voice interactions powered by Kimi-Audio and Twilio Media Streams
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm" data-testid="card-demo-info">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-400" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-300 font-semibold">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">You Call</p>
                  <p className="text-purple-200/70 text-sm">Call our Twilio number to connect</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-300 font-semibold">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Audio Streams</p>
                  <p className="text-purple-200/70 text-sm">Twilio Media Streams sends your voice in real-time</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-300 font-semibold">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Kimi Processes</p>
                  <p className="text-purple-200/70 text-sm">Kimi-Audio understands and generates voice responses</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-300 font-semibold">4</span>
                </div>
                <div>
                  <p className="text-white font-medium">You Hear AI</p>
                  <p className="text-purple-200/70 text-sm">Natural voice response streams back to your phone</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm" data-testid="card-architecture">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Technical Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/30 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-400 mb-2">// Audio Pipeline</div>
                <div className="text-purple-300">Caller Phone</div>
                <div className="text-gray-500 pl-4">|</div>
                <div className="text-purple-300 pl-4">Twilio (u-law 8kHz)</div>
                <div className="text-gray-500 pl-4">|</div>
                <div className="text-purple-300 pl-4">WebSocket Stream</div>
                <div className="text-gray-500 pl-4">|</div>
                <div className="text-purple-300 pl-4">PCM Conversion (16kHz)</div>
                <div className="text-gray-500 pl-4">|</div>
                <div className="text-yellow-400 pl-4">Kimi-Audio (Replicate)</div>
                <div className="text-gray-500 pl-4">|</div>
                <div className="text-green-400 pl-4">AI Voice Response</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-purple-300 border-purple-500/30">Kimi-Audio 7B</Badge>
                <Badge variant="outline" className="text-purple-300 border-purple-500/30">Replicate API</Badge>
                <Badge variant="outline" className="text-purple-300 border-purple-500/30">Twilio Streams</Badge>
                <Badge variant="outline" className="text-purple-300 border-purple-500/30">WebSocket</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-white/5 border-white/10 hover-elevate"
              data-testid={`card-feature-${index}`}
            >
              <CardContent className="p-4">
                <feature.icon className="h-8 w-8 text-purple-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-purple-200/60 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-purple-500/30 mb-12" data-testid="card-cta">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Try?</h2>
            <p className="text-purple-200/80 mb-6 max-w-xl mx-auto">
              Configure your Twilio webhook to point to our Kimi-Audio endpoint and experience the future of voice AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="bg-black/30 rounded-lg px-4 py-3 font-mono text-sm">
                <span className="text-gray-400">Webhook URL:</span>
                <span className="text-green-400 ml-2">/webhook/voice/kimi</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                <Clock className="h-3 w-3 mr-1" />
                ~300ms Latency
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                <Volume2 className="h-3 w-3 mr-1" />
                24kHz Audio
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Mic className="h-3 w-3 mr-1" />
                Real-Time
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm" data-testid="card-use-cases">
            <CardHeader>
              <CardTitle className="text-white">Use Cases</CardTitle>
              <CardDescription className="text-purple-200/70">
                Where voice AI shines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {useCases.map((useCase, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">{useCase.title}</p>
                    <p className="text-purple-200/60 text-sm">{useCase.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm" data-testid="card-api-info">
            <CardHeader>
              <CardTitle className="text-white">API Endpoints</CardTitle>
              <CardDescription className="text-purple-200/70">
                Integration reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500/30 text-green-300">POST</Badge>
                  <span className="text-white font-mono text-sm">/webhook/voice/kimi</span>
                </div>
                <p className="text-purple-200/60 text-sm">Kimi-Audio voice webhook with Media Streams</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500/30 text-blue-300">WSS</Badge>
                  <span className="text-white font-mono text-sm">/ws/voice-stream</span>
                </div>
                <p className="text-purple-200/60 text-sm">WebSocket endpoint for audio streaming</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-yellow-500/30 text-yellow-300">POST</Badge>
                  <span className="text-white font-mono text-sm">/webhook/voice</span>
                </div>
                <p className="text-purple-200/60 text-sm">Legacy voice webhook (Gather-based)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 text-purple-200/50 text-sm">
          Powered by Kimi-Audio 7B via Replicate | Gateway Global AI
        </div>
      </div>
    </div>
  );
}
