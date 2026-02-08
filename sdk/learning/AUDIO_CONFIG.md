# Learning SDK Audio Configuration

## Overview

The Learning SDK uses Google's Gemini Live API for real-time bidirectional audio streaming. This document explains the audio configuration and bitrate settings.

## Audio Format Specifications

### Output Audio (AI Instructor Speech)
- **Sample Rate**: 24,000 Hz (24 kHz)
- **Format**: PCM16 (16-bit linear PCM)
- **Channels**: 1 (Mono)
- **Bitrate**: ~384 kbps (24000 Hz × 16 bits × 1 channel)
- **Source**: Gemini Live API audio responses

### Input Audio (User Microphone)
- **Sample Rate**: 16,000 Hz (16 kHz)
- **Format**: PCM16 (16-bit linear PCM)
- **Channels**: 1 (Mono)
- **Bitrate**: ~256 kbps (16000 Hz × 16 bits × 1 channel)
- **Processing**: Echo cancellation, noise suppression, auto-gain control enabled

## Why Different Sample Rates?

The system uses different sample rates for input and output to optimize:

1. **Output (24 kHz)**: Higher quality for AI-generated speech
   - Better frequency response (0-12 kHz)
   - More natural-sounding voice
   - Matches Gemini Live API output format

2. **Input (16 kHz)**: Adequate for human speech
   - Captures full frequency range of human voice (0-8 kHz)
   - Lower bandwidth requirements for upload
   - Matches Gemini Live API input requirements
   - Reduces processing overhead

## Audio Context Configuration

### Output Audio Context
```typescript
new AudioContext({ 
  sampleRate: 24000,
  latencyHint: 'interactive'
})
```

### Input Audio Context
```typescript
new AudioContext({ 
  sampleRate: 16000,
  latencyHint: 'interactive'
})
```

## Audio Processing Pipeline

### Instructor Speech (Gemini → User)
1. Gemini Live API generates audio (24 kHz PCM16)
2. Base64-encoded data received via WebSocket
3. Decoded to Uint8Array
4. Converted to AudioBuffer (24 kHz)
5. Played through output AudioContext
6. Visualized via AnalyserNode

### User Speech (User → Gemini)
1. Microphone captures audio
2. Browser resamples to 16 kHz (if needed)
3. Float32 samples from ScriptProcessorNode
4. Converted to PCM16 Int16Array
5. Base64-encoded
6. Sent to Gemini Live API via WebSocket

## Common Issues & Solutions

### Issue: Audio Quality Degradation
**Cause**: Sample rate mismatch between contexts
**Solution**: Ensure output uses 24 kHz and input uses 16 kHz

### Issue: Audio Stuttering/Gaps
**Cause**: Buffer underruns or context suspension
**Solution**: 
- Resume AudioContext on user interaction
- Use `latencyHint: 'interactive'`
- Proper buffer queueing in playAudioBuffer

### Issue: Echo or Feedback
**Cause**: Microphone picking up speaker output
**Solution**:
- Enable echo cancellation in getUserMedia
- Use headphones for testing
- Proper gain control settings

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| AudioContext | ✅ | ✅ | ✅ | ✅ |
| 24kHz Sample Rate | ✅ | ✅ | ✅ | ✅ |
| 16kHz Sample Rate | ✅ | ✅ | ✅ | ✅ |
| Echo Cancellation | ✅ | ✅ | ⚠️ | ✅ |
| Noise Suppression | ✅ | ✅ | ⚠️ | ✅ |

⚠️ = Limited support or requires specific OS/hardware

## Performance Considerations

### Memory Usage
- Each second of 24 kHz audio = ~48 KB (PCM16)
- Each second of 16 kHz audio = ~32 KB (PCM16)
- AudioBuffers are garbage collected when no longer referenced

### CPU Usage
- Sample rate conversion handled by browser (minimal overhead)
- Float32 ↔ PCM16 conversion: ~0.1ms per buffer
- AnalyserNode visualization: ~1-2% CPU on modern devices

### Latency
- Target latency: <100ms end-to-end
- AudioContext latency: ~20-50ms
- Network latency: varies by connection
- Total typical latency: 100-200ms

## Testing Audio Configuration

### Verify Sample Rates
```javascript
console.log('Output sample rate:', outputCtx.sampleRate); // Should be 24000
console.log('Input sample rate:', inputCtx.sampleRate);   // Should be 16000
```

### Test Audio Quality
1. Generate lesson with voice enabled
2. Listen for clarity and naturalness
3. Check for artifacts or distortion
4. Verify microphone input is clear

### Monitor Performance
```javascript
// Check buffer health
analyser.fftSize = 128;
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
console.log('Audio levels:', dataArray);
```

## Future Improvements

- [ ] Add adaptive bitrate based on connection quality
- [ ] Implement audio buffer pooling for memory efficiency
- [ ] Support higher sample rates (48 kHz) for premium experience
- [ ] Add audio compression for bandwidth optimization
- [ ] Implement noise gate for cleaner input
- [ ] Add spectral analysis for better visualization

## References

- [Gemini Live API Documentation](https://ai.google.dev/api/live)
- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [MediaStream Recording API](https://www.w3.org/TR/mediastream-recording/)
- [PCM Audio Format](https://en.wikipedia.org/wiki/Pulse-code_modulation)
