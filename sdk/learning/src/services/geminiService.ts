import { GoogleGenAI, Type, FunctionDeclaration, Modality, LiveServerMessage } from "@google/genai";
import { LessonPlan, BoardContent } from "../types";
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from "./audioUtils";
import { KnowledgeAdapter } from "./knowledgeAdapter";

const API_KEY = process.env.API_KEY || '';

// --- CHAT & PLAN GENERATION ---

export const generateLessonPlan = async (userRequest: string): Promise<LessonPlan> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // 1. Generate the JSON Structure
  // We use gemini-3-flash-preview for logic and JSON structuring
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create a structured lesson plan for: "${userRequest}". 
    
    Structure Requirements:
    - The syllabus MUST have exactly 6 items:
      1. The "Why": The Hook. Focus strictly on real-world utility.
      2. The "Who": Key players or entities.
      3. The "What": Core mechanics or concepts.
      4. The "Where": Context or environment.
      5. The "When": Timing or historical/future application.
      6. Conclusion: Summary.

    Return a valid JSON object.
    
    Also provide:
    1. 'environmentDescription': Prompt for a cinematic 3D background (no text).
    2. 'instructorDescription': Prompt for a professional AI instructor avatar (portrait).
    3. 'initialContent': The content for the first slide (The "Why").
    4. 'quiz': A set of 5 multiple choice questions to test the user's understanding of the lesson.

    **CRITICAL VISUAL REQUIREMENT**:
    - You MUST provide a 'imagePrompt' for 'initialContent' to visually illustrate the "Why".
    - The prompt should be descriptive, artistic, and educational (e.g. "A dramatic concept art of...").
    - Set 'diagramType' to 'image'.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          environmentDescription: { type: Type.STRING },
          instructorDescription: { type: Type.STRING },
          syllabus: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["id", "title", "description"]
            }
          },
          initialContent: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              diagramType: { type: Type.STRING, enum: ["text", "code", "list", "image"] },
              bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              codeSnippet: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Prompt for generating an educational illustration" }
            },
            required: ["title", "content", "diagramType", "imagePrompt"]
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER, description: "Index of correct answer (0-3)" },
                explanation: { type: Type.STRING, description: "Short explanation of why the answer is correct" }
              },
              required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
            }
          }
        },
        required: ["topic", "syllabus", "initialContent", "environmentDescription", "instructorDescription", "quiz"]
      }
    }
  });

  if (!response.text) {
     console.error("Empty response from Lesson Plan Model");
     throw new Error("AI returned empty response");
  }
  
  // Robust JSON parsing
  let plan: LessonPlan;
  try {
    // Attempt to clean markdown if present (though responseMimeType should handle it)
    const text = response.text;
    plan = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse lesson plan JSON:", err);
    throw new Error("Invalid lesson plan format from AI");
  }

  return plan;
};

/**
 * Generate a lesson plan from a knowledge base topic
 * This integrates with the Gateway Global AI knowledge base
 */
export const generateLessonFromKnowledge = async (topicId: string): Promise<LessonPlan> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Get the knowledge template
  const template = await KnowledgeAdapter.generateLessonFromTopic(topicId);
  
  // Enhance with AI-generated content
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Enhance this lesson plan with detailed content, visual prompts, and engaging quiz questions.
    
    Base Topic: ${template.topic}
    Syllabus: ${JSON.stringify(template.syllabus)}
    Initial Content: ${JSON.stringify(template.initialContent)}
    
    Requirements:
    - Keep the syllabus structure exactly as provided
    - Add rich, educational content for each section
    - Create an imagePrompt for the initial content that's visually striking
    - Generate 5 challenging but fair multiple choice questions
    - Make it engaging and practical for small business owners
    - Focus on real-world applications and Gateway platform capabilities
    
    Return a complete lesson plan in JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          environmentDescription: { type: Type.STRING },
          instructorDescription: { type: Type.STRING },
          syllabus: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["id", "title", "description"]
            }
          },
          initialContent: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              diagramType: { type: Type.STRING, enum: ["text", "code", "list", "image"] },
              bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              codeSnippet: { type: Type.STRING },
              imagePrompt: { type: Type.STRING }
            },
            required: ["title", "content", "diagramType"]
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
            }
          }
        },
        required: ["topic", "syllabus", "initialContent", "environmentDescription", "instructorDescription", "quiz"]
      }
    }
  });

  if (!response.text) {
    throw new Error("AI returned empty response");
  }
  
  let enhancedPlan: LessonPlan;
  try {
    enhancedPlan = JSON.parse(response.text);
  } catch (err) {
    console.error("Failed to parse enhanced lesson plan:", err);
    // Fallback to template-based plan
    return {
      topic: template.topic || 'Learning Topic',
      syllabus: template.syllabus || [],
      initialContent: template.initialContent || {
        title: 'Introduction',
        content: 'Welcome to this lesson',
        diagramType: 'text'
      },
      quiz: template.quiz || [],
      environmentDescription: template.environmentDescription,
      instructorDescription: template.instructorDescription,
    };
  }

  return enhancedPlan;
};

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    plan = JSON.parse(jsonStr) as LessonPlan;
  } catch (e) {
    console.error("Failed to parse lesson plan JSON:", response.text, e);
    throw new Error("Failed to parse AI response. Please try again.");
  }

  // 2. Parallel Generation of Assets (Background & Instructor)
  // We use Promise.allSettled-like logic by catching individual promises to ensure partial success
  try {
    const bgPromise = plan.environmentDescription 
      ? generateClassroomImage(plan.environmentDescription, "16:9")
      : Promise.resolve(undefined);
      
    const avatarPromise = plan.instructorDescription 
      ? generateClassroomImage(plan.instructorDescription, "1:1")
      : Promise.resolve(undefined);

    const [bgUrl, instructorUrl] = await Promise.all([
        bgPromise.catch(e => {
            console.warn("Background generation failed:", e);
            return undefined;
        }),
        avatarPromise.catch(e => {
            console.warn("Avatar generation failed:", e);
            return undefined;
        })
    ]);

    plan.backgroundImageUrl = bgUrl;
    plan.instructorImageUrl = instructorUrl;
  } catch (e) {
    console.error("Asset generation error (non-fatal):", e);
  }

  return plan;
};

// --- IMAGE GENERATION ---

export const generateClassroomImage = async (prompt: string, aspectRatio: "16:9" | "1:1" = "16:9"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  // Using gemini-2.5-flash-image (Nano Banana) for general image tasks as per guidelines
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: { aspectRatio: aspectRatio }
    }
  });

  if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("No image data found in response");
};

// --- TTS GENERATION ---

export const generateSpeech = async (text: string): Promise<Uint8Array> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Fenrir' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("TTS generation failed");
  
  return base64ToUint8Array(base64Audio);
};

// --- LIVE CLASSROOM CONNECTION ---

const updateBoardFunction: FunctionDeclaration = {
  name: 'updateBoard',
  description: 'Update the classroom whiteboard. You MUST provide a unique imagePrompt to generate a visual aid for every slide.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the slide" },
      content: { type: Type.STRING, description: "Main explanation text" },
      diagramType: { type: Type.STRING, description: "Visual layout type: 'text', 'code', 'list', or 'image'" },
      bulletPoints: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of key points if diagramType is 'list'" 
      },
      codeSnippet: { type: Type.STRING, description: "Code example if diagramType is 'code'" },
      imagePrompt: { type: Type.STRING, description: "REQUIRED: A unique, descriptive prompt to generate a new image for this specific slide." }
    },
    required: ['title', 'content', 'diagramType', 'imagePrompt']
  }
};

interface LiveSessionCallbacks {
  onContentUpdate: (content: BoardContent) => void;
  onAudioData: (buffer: AudioBuffer) => void;
  onClose: () => void;
  onError: (error: any) => void;
}

export class ClassroomSession {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private currentSession: any = null;
  private inputAudioContext: AudioContext;
  private audioStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private active: boolean = false;
  private isMuted: boolean = false;

  constructor(private callbacks: LiveSessionCallbacks, private outputAudioContext: AudioContext) {
    this.client = new GoogleGenAI({ apiKey: API_KEY });
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  }

  async connect(lessonContext: LessonPlan) {
    if (this.active) return;
    this.active = true;

    const systemInstruction = `You are an expert instructor for: "${lessonContext.topic}".

    PEDAGOGICAL FRAMEWORK (THE "WHY" METHOD):
    You must follow a specific path when teaching: Why -> Who -> What -> Where -> When.
    1. THE "WHY": UTILITY. Why should the student care? (Real world advantage).
    2. THE "WHO": Key players.
    3. THE "WHAT": Core mechanics.
    4. THE "WHERE": Context.
    5. THE "WHEN": Timing.

    LESSON STRUCTURE:
    ${lessonContext.syllabus.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}

    INSTRUCTIONS:
    - Start immediately with the first item.
    - Speak with authority but warmth.
    - When you finish explaining an item, explicitly say you are moving to the next point and CALL 'updateBoard'.
    - **VISUAL MANDATE**: You MUST provide a unique 'imagePrompt' for EVERY slide update (including the first one) to visualize the concept.
    - The image prompt must be different for every slide and relevant to the specific sub-topic.
    - Use 'diagramType="image"' primarily, unless showing code.
    `;

    try {
      this.sessionPromise = this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          systemInstruction: systemInstruction,
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateBoardFunction] }],
        },
        callbacks: {
          onopen: async () => {
            console.log("Classroom session connected");
            this.startMicrophone();
          },
          onmessage: async (msg: LiveServerMessage) => {
            this.handleMessage(msg);
          },
          onclose: () => {
            console.log("Classroom session closed");
            this.callbacks.onClose();
          },
          onerror: (err) => {
            console.error("Classroom error:", err);
            this.callbacks.onError(err);
          }
        }
      });

      this.currentSession = await this.sessionPromise;
    } catch (e) {
      this.callbacks.onError(e);
      this.active = false;
    }
  }

  // Allow sending text commands to guide the AI
  sendText(text: string) {
    if (!this.active || !this.sessionPromise) return;
    
    this.sessionPromise.then(session => {
       session.send({
         clientContent: {
           turns: [{ role: 'user', parts: [{ text }] }],
           turnComplete: true
         }
       });
    });
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
  }

  private async handleMessage(message: LiveServerMessage) {
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'updateBoard') {
          const content = fc.args as unknown as BoardContent;
          this.callbacks.onContentUpdate(content);
          
          this.sessionPromise?.then(session => {
            session.sendToolResponse({
              functionResponses: {
                id: fc.id,
                name: fc.name,
                response: { result: "Board updated successfully" }
              }
            });
          });
        }
      }
    }

    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBytes = base64ToUint8Array(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext, 24000, 1);
      this.callbacks.onAudioData(audioBuffer);
    }
  }

  private async startMicrophone() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.inputAudioContext.createMediaStreamSource(this.audioStream);
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.active || this.isMuted) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        this.sessionPromise?.then(session => {
           session.sendRealtimeInput({ media: pcmBlob });
        });
      };

      this.source.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);
    } catch (e) {
      console.error("Microphone error", e);
      this.callbacks.onError(e);
    }
  }

  disconnect() {
    this.active = false;
    this.cleanupAudio();
    if (this.currentSession) {
      this.currentSession.close();
      this.currentSession = null;
    } else if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close());
    }
  }

  private cleanupAudio() {
    this.audioStream?.getTracks().forEach(t => t.stop());
    this.processor?.disconnect();
    this.source?.disconnect();
    if (this.inputAudioContext.state !== 'closed') {
        this.inputAudioContext.suspend();
    }
  }
}