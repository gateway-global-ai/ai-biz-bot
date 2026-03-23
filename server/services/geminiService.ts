/**
 * Server-side Gemini text generation helper.
 * Used by review analysis, pitch generation, knowledge classification, and other BI features.
 * Uses GEMINI_MODEL_FALLBACK for text (generateContent). Voice uses GEMINI_MODEL_ID elsewhere.
 */

import axios from 'axios';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
/** Text-capable model for generateContent (not the voice/native-audio model). */
const TEXT_MODEL = process.env.GEMINI_MODEL_FALLBACK || process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash';

/**
 * Call Gemini generateContent and return the generated text.
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const modelSlug = TEXT_MODEL.replace(/^models\//, '');
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  let response: any;
  try {
    response = await axios.post(
      `${BASE_URL}/models/${modelSlug}:generateContent?key=${apiKey}`,
      payload
    );
  } catch (err: any) {
    if (err.response?.status === 404 && modelSlug !== 'gemini-2.0-flash') {
      response = await axios.post(
        `${BASE_URL}/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        payload
      );
    } else {
      throw err;
    }
  }

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
