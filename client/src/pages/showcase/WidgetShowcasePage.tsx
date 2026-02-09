import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceVisualizerWidget, VoiceIndicatorWidget, ChatVoiceWidget } from '@/widgets';
import { Mic, Wand2, Waves } from 'lucide-react';

export default function WidgetShowcasePage() {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [visualizerStyle, setVisualizerStyle] = useState<'bars' | 'orb' | 'waveform'>('bars');
  const isRecordingRef = useRef(false);

  const startDemo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      
      setAnalyser(analyserNode);
      setIsRecording(true);
      isRecordingRef.current = true;

      // Monitor volume using ref to avoid stale closure
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVolume = () => {
        if (isRecordingRef.current) {
          analyserNode.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
          setVolume(average / 255);
          requestAnimationFrame(updateVolume);
        }
      };
      
      updateVolume();
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Please allow microphone access to use voice features');
    }
  };

  const stopDemo = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setAnalyser(null);
    setVolume(0);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Widget Showcase</h1>
        <p className="text-muted-foreground">
          Explore portable chat and voice widgets that can be integrated anywhere
        </p>
      </div>

      <Tabs defaultValue="visualizer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visualizer">Voice Visualizer</TabsTrigger>
          <TabsTrigger value="indicator">Voice Indicator</TabsTrigger>
          <TabsTrigger value="unified">Unified Widget</TabsTrigger>
        </TabsList>

        <TabsContent value="visualizer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="w-5 h-5" />
                Voice Visualizer Widget
              </CardTitle>
              <CardDescription>
                Real-time audio frequency visualization with multiple styles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4 items-center">
                <Button onClick={isRecording ? stopDemo : startDemo}>
                  <Mic className="w-4 h-4 mr-2" />
                  {isRecording ? 'Stop Demo' : 'Start Demo'}
                </Button>

                {isRecording && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={visualizerStyle === 'bars' ? 'default' : 'outline'}
                      onClick={() => setVisualizerStyle('bars')}
                    >
                      Bars
                    </Button>
                    <Button
                      size="sm"
                      variant={visualizerStyle === 'orb' ? 'default' : 'outline'}
                      onClick={() => setVisualizerStyle('orb')}
                    >
                      Orb
                    </Button>
                    <Button
                      size="sm"
                      variant={visualizerStyle === 'waveform' ? 'default' : 'outline'}
                      onClick={() => setVisualizerStyle('waveform')}
                    >
                      Waveform
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-center p-8 bg-slate-900 rounded-lg">
                <VoiceVisualizerWidget
                  analyser={analyser}
                  isActive={isRecording}
                  style={visualizerStyle}
                  accentColor="#3b82f6"
                  width={400}
                  height={100}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Usage:</h4>
                <pre className="text-xs overflow-x-auto">
{`import { VoiceVisualizerWidget } from '@/widgets';

<VoiceVisualizerWidget
  analyser={audioAnalyserNode}
  isActive={true}
  style="bars"
  accentColor="#3b82f6"
  width={400}
  height={100}
/>`}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Features:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Three visualization styles: bars, orb, waveform</li>
                  <li>Real-time frequency analysis using Web Audio API</li>
                  <li>Customizable colors and dimensions</li>
                  <li>Smooth 60fps animations</li>
                  <li>Lightweight and performant</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Voice Indicator Widget
              </CardTitle>
              <CardDescription>
                Fullscreen voice activity indicator with animated orb
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button onClick={isRecording ? stopDemo : startDemo}>
                <Mic className="w-4 h-4 mr-2" />
                {isRecording ? 'Stop Demo' : 'Start Demo'}
              </Button>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Usage:</h4>
                <pre className="text-xs overflow-x-auto">
{`import { VoiceIndicatorWidget } from '@/widgets';

<VoiceIndicatorWidget
  isActive={isRecording}
  volume={currentVolume}
  onStop={handleStop}
  title="Voice Active"
  subtitle="Listening..."
  accentColor="#3b82f6"
  fullscreen={true}
/>`}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Features:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Animated orb that scales with voice volume</li>
                  <li>Fullscreen overlay or inline mode</li>
                  <li>Customizable title and subtitle</li>
                  <li>Optional stop button</li>
                  <li>Smooth fade-in animation</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* This shows the actual indicator when active */}
          <VoiceIndicatorWidget
            isActive={isRecording}
            volume={volume}
            onStop={stopDemo}
            title="Voice Indicator Demo"
            subtitle="Speak to see the animation"
            accentColor="#3b82f6"
            fullscreen={true}
          />
        </TabsContent>

        <TabsContent value="unified">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Unified Chat + Voice Widget
              </CardTitle>
              <CardDescription>
                All-in-one widget with chat and voice capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg">
                <ChatVoiceWidget
                  enableVoice={true}
                  voiceStyle="bars"
                  voiceIndicatorMode="inline"
                  accentColor="#3b82f6"
                  onVoiceStart={() => console.log('Recording started')}
                  onVoiceStop={() => console.log('Recording stopped')}
                  onVoiceData={(blob) => console.log('Audio data:', blob.size, 'bytes')}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Usage:</h4>
                <pre className="text-xs overflow-x-auto">
{`import { ChatVoiceWidget } from '@/widgets';

<ChatVoiceWidget
  enableVoice={true}
  voiceStyle="bars"
  voiceIndicatorMode="inline"
  accentColor="#3b82f6"
  onVoiceStart={() => console.log('Started')}
  onVoiceStop={() => console.log('Stopped')}
  onVoiceData={(blob) => console.log('Audio:', blob)}
/>`}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Features:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Integrated voice recording with Web Audio API</li>
                  <li>Real-time voice visualization</li>
                  <li>Automatic audio data capture (Blob)</li>
                  <li>Fullscreen or inline display mode</li>
                  <li>Customizable styling and colors</li>
                  <li>Easy integration with chat interfaces</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Integration Tip
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This widget can be embedded in any chat interface. It handles microphone access,
                  audio recording, visualization, and data capture. Simply hook up the onVoiceData
                  callback to send audio to your backend for processing.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Widget Portability</CardTitle>
          <CardDescription>
            These widgets work anywhere - React, Vue, vanilla JS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Framework Support</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ React 18+</li>
                <li>✓ Next.js</li>
                <li>✓ Vanilla JavaScript</li>
                <li>✓ Vue.js (with adapter)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Browser Support</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Chrome 90+</li>
                <li>✓ Firefox 88+</li>
                <li>✓ Safari 14+</li>
                <li>✓ Edge 90+</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
