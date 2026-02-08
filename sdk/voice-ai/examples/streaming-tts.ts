/**
 * Streaming TTS Example
 * Demonstrates real-time audio streaming
 */

import { VoiceAI } from '../src/voice-ai-sdk';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const voiceAI = new VoiceAI({
    defaultProvider: 'inworld',
    providers: {
      inworld: {
        provider: 'inworld',
        apiKey: process.env.INWORLD_API_KEY || '',
        model: 'tts-1.5-max'
      },
      openai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || ''
      }
    }
  });

  await voiceAI.initialize();

  console.log('=== Streaming TTS Example ===\n');

  const text = 'This is a demonstration of streaming text-to-speech. ' +
    'The audio chunks are delivered in real-time as they are generated, ' +
    'enabling low-latency voice applications.';

  const audioChunks: Buffer[] = [];
  let chunkCount = 0;

  console.log('Streaming TTS with Inworld (sub-200ms latency)...');
  console.time('streaming');

  await voiceAI.synthesizeStreaming({
    text,
    provider: 'inworld',
    onAudioChunk: (chunk) => {
      audioChunks.push(chunk);
      chunkCount++;
      process.stdout.write(`\r  Received chunk ${chunkCount} (${audioChunks.reduce((a, b) => a + b.length, 0)} bytes)`);
    },
    onComplete: () => {
      console.log('\n  Stream complete!');
    },
    onError: (error) => {
      console.error('  Error:', error.message);
    }
  });

  console.timeEnd('streaming');

  // Save combined audio
  const combinedAudio = Buffer.concat(audioChunks);
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  fs.writeFileSync(path.join(outputDir, 'streaming-tts.raw'), combinedAudio);
  console.log(`\nSaved to: output/streaming-tts.raw (${combinedAudio.length} bytes)`);

  // Compare with OpenAI
  console.log('\n--- Comparison with OpenAI ---');
  const openaiChunks: Buffer[] = [];
  
  console.time('openai-streaming');
  await voiceAI.synthesizeStreaming({
    text: 'Quick test with OpenAI.',
    provider: 'openai',
    onAudioChunk: (chunk) => {
      openaiChunks.push(chunk);
    },
    onComplete: () => {
      console.log('OpenAI stream complete');
    },
    onError: (error) => {
      console.error('Error:', error.message);
    }
  });
  console.timeEnd('openai-streaming');

  await voiceAI.dispose();
}

main().catch(console.error);
