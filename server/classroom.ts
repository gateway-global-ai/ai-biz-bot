import { getGeminiClientOrThrow, GEMINI_MODELS } from "./ai-gateway";
import { storage } from "./storage";
import type { InsertLessonPlan, InsertKnowledgeTopic, InsertLessonSession } from "@shared/schema";

const TOKEN_LIMITS = {
  LESSON_GENERATION: 4000,
  LESSON_IMPROVEMENT: 6000,
  SLIDE_CONTENT: 1500,
  QUIZ_GENERATION: 2000,
};

interface SyllabusItem {
  id: string;
  title: string;
  description: string;
}

interface BoardContent {
  title: string;
  content: string;
  diagramType?: 'code' | 'list' | 'text' | 'image';
  codeSnippet?: string;
  bulletPoints?: string[];
  imagePrompt?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface GeneratedLessonPlan {
  topic: string;
  syllabus: SyllabusItem[];
  initialContent: BoardContent;
  environmentDescription?: string;
  instructorDescription?: string;
  quiz: QuizQuestion[];
}

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

export async function generateLessonPlan(userRequest: string): Promise<GeneratedLessonPlan> {
  const client = getGeminiClientOrThrow();

  const prompt = `Create a structured micro-learning lesson plan for: "${userRequest}". 
    
    Structure Requirements using the "WHY" Pedagogical Framework:
    - The syllabus MUST have exactly 6 items:
      1. The "Why": The Hook. Focus strictly on real-world utility. Why should students care?
      2. The "Who": Key players, creators, or entities involved.
      3. The "What": Core mechanics, concepts, or definitions.
      4. The "Where": Context, environment, or applications.
      5. The "When": Timing, historical context, or future applications.
      6. Conclusion: Summary and next steps.

    Return a valid JSON object with this structure:
    {
      "topic": "Main topic title",
      "syllabus": [
        {"id": "1", "title": "Why This Matters", "description": "Brief description"},
        ...
      ],
      "initialContent": {
        "title": "First slide title",
        "content": "Main explanation text",
        "diagramType": "list",
        "bulletPoints": ["Point 1", "Point 2"],
        "imagePrompt": "Description of visual to generate"
      },
      "environmentDescription": "Cinematic 3D background prompt (no text)",
      "instructorDescription": "Professional AI instructor avatar description",
      "quiz": [
        {
          "id": "q1",
          "question": "Quiz question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 0,
          "explanation": "Why this answer is correct"
        }
      ]
    }

    Generate exactly 5 quiz questions to test understanding.
    Make the lesson engaging and practical with real-world examples.
    Return ONLY the JSON object, no markdown or extra text.`;

  const response = await client.chat.completions.create({
    model: GEMINI_MODELS.K2_5,
    messages: [
      { role: 'system', content: 'You are an expert educator creating structured micro-lessons. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: TOKEN_LIMITS.LESSON_GENERATION,
  });

  const text = response.choices[0]?.message?.content || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response");
  }

  const plan = JSON.parse(jsonMatch[0]) as GeneratedLessonPlan;
  return plan;
}

export async function generateSlideContent(topic: string, slideTitle: string, slideDescription: string): Promise<BoardContent> {
  const client = getGeminiClientOrThrow();

  const prompt = `Generate detailed content for a lesson slide.

Topic: ${topic}
Slide Title: ${slideTitle}
Slide Description: ${slideDescription}

Return a JSON object with this structure:
{
  "title": "Slide title",
  "content": "Main explanation (2-3 paragraphs)",
  "diagramType": "list" or "code" or "text" or "image",
  "bulletPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "imagePrompt": "Detailed visual description for image generation"
}

Make content engaging, clear, and practical. Return ONLY the JSON.`;

  const response = await client.chat.completions.create({
    model: GEMINI_MODELS.K2_TURBO,
    messages: [
      { role: 'system', content: 'You are an expert educator. Respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: TOKEN_LIMITS.SLIDE_CONTENT,
  });

  const text = response.choices[0]?.message?.content || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse slide content");
  }

  return JSON.parse(jsonMatch[0]) as BoardContent;
}

export async function getOrCreateLessonForTopic(userRequest: string): Promise<{ lesson: any; isNew: boolean; version: number }> {
  const normalized = normalizeTopic(userRequest);
  
  let topic = await storage.getKnowledgeTopicByNormalized(normalized);
  
  if (topic && topic.bestLessonId) {
    const existingLesson = await storage.getLessonPlanById(topic.bestLessonId);
    if (existingLesson) {
      await storage.incrementTopicRequestCount(topic.id);
      return { lesson: existingLesson, isNew: false, version: existingLesson.version || 1 };
    }
  }

  const generatedPlan = await generateLessonPlan(userRequest);

  if (!topic) {
    topic = await storage.createKnowledgeTopic({
      normalizedTopic: normalized,
      displayTopic: userRequest,
      requestCount: 1,
      currentVersion: 1,
      tags: [],
    });
  } else {
    await storage.incrementTopicRequestCount(topic.id);
  }

  const lessonPlan = await storage.createLessonPlan({
    topicId: topic.id,
    version: topic.currentVersion || 1,
    topic: generatedPlan.topic,
    title: generatedPlan.topic,
    syllabus: generatedPlan.syllabus,
    initialContent: generatedPlan.initialContent,
    quiz: generatedPlan.quiz,
    environmentDescription: generatedPlan.environmentDescription,
    instructorDescription: generatedPlan.instructorDescription,
    completionCount: 0,
    totalQuizAttempts: 0,
    feedback: [],
  });

  await storage.updateTopicBestLesson(topic.id, lessonPlan.id);

  return { lesson: lessonPlan, isNew: true, version: lessonPlan.version || 1 };
}

const IMPROVEMENT_THRESHOLDS = {
  MIN_COMPLETIONS: 5,
  LOW_QUIZ_SCORE: 70,
  FEEDBACK_COUNT: 3,
};

export async function recordLessonCompletion(
  lessonPlanId: string,
  quizScore: number | null,
  slidesViewed: number,
  totalSlides: number,
  feedback?: string,
  rating?: number,
  userPhone?: string
): Promise<{ improved: boolean; newVersion?: number }> {
  await storage.createLessonSession({
    lessonPlanId,
    userPhone,
    quizScore,
    slidesViewed,
    totalSlides,
    feedback,
    rating,
    completedAt: new Date(),
  });

  await storage.incrementLessonCompletionCount(lessonPlanId);
  
  if (quizScore !== null) {
    await storage.updateLessonQuizStats(lessonPlanId, quizScore);
  }

  const lesson = await storage.getLessonPlanById(lessonPlanId);
  if (!lesson || !lesson.topicId) {
    return { improved: false };
  }

  const completions = lesson.completionCount || 0;
  const avgScore = lesson.avgQuizScore || 100;
  const sessions = await storage.getLessonSessionsByLessonId(lessonPlanId);
  const feedbackCount = sessions.filter((s: any) => s.feedback).length;

  const shouldImprove = 
    completions >= IMPROVEMENT_THRESHOLDS.MIN_COMPLETIONS &&
    (avgScore < IMPROVEMENT_THRESHOLDS.LOW_QUIZ_SCORE || feedbackCount >= IMPROVEMENT_THRESHOLDS.FEEDBACK_COUNT);

  if (shouldImprove) {
    try {
      console.log(`[Classroom] Auto-improving lesson ${lessonPlanId} (score: ${avgScore}%, completions: ${completions})`);
      const improved = await improveLessonPlan(lesson.topicId);
      return { improved: true, newVersion: improved.version };
    } catch (error: any) {
      console.error(`[Classroom] Auto-improvement failed: ${error.message}`);
      return { improved: false };
    }
  }

  return { improved: false };
}

export async function improveLessonPlan(topicId: string): Promise<any> {
  const topic = await storage.getKnowledgeTopicById(topicId);
  if (!topic) throw new Error("Topic not found");

  const currentLesson = topic.bestLessonId ? await storage.getLessonPlanById(topic.bestLessonId) : null;
  const sessions = await storage.getLessonSessionsByLessonId(topic.bestLessonId || "");
  
  const feedbackList = sessions
    .filter((s: any) => s.feedback)
    .map((s: any) => s.feedback)
    .slice(-10);
  
  const avgScore = sessions.length > 0
    ? sessions.reduce((sum: number, s: any) => sum + (s.quizScore || 0), 0) / sessions.length
    : null;

  const client = getGeminiClientOrThrow();

  const improvementPrompt = `You are improving an existing lesson plan based on user feedback and performance data.

CURRENT LESSON:
Topic: ${topic.displayTopic}
${currentLesson ? `Current syllabus: ${JSON.stringify(currentLesson.syllabus)}` : ''}

PERFORMANCE DATA:
- Times requested: ${topic.requestCount}
- Average quiz score: ${avgScore !== null ? Math.round(avgScore) + '%' : 'No data'}
- User feedback: ${feedbackList.length > 0 ? feedbackList.join('; ') : 'None yet'}

TASK:
Create an IMPROVED version of this lesson that:
1. Addresses any low quiz scores by clarifying confusing concepts
2. Incorporates user feedback
3. Makes the content more engaging if engagement was low
4. Keeps what worked well

Return the same JSON structure as the original lesson plan with improved content.`;

  const response = await client.chat.completions.create({
    model: GEMINI_MODELS.K2_5,
    messages: [
      { role: 'system', content: 'You are an expert educator improving lessons based on data. Respond with valid JSON only.' },
      { role: 'user', content: improvementPrompt }
    ],
    max_tokens: TOKEN_LIMITS.LESSON_IMPROVEMENT,
  });

  const text = response.choices[0]?.message?.content || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse improved lesson");
  }

  const improvedPlan = JSON.parse(jsonMatch[0]) as GeneratedLessonPlan;
  const newVersion = (topic.currentVersion || 1) + 1;

  const newLessonPlan = await storage.createLessonPlan({
    topicId: topic.id,
    version: newVersion,
    topic: improvedPlan.topic,
    title: improvedPlan.topic,
    syllabus: improvedPlan.syllabus,
    initialContent: improvedPlan.initialContent,
    quiz: improvedPlan.quiz,
    environmentDescription: improvedPlan.environmentDescription,
    instructorDescription: improvedPlan.instructorDescription,
    completionCount: 0,
    totalQuizAttempts: 0,
    feedback: [],
  });

  await storage.updateTopicVersion(topic.id, newVersion, newLessonPlan.id);

  return newLessonPlan;
}

export async function getPopularTopics(limit: number = 10): Promise<any[]> {
  return storage.getPopularKnowledgeTopics(limit);
}

export async function getLessonById(id: string) {
  return storage.getLessonPlanById(id);
}
