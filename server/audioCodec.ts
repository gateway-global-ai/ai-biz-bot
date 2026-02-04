const MULAW_BIAS = 33;
const MULAW_MAX = 8159;

const mulawDecodeTable: number[] = [];
for (let i = 0; i < 256; i++) {
  let mu = ~i;
  let sign = mu & 0x80;
  let exponent = (mu >> 4) & 0x07;
  let mantissa = mu & 0x0f;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;
  if (sign !== 0) sample = -sample;
  mulawDecodeTable[i] = sample;
}

export function decodeMulaw(mulawData: Buffer): Int16Array {
  const pcm16 = new Int16Array(mulawData.length);
  for (let i = 0; i < mulawData.length; i++) {
    pcm16[i] = mulawDecodeTable[mulawData[i]];
  }
  return pcm16;
}

export function encodeMulaw(pcmData: Int16Array): Buffer {
  const mulaw = Buffer.alloc(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    let sample = pcmData[i];
    let sign = (sample < 0) ? 0x80 : 0;
    if (sample < 0) sample = -sample;
    if (sample > MULAW_MAX) sample = MULAW_MAX;
    sample += MULAW_BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1);
    let mantissa = (sample >> (exponent + 3)) & 0x0f;
    mulaw[i] = ~(sign | (exponent << 4) | mantissa);
  }
  return mulaw;
}

export function resampleLinear(input: Int16Array, inputRate: number, outputRate: number): Int16Array {
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
    const frac = srcIndex - srcIndexFloor;
    output[i] = Math.round(input[srcIndexFloor] * (1 - frac) + input[srcIndexCeil] * frac);
  }
  
  return output;
}

export function pcm16ToWavBuffer(pcmData: Int16Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length * 2;
  
  const buffer = Buffer.alloc(44 + dataSize);
  
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  for (let i = 0; i < pcmData.length; i++) {
    buffer.writeInt16LE(pcmData[i], 44 + i * 2);
  }
  
  return buffer;
}

export function convertTwilioAudioToWav(base64Payload: string): Buffer {
  const mulawBuffer = Buffer.from(base64Payload, 'base64');
  const pcm8k = decodeMulaw(mulawBuffer);
  const pcm16k = resampleLinear(pcm8k, 8000, 16000);
  return pcm16ToWavBuffer(pcm16k, 16000);
}

export function convertWavToTwilioAudio(wavBuffer: Buffer): string {
  const dataOffset = 44;
  const pcmData = new Int16Array((wavBuffer.length - dataOffset) / 2);
  for (let i = 0; i < pcmData.length; i++) {
    pcmData[i] = wavBuffer.readInt16LE(dataOffset + i * 2);
  }
  
  const wavSampleRate = wavBuffer.readUInt32LE(24);
  const pcm8k = resampleLinear(pcmData, wavSampleRate, 8000);
  const mulaw = encodeMulaw(pcm8k);
  return mulaw.toString('base64');
}

export class AudioBuffer {
  private chunks: Buffer[] = [];
  private silenceThreshold = 500;
  private silenceFrames = 0;
  private maxSilenceFrames = 24;
  private hasAudio = false;

  addChunk(base64Payload: string): void {
    const buffer = Buffer.from(base64Payload, 'base64');
    this.chunks.push(buffer);
    
    const pcm = decodeMulaw(buffer);
    const avgEnergy = pcm.reduce((sum, s) => sum + Math.abs(s), 0) / pcm.length;
    
    if (avgEnergy > this.silenceThreshold) {
      this.hasAudio = true;
      this.silenceFrames = 0;
    } else if (this.hasAudio) {
      this.silenceFrames++;
    }
  }

  isEndOfSpeech(): boolean {
    return this.hasAudio && this.silenceFrames >= this.maxSilenceFrames;
  }

  hasContent(): boolean {
    return this.hasAudio;
  }

  getWavBuffer(): Buffer {
    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = Buffer.concat(this.chunks);
    const pcm8k = decodeMulaw(combined);
    const pcm16k = resampleLinear(pcm8k, 8000, 16000);
    return pcm16ToWavBuffer(pcm16k, 16000);
  }

  getDuration(): number {
    const totalSamples = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    return totalSamples / 8000;
  }

  reset(): void {
    this.chunks = [];
    this.silenceFrames = 0;
    this.hasAudio = false;
  }
}
