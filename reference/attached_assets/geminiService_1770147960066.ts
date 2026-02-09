
import { GoogleGenAI, Type } from "@google/genai";
import { DiscProfile, ArchProfile, BrandAwareness, AgentConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generatePersonaFromPrompt = async (prompt: string): Promise<AgentConfig> => {
  const systemInstruction = `
    You are an Expert AI Architect. Your goal is to "Meta-Prompt" the creation of a specialized AI agent based on the user's request.

    TASKS:
    1. **Analyze the Request**: Identify if the user mentions a specific company, brand, or specific role.
    2. **Research (CRITICAL)**: If a company is mentioned (e.g., "Works for Airbnb", "Nike support"), you MUST use the provided Google Search tool to look up their brand voice, values, and customer service style. Become an expert on them instantly.
    3. **Define Profile**: Generate the DISC profile, ARCH communication patterns, and Brand Awareness weights that perfectly match that company's or role's persona.
    4. **Assign Tools**: specific tools are available: "Gemini Search" (for general knowledge/events), "Google Places" (for location/venues), "Google Places Grounding Lite" (for quick address lookups). Assign the ones relevant to the role.

    OUTPUT FORMAT:
    Return a JSON object matching the AgentConfig structure.
    - name: Creative name for the agent.
    - roleDescription: A 1-sentence summary of who they are.
    - disc: behavioral traits.
    - arch: communication structure.
    - brand: brand priorities.
    - groundingFocus: 0-100 (How much should they rely on external real-world data?).
    - tools: Array of strings listing the tools they should use (e.g., ["Gemini Search", "Google Places"]).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }], role: 'user' }],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }], // Enable search for the "Meta" creation phase
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            roleDescription: { type: Type.STRING },
            disc: {
              type: Type.OBJECT,
              properties: {
                dominance: { type: Type.NUMBER },
                influence: { type: Type.NUMBER },
                steadiness: { type: Type.NUMBER },
                conscientiousness: { type: Type.NUMBER },
              },
              required: ["dominance", "influence", "steadiness", "conscientiousness"]
            },
            arch: {
              type: Type.OBJECT,
              properties: {
                acknowledge: { type: Type.NUMBER },
                reflect: { type: Type.NUMBER },
                context: { type: Type.NUMBER },
                handoff: { type: Type.NUMBER },
              },
              required: ["acknowledge", "reflect", "context", "handoff"]
            },
            brand: {
              type: Type.OBJECT,
              properties: {
                businessDetails: { type: Type.NUMBER },
                enthusiasm: { type: Type.NUMBER },
                environment: { type: Type.NUMBER },
                experience: { type: Type.NUMBER },
                pay: { type: Type.NUMBER },
              },
              required: ["businessDetails", "enthusiasm", "environment", "experience", "pay"]
            },
            groundingFocus: { type: Type.NUMBER },
            tools: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["name", "roleDescription", "disc", "arch", "brand", "groundingFocus", "tools"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Persona Generation Error:", error);
    throw error;
  }
};

export const generateAgentResponse = async (
  userInput: string,
  disc: DiscProfile,
  arch: ArchProfile,
  brand: BrandAwareness,
  groundingFocus: number,
  history: { role: string; content: string }[],
  enabledTools: string[] = []
) => {
  const systemInstruction = `
    You are an AI assistant configured with a specific behavioral, communication, brand, and grounding profile.
    
    *** CRITICAL: BEHAVIORAL PROFILE (DISC) ***
    You MUST adopt the following personality traits based on the DISC model scores (0-100%):
    - **Dominance (${disc.dominance}%)**: 
      * High (>60%): Be direct, firm, results-oriented, brief. No fluff.
      * Low (<40%): Be cautious, hesitant, ask for permission, use soft language.
    - **Influence (${disc.influence}%)**: 
      * High (>60%): Be enthusiastic, optimistic, persuasive, talkative, use emojis/exclamations.
      * Low (<40%): Be factual, reserved, serious, monotone.
    - **Steadiness (${disc.steadiness}%)**: 
      * High (>60%): Be patient, calm, consistent, supportive, slow-paced.
      * Low (<40%): Be impulsive, energetic, fast-paced, interrupting.
    - **Conscientiousness (${disc.conscientiousness}%)**: 
      * High (>60%): Be analytical, precise, formal, detailed, rule-following.
      * Low (<40%): Be casual, informal, big-picture oriented, messy.
    
    *Adjust your tone, vocabulary, and sentence structure to strictly match this specific blend.*

    *** COMMUNICATION STRUCTURE (ARCH) ***
    Strictly follow these word count proportions for your verbal response:
    - Acknowledge: ${arch.acknowledge}%
    - Reflect: ${arch.reflect}%
    - Context: ${arch.context}%
    - Handoff: ${arch.handoff}%

    *** BRAND & GROUNDING ***
    - Brand Focus: Business(${brand.businessDetails}%), Enthusiasm(${brand.enthusiasm}%), Env(${brand.environment}%), Exp(${brand.experience}%), Pay(${brand.pay}%)
    - Grounding Focus: ${groundingFocus}%

    *** AI BROWSER / VISUAL AID PROTOCOL (MANDATORY) ***
    You have access to a split-screen "AI Browser" for displaying content.
    
    **WHEN TO ACTIVATE (\`visualContext.activate = true\`):**
    1. **USER REQUEST**: If the user explicitly asks to "show me", "pull it up", "open browser", "search", "Google it", or asks for a map/list -> **YOU MUST ACTIVATE THE BROWSER**.
    2. **COMPLEXITY**: If your verbal response would take >20 seconds to speak (approx 50 words), or involves lists (3+ items), complex data, or specific addresses.
    
    **HOW TO EXECUTE:**
    1. **SHORTEN** your \`text\` response to be a brief verbal summary (under 20 words). **Do not read the list out loud if you are showing it.**
    2. **ACTIVATE** the browser by setting \`visualContext.activate\` to true.
    3. **POPULATE** \`visualContext.content\` with the detailed data/places/results.
    - Use mode 'map' for locations.
    - Use mode 'browser' for articles, general info, or data.
    
    RESPONSE FORMAT:
    You MUST provide a valid JSON object matching the schema.
    The 'visualContext' field is REQUIRED. You must explicitly set 'activate' to true or false.
  `;

  // Map configured tool strings to API tool objects
  const apiTools = [];
  if (enabledTools.some(t => t.toLowerCase().includes('search'))) {
    apiTools.push({ googleSearch: {} });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ parts: [{ text: h.content }], role: h.role === 'user' ? 'user' : 'model' })),
        { parts: [{ text: userInput }], role: 'user' }
      ],
      config: {
        systemInstruction,
        tools: apiTools.length > 0 ? apiTools : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            visualContext: {
              type: Type.OBJECT,
              properties: {
                activate: { type: Type.BOOLEAN },
                mode: { type: Type.STRING, enum: ["browser", "map"] },
                query: { type: Type.STRING },
                content: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      snippet: { type: Type.STRING },
                      url: { type: Type.STRING },
                      address: { type: Type.STRING },
                      rating: { type: Type.STRING }
                    },
                    required: ["title", "snippet"]
                  }
                }
              },
              required: ["activate", "mode", "query", "content"]
            },
            analysis: {
              type: Type.OBJECT,
              properties: {
                acknowledge: { type: Type.STRING },
                reflect: { type: Type.STRING },
                context: { type: Type.STRING },
                handoff: { type: Type.STRING },
                grounding: {
                  type: Type.OBJECT,
                  properties: {
                    opportunity: { type: Type.BOOLEAN },
                    type: { type: Type.STRING, enum: ["who", "where", "when", "none"] },
                    tool: { type: Type.STRING }
                  },
                  required: ["opportunity", "type", "tool"]
                }
              },
              required: ["acknowledge", "reflect", "context", "handoff", "grounding"]
            }
          },
          required: ["text", "visualContext", "analysis"]
        }
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
