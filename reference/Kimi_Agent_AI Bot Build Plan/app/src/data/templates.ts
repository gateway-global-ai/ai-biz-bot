import type { BotTemplate } from '@/types';

export const botTemplates: BotTemplate[] = [
  {
    id: 'tpl-sales-001',
    name: 'Sales Assistant',
    description: 'Convert visitors into customers with intelligent product recommendations and pricing guidance.',
    category: 'sales',
    default_system_prompt: `You are a helpful Sales Assistant. Your goal is to:
1. Understand customer needs through thoughtful questions
2. Recommend relevant products or services
3. Address objections professionally
4. Guide toward a purchase decision
5. Always be friendly, persuasive but not pushy

If you don't know specific product details, ask the user for more information rather than making assumptions.`,
    default_model: 'openai',
    default_tools: {
      webSearch: true,
      fileUpload: false,
      codeInterpreter: false,
      apiCalls: true,
    },
    default_ui_config: {
      interface: 'chat',
      position: 'bottom-right',
      primaryColor: '#10b981',
      greetingMessage: 'Hi there! Looking for something specific? I can help you find the perfect solution.',
      placeholderText: 'Ask about our products...',
    },
    icon: 'ShoppingCart',
  },
  {
    id: 'tpl-support-001',
    name: 'Support Agent',
    description: 'Provide instant technical support and troubleshoot issues 24/7.',
    category: 'support',
    default_system_prompt: `You are a technical Support Agent. Your role is to:
1. Listen carefully to user issues
2. Ask clarifying questions to diagnose problems
3. Provide step-by-step troubleshooting guidance
4. Escalate complex issues when necessary
5. Always be patient, empathetic, and professional

If you cannot resolve an issue, clearly explain next steps and expected timelines.`,
    default_model: 'anthropic',
    default_tools: {
      webSearch: true,
      fileUpload: true,
      codeInterpreter: false,
      apiCalls: true,
    },
    default_ui_config: {
      interface: 'chat',
      position: 'bottom-right',
      primaryColor: '#3b82f6',
      greetingMessage: 'Hello! I\'m here to help. What issue are you experiencing today?',
      placeholderText: 'Describe your problem...',
    },
    icon: 'HeadphonesIcon',
  },
  {
    id: 'tpl-onboarding-001',
    name: 'Onboarding Guide',
    description: 'Walk new users through product features and help them achieve their first success.',
    category: 'onboarding',
    default_system_prompt: `You are an Onboarding Guide. Your mission is to:
1. Welcome new users warmly
2. Understand their goals and use case
3. Guide them through key features step-by-step
4. Celebrate their progress and milestones
5. Ensure they achieve their "aha moment" quickly

Keep responses concise and actionable. Use encouraging language and avoid overwhelming users with too much information at once.`,
    default_model: 'kimi',
    default_tools: {
      webSearch: false,
      fileUpload: true,
      codeInterpreter: true,
      apiCalls: false,
    },
    default_ui_config: {
      interface: 'chat',
      position: 'bottom-right',
      primaryColor: '#8b5cf6',
      greetingMessage: 'Welcome! 🎉 I\'m your personal onboarding guide. Let\'s get you set up for success!',
      placeholderText: 'What would you like to learn?',
    },
    icon: 'Sparkles',
  },
  {
    id: 'tpl-custom-001',
    name: 'Blank Canvas',
    description: 'Start from scratch and build a custom bot tailored to your exact needs.',
    category: 'custom',
    default_system_prompt: 'You are a helpful AI assistant.',
    default_model: 'openai',
    default_tools: {
      webSearch: false,
      fileUpload: false,
      codeInterpreter: false,
      apiCalls: false,
    },
    default_ui_config: {
      interface: 'chat',
      position: 'bottom-right',
      primaryColor: '#6b7280',
      greetingMessage: 'Hello! How can I assist you today?',
      placeholderText: 'Type your message...',
    },
    icon: 'Palette',
  },
];

export const getTemplateById = (id: string): BotTemplate | undefined => {
  return botTemplates.find((t) => t.id === id);
};

export const getTemplatesByCategory = (category: BotTemplate['category']): BotTemplate[] => {
  return botTemplates.filter((t) => t.category === category);
};
