# Widget System Documentation

## Overview

The Gateway Global AI widget system provides portable, embeddable components for chat and voice interactions. These widgets can be integrated into any web page or application with minimal configuration.

## Widget Components

### 1. VoiceVisualizerWidget

A real-time audio frequency visualizer that displays voice activity using canvas-based animations.

**Features:**
- Multiple visualization styles: bars, orb, waveform
- Real-time frequency analysis using Web Audio API
- Customizable colors and dimensions
- Lightweight and performant

**Usage:**

```tsx
import { VoiceVisualizerWidget } from '@/widgets';

<VoiceVisualizerWidget
  analyser={audioAnalyserNode}
  isActive={true}
  accentColor="#3b82f6"
  style="bars"
  width={300}
  height={60}
/>
```

**Props:**
- `analyser`: AnalyserNode | null - Web Audio API analyser node
- `isActive`: boolean - Whether visualization is active
- `accentColor`: string - Primary color for visualization
- `width`: number - Canvas width in pixels
- `height`: number - Canvas height in pixels
- `style`: 'bars' | 'orb' | 'waveform' - Visualization style
- `className`: string - Additional CSS classes

---

### 2. VoiceIndicatorWidget

A fullscreen or inline voice activity indicator with animated orb and controls.

**Features:**
- Animated orb that scales with voice volume
- Customizable title and subtitle
- Optional stop button
- Fullscreen or inline mode

**Usage:**

```tsx
import { VoiceIndicatorWidget } from '@/widgets';

<VoiceIndicatorWidget
  isActive={isRecording}
  volume={currentVolume}
  onStop={handleStop}
  title="Voice Active"
  subtitle="Listening..."
  accentColor="#3b82f6"
  fullscreen={true}
/>
```

**Props:**
- `isActive`: boolean - Whether widget is visible
- `volume`: number - Current volume level (0-1)
- `onStop`: () => void - Callback when stop button clicked
- `title`: string - Main title text
- `subtitle`: string - Subtitle text
- `accentColor`: string - Primary color
- `fullscreen`: boolean - Whether to show fullscreen overlay
- `className`: string - Additional CSS classes

---

### 3. ChatVoiceWidget

A unified widget that combines chat and voice capabilities with built-in recording and visualization.

**Features:**
- Integrated voice recording with Web Audio API
- Real-time voice visualization
- Automatic audio data capture
- Fullscreen or inline mode
- Customizable styling

**Usage:**

```tsx
import { ChatVoiceWidget } from '@/widgets';

<ChatVoiceWidget
  enableVoice={true}
  voiceStyle="bars"
  voiceIndicatorMode="fullscreen"
  accentColor="#3b82f6"
  onVoiceStart={() => console.log('Recording started')}
  onVoiceStop={() => console.log('Recording stopped')}
  onVoiceData={(blob) => console.log('Audio data:', blob)}
/>
```

**Props:**
- `enableVoice`: boolean - Enable voice features
- `voiceStyle`: 'bars' | 'orb' | 'waveform' - Visualization style
- `voiceIndicatorMode`: 'fullscreen' | 'inline' - Display mode
- `accentColor`: string - Primary color
- `className`: string - Additional CSS classes
- `onVoiceStart`: () => void - Callback when recording starts
- `onVoiceStop`: () => void - Callback when recording stops
- `onVoiceData`: (data: Blob) => void - Callback with recorded audio

---

## Integration Examples

### Integrate Voice Visualizer into Existing Chat

```tsx
import { useState } from 'react';
import { VoiceVisualizerWidget } from '@/widgets';

function ChatInterface() {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    source.connect(analyserNode);
    
    setAnalyser(analyserNode);
    setIsRecording(true);
  };

  return (
    <div>
      {/* Your chat interface */}
      
      {isRecording && (
        <VoiceVisualizerWidget
          analyser={analyser}
          isActive={isRecording}
          style="bars"
        />
      )}
      
      <button onClick={startRecording}>Start Voice</button>
    </div>
  );
}
```

### Embed Widget in Any Page

```html
<!-- Include the widget script -->
<script src="/sdk/gateway-chat.js"></script>

<!-- Widget will automatically initialize -->
<div id="chat-widget"></div>

<script>
  // Optional: Customize widget
  GatewayChat.init({
    botId: 'your-bot-id',
    theme: { primaryColor: '#6366f1' },
    voice: { 
      enabled: true,
      visualizerStyle: 'orb' 
    }
  });
</script>
```

---

## Widget Portability

All widgets are designed to be:

1. **Framework Agnostic** - Work with React, Vue, vanilla JS
2. **Style Isolated** - Use Tailwind classes but don't leak styles
3. **Lightweight** - Minimal dependencies
4. **Accessible** - Support keyboard navigation and screen readers
5. **Responsive** - Work on mobile and desktop

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required APIs:**
- Web Audio API (for voice features)
- Canvas API (for visualizations)
- MediaRecorder API (for voice recording)

## Performance Considerations

- Voice visualizers use `requestAnimationFrame` for smooth animations
- Audio processing runs on separate thread when possible
- Canvas operations are optimized for 60fps
- Memory cleanup on unmount to prevent leaks

## Customization

All widgets accept color customization through props. For advanced styling, use the `className` prop to add custom CSS classes.

```tsx
<VoiceVisualizerWidget
  className="shadow-lg border-2 border-blue-500"
  accentColor="#custom-color"
/>
```

## Troubleshooting

**Microphone not working:**
- Check browser permissions
- Ensure HTTPS (required for getUserMedia)
- Check browser console for errors

**Visualizer not animating:**
- Verify analyser is connected to audio source
- Check isActive prop is true
- Ensure audio context is not suspended

**Poor performance:**
- Reduce canvas dimensions
- Lower fftSize on analyser
- Disable unnecessary visual effects

## Next Steps

- See [Agent System Documentation](./AGENT_SYSTEM.md) for AI agent integration
- See [SDK Documentation](../sdk/chat/README.md) for embedding options
- See example implementations in `/sdk/chat/reference-apps`
