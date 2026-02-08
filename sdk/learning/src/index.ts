/**
 * Gateway Global AI Learning SDK
 * 
 * An immersive AI-powered virtual classroom SDK for micro-learning experiences.
 * Integrates with the Gateway Global AI knowledge base for pre-built learning paths
 * on small business topics, Google APIs, and SDK usage.
 * 
 * @example
 * ```typescript
 * import { GatewayLearning } from '@gateway-global/learning-sdk';
 * 
 * // Initialize with a knowledge topic
 * const classroom = GatewayLearning.init({
 *   apiKey: 'your-gemini-api-key',
 *   topic: 'google-business',
 *   container: document.getElementById('learning-container')
 * });
 * 
 * // Or create a custom lesson
 * classroom.createLesson('How to use Google Places API');
 * ```
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import ClassroomInterface from './components/ClassroomInterface';
import ChatInterface from './components/ChatInterface';
import { LessonPlan, AppView } from './types';
import { generateLessonPlan, generateLessonFromKnowledge } from './services/geminiService';
import { KnowledgeAdapter, KNOWLEDGE_TOPICS, LEARNING_PATHS } from './services/knowledgeAdapter';

export interface GatewayLearningConfig {
  /** Gemini API key for AI content generation */
  apiKey: string;
  
  /** Container element to render the classroom */
  container?: HTMLElement;
  
  /** Pre-defined knowledge topic ID */
  topic?: string;
  
  /** Custom lesson topic/question */
  customTopic?: string;
  
  /** Auto-start the lesson without chat interface */
  autoStart?: boolean;
  
  /** Theme configuration */
  theme?: {
    primaryColor?: string;
    accentColor?: string;
  };
  
  /** Callbacks */
  onLessonStart?: (plan: LessonPlan) => void;
  onLessonComplete?: () => void;
  onError?: (error: Error) => void;
}

export class GatewayLearning {
  private config: GatewayLearningConfig;
  private container: HTMLElement;
  private root: any;
  private currentPlan: LessonPlan | null = null;
  
  constructor(config: GatewayLearningConfig) {
    this.config = config;
    
    // Set API key in environment
    if (config.apiKey) {
      (process.env as any).API_KEY = config.apiKey;
    }
    
    // Get or create container
    if (config.container) {
      this.container = config.container;
    } else {
      this.container = document.createElement('div');
      this.container.id = 'gateway-learning-root';
      this.container.style.width = '100%';
      this.container.style.height = '100vh';
      document.body.appendChild(this.container);
    }
    
    // Create React root
    this.root = createRoot(this.container);
  }
  
  /**
   * Initialize the learning SDK
   */
  static init(config: GatewayLearningConfig): GatewayLearning {
    const instance = new GatewayLearning(config);
    
    if (config.autoStart) {
      if (config.topic) {
        instance.startKnowledgeTopic(config.topic);
      } else if (config.customTopic) {
        instance.createLesson(config.customTopic);
      } else {
        instance.showChatInterface();
      }
    } else {
      instance.showChatInterface();
    }
    
    return instance;
  }
  
  /**
   * Show the chat interface for lesson selection
   */
  showChatInterface() {
    this.root.render(
      React.createElement(ChatInterface, {
        onLessonReady: (plan: LessonPlan) => {
          this.currentPlan = plan;
          this.startLesson(plan);
        }
      })
    );
  }
  
  /**
   * Start a lesson from a knowledge base topic
   */
  async startKnowledgeTopic(topicId: string) {
    try {
      const plan = await generateLessonFromKnowledge(topicId);
      this.startLesson(plan);
    } catch (error) {
      console.error('Failed to generate lesson from knowledge:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }
  
  /**
   * Create a custom lesson from a topic/question
   */
  async createLesson(topic: string) {
    try {
      const plan = await generateLessonPlan(topic);
      this.startLesson(plan);
    } catch (error) {
      console.error('Failed to generate lesson:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }
  
  /**
   * Start the classroom with a lesson plan
   */
  private startLesson(plan: LessonPlan) {
    this.currentPlan = plan;
    
    if (this.config.onLessonStart) {
      this.config.onLessonStart(plan);
    }
    
    this.root.render(
      React.createElement(ClassroomInterface, {
        plan,
        onEndClass: () => {
          this.endLesson();
        }
      })
    );
  }
  
  /**
   * End the current lesson
   */
  endLesson() {
    this.currentPlan = null;
    
    if (this.config.onLessonComplete) {
      this.config.onLessonComplete();
    }
    
    this.showChatInterface();
  }
  
  /**
   * Get current lesson plan
   */
  getCurrentLesson(): LessonPlan | null {
    return this.currentPlan;
  }
  
  /**
   * Destroy the SDK instance
   */
  destroy() {
    if (this.root) {
      this.root.unmount();
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
  
  /**
   * Get available knowledge topics
   */
  static getAvailableTopics() {
    return KnowledgeAdapter.getAvailableTopics();
  }
  
  /**
   * Get learning paths
   */
  static getLearningPaths() {
    return KnowledgeAdapter.getLearningPaths();
  }
}

// Export components and types for advanced usage
export { ClassroomInterface, ChatInterface };
export { KnowledgeAdapter, KNOWLEDGE_TOPICS, LEARNING_PATHS };
export type { LessonPlan, BoardContent } from './types';

// Auto-initialization from script tag
if (typeof window !== 'undefined') {
  (window as any).GatewayLearning = GatewayLearning;
  
  // Auto-init from data attributes
  const script = document.currentScript as HTMLScriptElement;
  if (script) {
    const apiKey = script.getAttribute('data-api-key');
    const topic = script.getAttribute('data-topic');
    const customTopic = script.getAttribute('data-custom-topic');
    const autoStart = script.getAttribute('data-auto-start') === 'true';
    
    if (apiKey) {
      GatewayLearning.init({
        apiKey,
        topic: topic || undefined,
        customTopic: customTopic || undefined,
        autoStart,
      });
    }
  }
}

export default GatewayLearning;
