/**
 * Push-to-Talk Voice Service
 * Handles PTT interactions with Google Gemini Live API
 */
import { GoogleGenAI, Modality } from '@google/genai';

interface PTTSessionConfig {
  agentId: string;
  model?: string;
  voice?: string;
  systemPrompt?: string;
}

interface PTTResponse {
  success: boolean;
  transcript?: string;
  responseText?: string;
  responseAudio?: Buffer;
  error?: string;
}

export class PushToTalkService {
  private client: GoogleGenAI;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    this.client = new GoogleGenAI({ apiKey });
  }
  
  /**
   * Process a PTT audio recording
   * @param audioBuffer - The recorded audio (WebM format from browser)
   * @param config - Session configuration
   * @param conversationHistory - Previous conversation messages
   */
  async processPTTAudio(
    audioBuffer: Buffer,
    config: PTTSessionConfig,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<PTTResponse> {
    try {
      const model = config.model || 'gemini-2.5-flash-native-audio-preview-12-2025';
      const voice = config.voice || 'Puck';
      const systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.';
      
      // Convert audio buffer to base64
      const audioBase64 = audioBuffer.toString('base64');
      
      // Build conversation context
      const contents: any[] = [];
      
      // Add conversation history
      conversationHistory.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });
      
      // Add current audio input
      contents.push({
        role: 'user',
        parts: [{
          inlineData: {
            mimeType: 'audio/webm',
            data: audioBase64
          }
        }]
      });
      
      // Configure for Live API with proper settings
      // Note: Using generateContent for PTT (one-shot), not live.connect
      const response = await this.client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          responseModalities: ['AUDIO', 'TEXT'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          },
          // Audio processing configuration
          audioConfig: {
            enableAutomaticSpeechRecognition: true,
            enableTextToSpeech: true,
            // Input audio is expected at 16kHz (browser standard)
            // Output audio will be 24kHz (Gemini native)
            inputAudioSampleRate: 16000,
            outputAudioSampleRate: 24000,
          },
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
          }
        }
      });
      
      // Extract response
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        return {
          success: false,
          error: 'No response from AI'
        };
      }
      
      const parts = candidates[0].content?.parts || [];
      let responseText = '';
      let responseAudio: Buffer | undefined;
      let userTranscript = '';
      
      // Extract text and audio from response
      for (const part of parts) {
        if (part.text) {
          responseText += part.text;
        }
        if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
          // Audio is PCM 24kHz from Gemini
          responseAudio = Buffer.from(part.inlineData.data, 'base64');
        }
      }
      
      // Extract user transcript from response metadata
      userTranscript = this.extractUserTranscript(response) || 'Audio message received';
      
      return {
        success: true,
        transcript: userTranscript,
        responseText,
        responseAudio
      };
    } catch (error: any) {
      console.error('[PTT Service] Error processing audio:', error);
      return {
        success: false,
        error: error.message || 'Failed to process audio'
      };
    }
  }
  
  /**
   * Transcribe audio only (STT)
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<{ success: boolean; transcript?: string; error?: string }> {
    try {
      const audioBase64 = audioBuffer.toString('base64');
      
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview',
        contents: [{
          role: 'user',
          parts: [{
            inlineData: {
              mimeType: 'audio/webm',
              data: audioBase64
            }
          }, {
            text: 'Please transcribe this audio.'
          }]
        }],
        config: {
          responseModalities: [Modality.TEXT]
        }
      });
      
      const text = response.text || '';
      
      return {
        success: true,
        transcript: text
      };
    } catch (error: any) {
      console.error('[PTT Service] Transcription error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate speech from text (TTS)
   */
  async generateSpeech(text: string, voice: string = 'Puck'): Promise<{ success: boolean; audio?: Buffer; error?: string }> {
    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview',
        contents: text,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          }
        }
      });
      
      // Extract audio from response
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
          return {
            success: true,
            audio: Buffer.from(part.inlineData.data, 'base64')
          };
        }
      }
      
      return {
        success: false,
        error: 'No audio in response'
      };
    } catch (error: any) {
      console.error('[PTT Service] TTS error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  private extractUserTranscript(response: any): string | null {
    // Try to find transcript in response metadata
    // This is a placeholder - actual implementation depends on Gemini API response structure
    try {
      const metadata = response.candidates?.[0]?.metadata;
      if (metadata?.userTranscript) {
        return metadata.userTranscript;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }
}

// Singleton instance
let pttService: PushToTalkService | null = null;

export function getPTTService(): PushToTalkService {
  if (!pttService) {
    pttService = new PushToTalkService();
  }
  return pttService;
}
