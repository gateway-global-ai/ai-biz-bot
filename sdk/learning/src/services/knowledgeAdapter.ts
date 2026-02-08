import { LessonPlan, BoardContent, QuizQuestion } from '../types';

/**
 * Knowledge Base Topics for Small Business Learning
 * These topics are aligned with the Gateway Global AI knowledge base
 */
export const KNOWLEDGE_TOPICS = {
  GOOGLE_BUSINESS: {
    id: 'google-business',
    name: 'Google Business APIs for Small Business',
    description: 'Master Google Places, Business Profile, and Maps APIs',
    knowledgeCategories: ['google_api', 'business_tools'],
  },
  GOOGLE_WORKSPACE: {
    id: 'google-workspace',
    name: 'Google Workspace Integration',
    description: 'Learn to integrate Gmail, Calendar, Drive, and Docs',
    knowledgeCategories: ['google_api', 'workspace'],
  },
  AI_CHATBOTS: {
    id: 'ai-chatbots',
    name: 'AI Chatbots for Business',
    description: 'Build and deploy AI-powered customer service bots',
    knowledgeCategories: ['ai', 'chatbots', 'customer_service'],
  },
  VOICE_AI: {
    id: 'voice-ai',
    name: 'Voice AI and Telephony',
    description: 'Implement voice assistants and phone automation',
    knowledgeCategories: ['voice_ai', 'telephony', 'twilio'],
  },
  WEBSITE_GENERATION: {
    id: 'website-generation',
    name: '30-Second AI Website Generation',
    description: 'Create professional websites instantly with AI',
    knowledgeCategories: ['ai', 'website_builder', 'automation'],
  },
  GATEWAY_SDK: {
    id: 'gateway-sdk',
    name: 'Gateway Global AI SDK',
    description: 'Learn to use the Gateway Chat and Voice AI SDKs',
    knowledgeCategories: ['sdk', 'integration', 'development'],
  },
};

/**
 * Predefined Learning Paths for Small Business Topics
 */
export const LEARNING_PATHS = {
  'getting-started': {
    title: 'Getting Started with Gateway AI',
    topics: [
      KNOWLEDGE_TOPICS.WEBSITE_GENERATION,
      KNOWLEDGE_TOPICS.AI_CHATBOTS,
      KNOWLEDGE_TOPICS.GATEWAY_SDK,
    ],
  },
  'google-integration': {
    title: 'Master Google Business Tools',
    topics: [
      KNOWLEDGE_TOPICS.GOOGLE_BUSINESS,
      KNOWLEDGE_TOPICS.GOOGLE_WORKSPACE,
    ],
  },
  'voice-automation': {
    title: 'Voice AI and Automation',
    topics: [
      KNOWLEDGE_TOPICS.VOICE_AI,
      KNOWLEDGE_TOPICS.AI_CHATBOTS,
    ],
  },
};

/**
 * Knowledge content templates for lesson generation
 */
export interface KnowledgeContent {
  topic: string;
  category: string;
  subcategory: string;
  syllabus: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  content: {
    overview: string;
    keyPoints: string[];
    examples: string[];
    bestPractices: string[];
  };
  quizQuestions?: QuizQuestion[];
}

/**
 * Template for Google Business APIs lesson
 */
export const GOOGLE_BUSINESS_TEMPLATE: KnowledgeContent = {
  topic: 'Google Business APIs for Small Business Success',
  category: 'google_api',
  subcategory: 'business_tools',
  syllabus: [
    {
      id: 'why',
      title: 'Why Google Business APIs Matter',
      description: 'Understanding the competitive advantage for small businesses',
    },
    {
      id: 'who',
      title: 'Key APIs and Services',
      description: 'Places API, Business Profile, Maps, and more',
    },
    {
      id: 'what',
      title: 'Core Capabilities',
      description: 'What you can build with Google Business APIs',
    },
    {
      id: 'where',
      title: 'Use Cases and Applications',
      description: 'Real-world scenarios for small businesses',
    },
    {
      id: 'when',
      title: 'Implementation Strategy',
      description: 'When and how to integrate these APIs',
    },
    {
      id: 'conclusion',
      title: 'Next Steps',
      description: 'Your roadmap to implementation',
    },
  ],
  content: {
    overview:
      'Google Business APIs provide small businesses with enterprise-level capabilities to manage their online presence, engage customers, and automate operations. With the Gateway Global AI platform, you can integrate these powerful tools in minutes.',
    keyPoints: [
      'Google Places API provides access to millions of business listings and reviews',
      'Business Profile API lets you manage your Google Business Profile programmatically',
      'Maps Platform enables location-based features and geocoding',
      'Workspace APIs integrate Gmail, Calendar, Drive, and Docs into your business',
      'Gateway platform simplifies integration with pre-built connectors',
    ],
    examples: [
      'Automatically display customer reviews from Google on your website',
      'Update business hours across all platforms from one dashboard',
      'Generate leads by finding businesses without websites using Places API',
      'Create automated email campaigns using Gmail API',
      'Schedule appointments directly to Google Calendar',
    ],
    bestPractices: [
      'Start with free tier API usage to minimize costs',
      'Implement caching to reduce API calls',
      'Use service accounts for server-to-server authentication',
      'Monitor API quotas and set up alerts',
      'Follow Google\'s best practices for data handling and privacy',
    ],
  },
  quizQuestions: [
    {
      id: 'q1',
      question: 'What is the primary benefit of Google Places API for small businesses?',
      options: [
        'It\'s completely free with no limits',
        'It provides access to business listings, reviews, and location data',
        'It automatically creates websites',
        'It replaces the need for a website',
      ],
      correctAnswerIndex: 1,
      explanation:
        'Google Places API provides access to millions of business listings, reviews, photos, and location data, enabling businesses to enhance their online presence and customer engagement.',
    },
    {
      id: 'q2',
      question: 'Which Gateway feature helps minimize Google API costs?',
      options: [
        'Unlimited free API calls',
        'Built-in caching and request optimization',
        'Replacing Google APIs with alternatives',
        'Monthly subscription includes all API costs',
      ],
      correctAnswerIndex: 1,
      explanation:
        'Gateway implements intelligent caching and request optimization to minimize API calls, helping businesses stay within free tiers and reduce costs when scaling.',
    },
    {
      id: 'q3',
      question: 'What can you do with the Google Business Profile API?',
      options: [
        'Only view your business profile',
        'Update business information programmatically',
        'Delete competitor listings',
        'Guarantee top search rankings',
      ],
      correctAnswerIndex: 1,
      explanation:
        'The Business Profile API allows you to programmatically update business information, respond to reviews, post updates, and manage your Google Business Profile from your own systems.',
    },
    {
      id: 'q4',
      question: 'Which Google Workspace API is most useful for customer communication?',
      options: [
        'Google Sheets API',
        'Google Slides API',
        'Gmail API',
        'Google Forms API',
      ],
      correctAnswerIndex: 2,
      explanation:
        'Gmail API enables programmatic email management, allowing businesses to automate customer communications, create email campaigns, and integrate email into their workflows.',
    },
    {
      id: 'q5',
      question: 'What is the best first step when integrating Google APIs?',
      options: [
        'Purchase enterprise licenses immediately',
        'Start with free tier and test use cases',
        'Hire a Google certified developer',
        'Build everything from scratch',
      ],
      correctAnswerIndex: 1,
      explanation:
        'Starting with the free tier allows you to test use cases, understand your API usage patterns, and validate your integration before committing to paid services. Gateway makes this easy with pre-built integrations.',
    },
  ],
};

/**
 * Template for Gateway SDK lesson
 */
export const GATEWAY_SDK_TEMPLATE: KnowledgeContent = {
  topic: 'Master the Gateway Global AI SDK',
  category: 'sdk',
  subcategory: 'development',
  syllabus: [
    {
      id: 'why',
      title: 'Why Use Gateway SDKs',
      description: 'The power of pre-built AI integrations',
    },
    {
      id: 'who',
      title: 'Available SDKs',
      description: 'Chat SDK, Voice AI SDK, and Learning SDK',
    },
    {
      id: 'what',
      title: 'Core Features',
      description: 'What you can build with Gateway SDKs',
    },
    {
      id: 'where',
      title: 'Integration Scenarios',
      description: 'Where to use each SDK effectively',
    },
    {
      id: 'when',
      title: 'Quick Start Guide',
      description: 'Get up and running in 5 minutes',
    },
    {
      id: 'conclusion',
      title: 'Advanced Topics',
      description: 'Customization and optimization',
    },
  ],
  content: {
    overview:
      'Gateway Global AI SDKs provide drop-in solutions for adding AI-powered chat, voice, and learning capabilities to any website or application. No backend required - just include a script tag and configure.',
    keyPoints: [
      'Chat SDK: Embeddable AI chatbot widget with voice support',
      'Voice AI SDK: Multi-provider voice integration (TTS, STT, Real-time)',
      'Learning SDK: Interactive virtual classroom for micro-learning',
      'Zero backend setup - all AI processing handled by Gateway platform',
      'Extensive customization options for branding and behavior',
    ],
    examples: [
      'Add AI chat to your website with a single script tag',
      'Create voice-enabled customer service with Voice AI SDK',
      'Build interactive training modules with Learning SDK',
      'Customize chat widget to match your brand',
      'Integrate with your existing CRM and tools',
    ],
    bestPractices: [
      'Use Shadow DOM for CSS isolation',
      'Implement proper error handling and fallbacks',
      'Test voice features across different browsers',
      'Cache SDK responses for better performance',
      'Monitor usage and optimize API calls',
    ],
  },
};

/**
 * Service to adapt knowledge base content into lesson plans
 */
export class KnowledgeAdapter {
  /**
   * Generate a lesson plan from a knowledge topic
   */
  static async generateLessonFromTopic(
    topicId: string,
    apiKey?: string
  ): Promise<Partial<LessonPlan>> {
    const topic = Object.values(KNOWLEDGE_TOPICS).find(t => t.id === topicId);
    
    if (!topic) {
      throw new Error(`Unknown topic: ${topicId}`);
    }

    // Get template based on topic
    let template: KnowledgeContent;
    switch (topicId) {
      case 'google-business':
      case 'google-workspace':
        template = GOOGLE_BUSINESS_TEMPLATE;
        break;
      case 'gateway-sdk':
        template = GATEWAY_SDK_TEMPLATE;
        break;
      default:
        // Generate from knowledge base API if available
        template = await this.fetchFromKnowledgeBase(topic.knowledgeCategories);
    }

    return {
      topic: template.topic,
      syllabus: template.syllabus,
      initialContent: {
        title: template.syllabus[0].title,
        content: template.content.overview,
        diagramType: 'list',
        bulletPoints: template.content.keyPoints,
      },
      quiz: template.quizQuestions || [],
      environmentDescription:
        'A modern, professional tech startup office with large screens displaying data visualizations and futuristic holographic interfaces',
      instructorDescription:
        'A professional AI instructor avatar - friendly, approachable, wearing smart casual attire, with a warm smile',
    };
  }

  /**
   * Fetch content from knowledge base API
   * This connects to the Gateway platform's knowledge base
   */
  private static async fetchFromKnowledgeBase(
    categories: string[]
  ): Promise<KnowledgeContent> {
    try {
      // In production, this would call the knowledge base API
      // For now, return a default template
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          limit: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return this.transformKnowledgeToTemplate(data);
      }
    } catch (error) {
      console.warn('Knowledge base API unavailable, using default template');
    }

    // Fallback to default template
    return GOOGLE_BUSINESS_TEMPLATE;
  }

  /**
   * Transform knowledge base API response into lesson template
   */
  private static transformKnowledgeToTemplate(data: any): KnowledgeContent {
    // Transform API response to our template format
    return {
      topic: data.title || 'Learning Topic',
      category: data.category || 'general',
      subcategory: data.subcategory || '',
      syllabus: [
        { id: 'why', title: 'Why This Matters', description: 'Introduction' },
        { id: 'who', title: 'Key Players', description: 'Who uses this' },
        { id: 'what', title: 'Core Concepts', description: 'What to know' },
        { id: 'where', title: 'Applications', description: 'Where to use' },
        { id: 'when', title: 'Implementation', description: 'When to apply' },
        { id: 'conclusion', title: 'Summary', description: 'Wrap up' },
      ],
      content: {
        overview: data.summary || data.content || 'No overview available',
        keyPoints: data.tags || [],
        examples: [],
        bestPractices: [],
      },
    };
  }

  /**
   * Get all available topics
   */
  static getAvailableTopics() {
    return Object.values(KNOWLEDGE_TOPICS);
  }

  /**
   * Get learning paths
   */
  static getLearningPaths() {
    return LEARNING_PATHS;
  }
}
