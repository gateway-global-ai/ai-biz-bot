/**
 * Server-side Gemini text generation helper.
 * Used by review analysis, pitch generation, and other BI features.
 * api-lockdown: use GEMINI_MODEL_ID only; set in Doppler.
 */

import axios from 'axios';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || 'models/gemini-2.5-flash-native-audio-preview-12-2025';

/**
 * Call Gemini generateContent and return the generated text.
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const response = await axios.post(
    `${BASE_URL}/models/${GEMINI_MODEL_ID}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text;
}

/**
 * Call Gemini and parse JSON from the response (expects a single JSON object in the text).
 */
export async function generateJsonWithGemini<T = unknown>(prompt: string): Promise<T> {
  const text = await generateWithGemini(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as T;
  }
  throw new Error('No valid JSON found in Gemini response');
}
