/**
 * DISC Profile Estimation Service
 * 
 * Estimates DISC personality profile from user communication patterns.
 * Used to adapt AI responses to user's communication style.
 * 
 * DISC Model:
 * - D (Dominance): Direct, results-oriented, decisive
 * - I (Influence): Enthusiastic, optimistic, social
 * - S (Steadiness): Patient, supportive, reliable
 * - C (Conscientiousness): Analytical, detail-oriented, systematic
 * 
 * Future enhancements:
 * - ML-based DISC estimation from language patterns
 * - Historical user data for more accurate profiling
 * - Combine with prosody features for better accuracy
 */

export interface DISCProfile {
  dominance: number; // 0.0 to 1.0
  influence: number; // 0.0 to 1.0
  steadiness: number; // 0.0 to 1.0
  conscientiousness: number; // 0.0 to 1.0
}

/**
 * Estimate DISC profile from transcript and prosody
 * 
 * @param transcript - User's spoken text
 * @param prosody - Audio prosody features (emotion, sentiment, energy)
 * @returns DISC profile scores (0.0 to 1.0 for each dimension)
 */
export async function estimateDISC(
  transcript: string,
  prosody: { emotion?: string; sentiment?: number; energy?: number }
): Promise<DISCProfile> {
  // TODO: Implement ML-based DISC estimation
  // Options:
  // 1. Train classifier on DISC-labeled text data
  // 2. Use LLM to analyze communication patterns
  // 3. Combine linguistic features with prosody
  
  // For MVP, use simple heuristics
  console.log('[DISCAnalysis] Estimating DISC profile (MVP mode - heuristic-based)');
  
  const words = transcript.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  
  // Heuristic indicators
  const hasImperatives = /\b(do|get|make|need|want|must|should)\b/i.test(transcript);
  const hasQuestions = /\?/.test(transcript);
  const hasPositiveWords = /\b(great|awesome|love|excited|happy|wonderful)\b/i.test(transcript);
  const hasDetailWords = /\b(specifically|exactly|precisely|details|numbers|data)\b/i.test(transcript);
  const hasSupportWords = /\b(help|support|together|team|appreciate|thank)\b/i.test(transcript);
  
  // Prosody indicators
  const isHighEnergy = (prosody.energy || 0.5) > 0.6;
  const isPositiveSentiment = (prosody.sentiment || 0) > 0.2;
  const isExcited = prosody.emotion === 'excited' || prosody.emotion === 'happy';
  
  // Calculate DISC scores (0.0 to 1.0)
  let dominance = 0.4; // Baseline
  let influence = 0.4;
  let steadiness = 0.5;
  let conscientiousness = 0.4;
  
  // Dominance indicators
  if (hasImperatives) dominance += 0.2;
  if (wordCount < 10) dominance += 0.1; // Brief, direct
  if (isHighEnergy && !isExcited) dominance += 0.1;
  
  // Influence indicators
  if (hasPositiveWords) influence += 0.2;
  if (isExcited) influence += 0.2;
  if (isPositiveSentiment) influence += 0.1;
  
  // Steadiness indicators
  if (hasSupportWords) steadiness += 0.2;
  if (!hasImperatives) steadiness += 0.1;
  if (wordCount > 20) steadiness += 0.1; // Patient, detailed explanation
  
  // Conscientiousness indicators
  if (hasDetailWords) conscientiousness += 0.3;
  if (hasQuestions) conscientiousness += 0.1;
  if (wordCount > 30) conscientiousness += 0.1; // Thorough
  
  // Normalize to 0.0-1.0 range
  dominance = Math.min(1.0, Math.max(0.0, dominance));
  influence = Math.min(1.0, Math.max(0.0, influence));
  steadiness = Math.min(1.0, Math.max(0.0, steadiness));
  conscientiousness = Math.min(1.0, Math.max(0.0, conscientiousness));
  
  return {
    dominance,
    influence,
    steadiness,
    conscientiousness
  };
}

/**
 * Future enhancement: Use LLM for DISC estimation
 */
async function estimateWithLLM(transcript: string): Promise<DISCProfile> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this text and estimate the speaker's DISC personality profile. Respond with JSON only:
{
  "dominance": 0.0-1.0,
  "influence": 0.0-1.0,
  "steadiness": 0.0-1.0,
  "conscientiousness": 0.0-1.0
}

DISC Definitions:
- Dominance: Direct, results-oriented, decisive, competitive
- Influence: Enthusiastic, optimistic, social, persuasive
- Steadiness: Patient, supportive, reliable, team-oriented
- Conscientiousness: Analytical, detail-oriented, systematic, precise

Text: "${transcript}"`
          }]
        }]
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  try {
    const parsed = JSON.parse(text);
    return {
      dominance: parsed.dominance || 0.5,
      influence: parsed.influence || 0.5,
      steadiness: parsed.steadiness || 0.5,
      conscientiousness: parsed.conscientiousness || 0.5
    };
  } catch (e) {
    // Fallback if parsing fails
    return {
      dominance: 0.5,
      influence: 0.5,
      steadiness: 0.5,
      conscientiousness: 0.5
    };
  }
}
