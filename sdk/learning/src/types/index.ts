export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLessonPlan?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface LessonPlan {
  topic: string;
  syllabus: {
    id: string;
    title: string;
    description: string;
  }[];
  initialContent: BoardContent;
  environmentDescription?: string;
  instructorDescription?: string;
  backgroundImageUrl?: string;
  instructorImageUrl?: string;
  quiz: QuizQuestion[];
}

export interface BoardContent {
  title: string;
  content: string; // Markdown supported
  diagramType?: 'code' | 'list' | 'text' | 'image';
  codeSnippet?: string;
  bulletPoints?: string[];
  imagePrompt?: string;
  imageUrl?: string;
}

export enum AppView {
  CHAT = 'CHAT',
  CLASSROOM = 'CLASSROOM',
}

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}