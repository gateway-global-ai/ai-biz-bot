import { LessonPlan, BoardContent } from "./types";
import { apiRequest } from "@/lib/queryClient";

export async function generateLessonPlan(userRequest: string): Promise<LessonPlan> {
  const response = await apiRequest('POST', '/api/classroom/lesson', { topic: userRequest });
  const data = await response.json();
  
  if (!data.lesson) {
    throw new Error("Failed to generate lesson plan");
  }
  
  const lessonContent = typeof data.lesson.content === 'string' 
    ? JSON.parse(data.lesson.content) 
    : data.lesson.content;
  
  return {
    topic: lessonContent.topic || userRequest,
    syllabus: lessonContent.syllabus || [],
    initialContent: lessonContent.initialContent || {
      title: "Getting Started",
      content: "Introduction to " + userRequest,
      diagramType: "text"
    },
    environmentDescription: lessonContent.environmentDescription,
    instructorDescription: lessonContent.instructorDescription,
    quiz: lessonContent.quiz || [],
  };
}

export async function generateSlideContent(
  topic: string, 
  slideTitle: string, 
  slideDescription: string
): Promise<BoardContent> {
  const response = await apiRequest('POST', '/api/classroom/slide-content', {
    topic,
    slideTitle,
    slideDescription
  });
  const data = await response.json();
  return data;
}

export async function generateClassroomImage(prompt: string, aspectRatio: "16:9" | "1:1" = "16:9"): Promise<string> {
  try {
    const response = await apiRequest('POST', '/api/classroom/generate-image', {
      prompt,
      aspectRatio
    });
    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.warn("Image generation not available, using placeholder");
    return "";
  }
}

export async function generateSpeech(text: string): Promise<Uint8Array> {
  try {
    const response = await apiRequest('POST', '/api/classroom/tts', { text });
    const data = await response.json();
    
    if (data.audioUrl) {
      const audioResponse = await fetch(data.audioUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      return new Uint8Array(audioBuffer);
    }
    
    throw new Error("No audio data returned");
  } catch (error) {
    console.warn("TTS not available:", error);
    return new Uint8Array();
  }
}

interface LiveSessionCallbacks {
  onContentUpdate: (content: BoardContent) => void;
  onAudioData: (buffer: AudioBuffer) => void;
  onClose: () => void;
  onError: (error: any) => void;
}

export class ClassroomSession {
  private callbacks: LiveSessionCallbacks;
  private outputAudioContext: AudioContext;
  private isActive: boolean = false;
  private currentPlan: LessonPlan | null = null;
  private currentSlideIndex: number = 0;
  private isMuted: boolean = false;

  constructor(callbacks: LiveSessionCallbacks, outputAudioContext: AudioContext) {
    this.callbacks = callbacks;
    this.outputAudioContext = outputAudioContext;
  }

  async connect(lessonContext: LessonPlan) {
    this.isActive = true;
    this.currentPlan = lessonContext;
    this.currentSlideIndex = 0;
    
    this.callbacks.onContentUpdate(lessonContext.initialContent);
    
    if (lessonContext.initialContent.title) {
      await this.narrateSlide(lessonContext.initialContent);
    }
  }

  private async narrateSlide(content: BoardContent) {
    if (!this.isActive || this.isMuted) return;
    
    try {
      const textToRead = [
        content.title,
        content.content,
        content.bulletPoints?.join(". ")
      ].filter(Boolean).join(". ");

      const audioBytes = await generateSpeech(textToRead);
      if (audioBytes.length > 0) {
        const audioBuffer = await this.decodeAudio(audioBytes);
        this.callbacks.onAudioData(audioBuffer);
      }
    } catch (error) {
      console.warn("Narration failed:", error);
    }
  }

  private async decodeAudio(data: Uint8Array): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = this.outputAudioContext.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
  }

  sendText(text: string) {
    if (!this.isActive || !this.currentPlan) return;
    
    const lowerText = text.toLowerCase();
    if (lowerText.includes("next") || lowerText.includes("continue")) {
      this.nextSlide();
    } else if (lowerText.includes("previous") || lowerText.includes("back")) {
      this.previousSlide();
    }
  }

  async nextSlide() {
    if (!this.currentPlan) return;
    
    const syllabus = this.currentPlan.syllabus;
    if (this.currentSlideIndex < syllabus.length - 1) {
      this.currentSlideIndex++;
      const nextItem = syllabus[this.currentSlideIndex];
      
      try {
        const content = await generateSlideContent(
          this.currentPlan.topic,
          nextItem.title,
          nextItem.description
        );
        
        this.callbacks.onContentUpdate(content);
        await this.narrateSlide(content);
      } catch (error) {
        console.error("Failed to generate slide:", error);
      }
    }
  }

  previousSlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
  }

  disconnect() {
    this.isActive = false;
    this.currentPlan = null;
  }
}
