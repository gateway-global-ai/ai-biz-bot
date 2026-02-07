# Gemini 2.5 Flash Native Audio (December 2025) - Complete Configuration Guide

## Model Overview

**Model ID:** `gemini-2.5-flash-native-audio-preview-12-2025`

**Release Date:** December 2025

**Status:** Preview / Cutting-Edge

**Type:** Native Audio Model for Real-Time Voice Conversations

## Key Features

### Advanced Audio Capabilities
- ✨ **30 HD Voices** in 24 languages
- 🎯 **Affective Dialog** - Understands and responds to emotional cues
- 📢 **Proactive Audio** - Responds only to device-directed queries
- 🔄 **Improved Barge-In** - Natural interruption handling, even in noisy environments
- 📝 **Enhanced Transcription** - Significantly improved accuracy
- 🌍 **Seamless Multilingual Support** - Switches languages without configuration
- 🔧 **Function Calling** - Sharp function execution for multi-turn conversations
- 🎤 **Native Audio I/O** - Deep integration for human-like conversations

### Audio Specifications
- **Input Sample Rate:** 16,000 Hz (standard browser capture)
- **Output Sample Rate:** 24,000 Hz (premium HD quality)
- **Input Format:** PCM mono channel
- **Output Format:** PCM mono channel
- **Latency:** ~300ms streaming, ~800ms average

## Complete JavaScript/TypeScript Configuration

```typescript
import { GoogleGenAI, Modality } from '@google/genai';

const client = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

// Define AI persona and behavior via system instruction
const systemInstruction = `Identity: You are Support Specialist at TechCorp.
Your primary task is: Help users with troubleshooting.

Personality Profile (DISC):
- Dominance: 50 (Moderately assertive)
- Influence: 70 (Very sociable)
- Steadiness: 60 (Patient and steady)
- Conscientiousness: 80 (Detail-oriented)

Communication Style: Clear, step-by-step guidance with empathy.
Keep responses conversational and concise.
Understand and respond to emotional cues.`;

// Connect to Gemini Live API
const session = await client.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  
  config: {
    // System instruction defines AI persona
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    
    // Response modalities - both audio and text
    responseModalities: [Modality.AUDIO, Modality.TEXT],
    
    // Voice configuration
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Zephyr' // Choose from 30 HD voices
        }
      }
    },
    
    // Audio processing configuration (CRITICAL)
    audioConfig: {
      enableAutomaticSpeechRecognition: true, // Enable STT
      enableTextToSpeech: true, // Enable TTS
      inputAudioSampleRate: 16000, // Browser standard
      outputAudioSampleRate: 24000, // Gemini native HD
    },
    
    // Generation parameters
    generationConfig: {
      temperature: 0.8,        // Creativity (0.0-2.0, recommended: 0.8)
      topP: 0.95,              // Diversity (0.0-1.0, recommended: 0.95)
      topK: 40,                // Quality (1-40, recommended: 40)
      maxOutputTokens: 2048,   // Response length (1-8192, recommended: 2048)
    }
  },
  
  // Callbacks for handling responses
  callbacks: {
    onopen: () => {
      console.log('Connected to Gemini Live API');
    },
    
    onmessage: (message) => {
      // Handle incoming audio (24kHz PCM) and text
      if (message.data) {
        const audioChunk = Buffer.from(message.data, 'base64');
        playAudio(audioChunk); // Play 24kHz audio
      }
      
      if (message.text) {
        console.log('AI Response:', message.text);
      }
      
      if (message.serverContent?.turnComplete) {
        console.log('Turn complete');
      }
    },
    
    onerror: (error) => {
      console.error('Live API Error:', error);
    }
  }
});

// Send audio input (16kHz PCM)
await session.sendRealtimeInput({
  media: {
    data: audioBase64,
    mimeType: 'audio/pcm;rate=16000'
  }
});
```

## Available Voices (8 Premium HD)

1. **Aoede** (Female) - Warm and expressive
2. **Kore** (Female) - Clear and articulate
3. **Leda** (Female) - Soft and soothing
4. **Zephyr** (Female) - Bright and energetic
5. **Charon** (Male) - Deep and authoritative
6. **Fenrir** (Male) - Strong and confident
7. **Orus** (Male) - Professional and clear
8. **Puck** (Male) - Friendly and approachable

*Note: Full release supports 30 HD voices across 24 languages*

## Browser Audio Setup (Critical for Quality)

```javascript
// INPUT: Microphone capture at 16kHz
const inputContext = new AudioContext({ sampleRate: 16000 });
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  } 
});

// OUTPUT: Playback at 24kHz (Gemini native)
const outputContext = new AudioContext({ sampleRate: 24000 });

// Convert Gemini response to playable audio
const audioData = Buffer.from(response.data, 'base64');
const float32Data = pcmToFloat32(audioData);

const audioBuffer = outputContext.createBuffer(1, float32Data.length, 24000);
audioBuffer.getChannelData(0).set(float32Data);

const source = outputContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(outputContext.destination);
source.start();
```

## Cost Structure (USD)

- **Input Audio:** $0.04 per minute
- **Output Audio:** $0.12 per minute  
- **Input Text:** $0.075 per 1M tokens
- **Output Text:** $0.30 per 1M tokens

### Example Costs
- **60 min/day:** ~$108/month (~$0.60 per 5-min session)
- **200 min/day:** ~$360/month (~$0.60 per 5-min session)
- **500 min/day:** ~$900/month (~$0.60 per 5-min session)

## Integration Patterns

### Push-to-Talk (Recommended for Mobile)

```javascript
let recorder;

// Start recording on button press
const handlePTTPress = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);
  const chunks = [];
  
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    await sendToGemini(blob);
  };
  
  recorder.start();
};

// Stop recording on button release
const handlePTTRelease = () => {
  if (recorder) recorder.stop();
};
```

## Production Checklist

- [ ] Configure 16kHz input, 24kHz output
- [ ] Enable `enableAutomaticSpeechRecognition`
- [ ] Enable `enableTextToSpeech`  
- [ ] Set proper voice via `prebuiltVoiceConfig`
- [ ] Define system instruction
- [ ] Configure sampling parameters
- [ ] Implement error handling
- [ ] Add connection retry logic
- [ ] Test on target devices
- [ ] Monitor API costs

---

**AI Biz Bot Voice SDK v1**  
**Last Updated:** February 7, 2026
