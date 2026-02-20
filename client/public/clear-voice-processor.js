/**
 * Clear Voice Audio Worklet Processor
 * 
 * Runs audio processing in a dedicated background thread for:
 * - Zero UI interference (glitch-free audio)
 * - Lower latency than ScriptProcessorNode
 * - Modern browser standard compliance
 * 
 * This processor:
 * 1. Receives raw microphone audio (Float32Array)
 * 2. Calculates RMS volume for visualizer
 * 3. Sends audio chunks to main thread for WebSocket transmission
 */

class ClearVoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // No input means microphone isn't active
    if (!input || input.length === 0) {
      return true;
    }

    const channelData = input[0]; // Mono channel
    
    if (!channelData || channelData.length === 0) {
      return true;
    }

    // Accumulate audio data into our buffer
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      // When buffer is full, send it to the main thread
      if (this.bufferIndex >= this.bufferSize) {
        // Calculate RMS for volume visualization
        let sum = 0;
        for (let j = 0; j < this.bufferSize; j++) {
          sum += this.buffer[j] * this.buffer[j];
        }
        const rms = Math.sqrt(sum / this.bufferSize);

        // Send audio data + volume to main thread
        this.port.postMessage({
          audioData: this.buffer.slice(), // Clone the buffer
          volume: rms
        });

        // Reset buffer
        this.bufferIndex = 0;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('clear-voice-processor', ClearVoiceProcessor);
