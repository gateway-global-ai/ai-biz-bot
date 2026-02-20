/**
 * Voice Transcription REST Handler
 * 
 * Handles PTT (Push-to-Talk) audio uploads for the Standard tier.
 * Processes audio with enriched context (emotion, sentiment, DISC analysis).
 * 
 * Endpoint: POST /api/voice/transcribe
 * 
 * Request:
 * - audio: Audio blob (multipart/form-data)
 * - config: VoiceConfig JSON
 * - business: BusinessContext JSON
 * - agent: AgentConfig JSON
 * 
 * Response:
 * - transcript: Transcribed text
 * - response: AI-generated response
 * - metadata: { emotion, sentiment, disc }
 */

import { Router } from 'express';
import multer from 'multer';
import { analyzeAudioProsody } from '../services/audioAnalysis';
import { estimateDISC } from '../services/discAnalysis';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/api/voice/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const audioBuffer = req.file?.buffer;
    const config = JSON.parse(req.body.config || '{}');
    const business = JSON.parse(req.body.business || '{}');
    const agent = JSON.parse(req.body.agent || '{}');
    
    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    console.log('[VoiceTranscribe] Processing audio:', {
      size: audioBuffer.length,
      mode: config.mode,
      enableAnalysis: config.enableAnalysis
    });
    
    // 1. Transcribe audio using Gemini
    const transcription = await transcribeAudio(audioBuffer);
    console.log('[VoiceTranscribe] Transcription:', transcription);
    
    // 2. Analyze audio if enabled
    let metadata: any = {};
    if (config.enableAnalysis?.emotion || config.enableAnalysis?.sentiment) {
      const prosody = await analyzeAudioProsody(audioBuffer);
      metadata = { ...metadata, ...prosody };
      console.log('[VoiceTranscribe] Prosody analysis:', prosody);
    }
    
    if (config.enableAnalysis?.disc) {
      const disc = await estimateDISC(transcription, metadata);
      metadata.disc = disc;
      console.log('[VoiceTranscribe] DISC profile:', disc);
    }
    
    // 3. Build enriched system instruction
    const systemInstruction = buildSystemInstruction(business, agent, metadata);
    
    // 4. Get AI response from Gemini
    const response = await getGeminiResponse(transcription, systemInstruction);
    console.log('[VoiceTranscribe] AI response:', response);
    
    res.json({
      transcript: transcription,
      response: response,
      metadata: metadata
    });
  } catch (error: any) {
    console.error('[VoiceTranscribe] Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Transcribe audio using Gemini API
 */
async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const base64Audio = audioBuffer.toString('base64');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-native-audio-preview:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Transcribe this audio accurately:' },
            { 
              inline_data: { 
                mime_type: 'audio/webm', 
                data: base64Audio 
              } 
            }
          ]
        }]
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Build system instruction with business context and metadata
 */
function buildSystemInstruction(business: any, agent: any, metadata: any): string {
  let instruction = `Identity: You are ${agent.role} for "${business.name}".
Personality: ${agent.personality}.

BUSINESS CONTEXT:
- Name: ${business.name}
- Address: ${business.address}
${business.hours ? `- Hours: ${business.hours}` : ''}
${business.services ? `- Services: ${business.services.join(', ')}` : ''}

CORE GOAL:
${agent.objectives?.join(' ') || 'Assist customers with their questions.'}

CONSTRAINTS:
${agent.constraints?.join(' ') || 'Be polite and professional.'}`;
  
  // Add emotional intelligence context
  if (metadata.emotion) {
    instruction += `\n\nUSER EMOTIONAL STATE: The user seems ${metadata.emotion}.`;
    
    if (metadata.emotion === 'frustrated' || metadata.emotion === 'angry') {
      instruction += ' Show empathy and patience.';
    } else if (metadata.emotion === 'excited' || metadata.emotion === 'happy') {
      instruction += ' Match their enthusiasm.';
    }
  }
  
  if (metadata.sentiment !== undefined) {
    const sentimentLabel = metadata.sentiment > 0.3 ? 'positive' : metadata.sentiment < -0.3 ? 'negative' : 'neutral';
    instruction += `\nSentiment: ${sentimentLabel} (${metadata.sentiment.toFixed(2)}).`;
  }
  
  if (metadata.disc) {
    instruction += `\n\nUSER COMMUNICATION STYLE (DISC Profile):
- Dominance: ${(metadata.disc.dominance * 100).toFixed(0)}% (${metadata.disc.dominance > 0.6 ? 'Direct, results-oriented' : 'Collaborative'})
- Influence: ${(metadata.disc.influence * 100).toFixed(0)}% (${metadata.disc.influence > 0.6 ? 'Enthusiastic, social' : 'Reserved'})
- Steadiness: ${(metadata.disc.steadiness * 100).toFixed(0)}% (${metadata.disc.steadiness > 0.6 ? 'Patient, supportive' : 'Fast-paced'})
- Conscientiousness: ${(metadata.disc.conscientiousness * 100).toFixed(0)}% (${metadata.disc.conscientiousness > 0.6 ? 'Detail-oriented, analytical' : 'Big-picture'})

Adapt your communication style accordingly.`;
  }
  
  instruction += '\n\nKeep responses natural and concise.';
  
  return instruction;
}

/**
 * Get AI response from Gemini
 */
async function getGeminiResponse(userMessage: string, systemInstruction: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-native-audio-preview:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { 
          parts: [{ text: systemInstruction }] 
        },
        contents: [{ 
          parts: [{ text: userMessage }] 
        }]
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default router;
